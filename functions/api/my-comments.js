
import { json, currentUser } from "./_auth.js";
import { ensureCommentInteractionTables } from "./_comment-interactions.js";

export async function onRequestGet({ request, env }) {
  try {
    const user = await currentUser(request, env);

    if (!user) {
      return json({
        success: false,
        error: "Please log in to view your comments."
      }, 401);
    }

    await ensureCommentInteractionTables(env);

    const ownResult = await env.DB.prepare(`
      SELECT
        c.id,
        c.comment,
        c.parent_comment_id,
        strftime('%Y-%m-%dT%H:%M:%SZ', c.created_at) AS created_at,
        a.id AS article_id,
        a.title AS article_title,
        a.slug AS article_slug
      FROM article_comments c
      JOIN articles a ON a.id = c.article_id
      WHERE c.user_id = ?
        AND c.status = 'approved'
        AND a.status = 'published'
      ORDER BY c.created_at DESC
      LIMIT 50
    `).bind(user.id).all();

    const comments = ownResult.results || [];

    if (!comments.length) {
      return json({ success: true, comments: [] });
    }

    const ids = comments.map(comment => comment.id);
    const placeholders = ids.map(() => "?").join(",");

    const repliesResult = await env.DB.prepare(`
      SELECT
        r.id,
        r.parent_comment_id,
        r.comment,
        r.user_id,
        u.display_name,
        strftime('%Y-%m-%dT%H:%M:%SZ', r.created_at) AS created_at,
        r.article_id
      FROM article_comments r
      JOIN reader_accounts u ON u.id = r.user_id
      JOIN articles a ON a.id = r.article_id
      WHERE r.parent_comment_id IN (${placeholders})
        AND r.status = 'approved'
        AND a.status = 'published'
      ORDER BY r.created_at ASC
    `).bind(...ids).all();

    const replyRows = repliesResult.results || [];
    const allIds = ids.concat(replyRows.map(reply => reply.id));
    const allPlaceholders = allIds.map(() => "?").join(",");

    const reactionsResult = await env.DB.prepare(`
      SELECT
        comment_id,
        reaction,
        COUNT(*) AS total
      FROM article_comment_reactions
      WHERE comment_id IN (${allPlaceholders})
      GROUP BY comment_id, reaction
    `).bind(...allIds).all();

    const reactionMap = new Map();

    for (const row of reactionsResult.results || []) {
      const key = String(row.comment_id);

      if (!reactionMap.has(key)) {
        reactionMap.set(key, {
          like: 0,
          love: 0,
          laugh: 0,
          support: 0
        });
      }

      reactionMap.get(key)[row.reaction] = Number(row.total || 0);
    }

    const emptyCounts = () => ({
      like: 0,
      love: 0,
      laugh: 0,
      support: 0
    });

    const repliesByParent = new Map();

    for (const reply of replyRows) {
      reply.reaction_counts =
        reactionMap.get(String(reply.id)) || emptyCounts();

      const key = String(reply.parent_comment_id);

      if (!repliesByParent.has(key)) {
        repliesByParent.set(key, []);
      }

      repliesByParent.get(key).push(reply);
    }

    for (const comment of comments) {
      comment.reaction_counts =
        reactionMap.get(String(comment.id)) || emptyCounts();

      comment.replies =
        repliesByParent.get(String(comment.id)) || [];
    }

    return json({
      success: true,
      comments
    });

  } catch (error) {
    console.error("My comments error:", error);

    return json({
      success: false,
      error: "Unable to load your comments right now."
    }, 500);
  }
}
