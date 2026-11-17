
import {
  json,
  readJson,
  validOrigin,
  currentUser
} from "./_auth.js";

// GET: Load approved comments, their edit times and ownership.
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const articleId = Number(url.searchParams.get("articleId"));

    if (!Number.isSafeInteger(articleId) || articleId < 1) {
      return json({ success: false, error: "A valid article ID is required." }, 400);
    }

    const article = await env.DB.prepare(`
      SELECT id FROM articles
      WHERE id = ? AND status = ?
      LIMIT 1
    `).bind(articleId, "published").first();

    if (!article) {
      return json({ success: false, error: "Article not found." }, 404);
    }

    const user = await currentUser(request, env);

    const result = await env.DB.prepare(`
      SELECT
        c.id,
        c.comment,
        strftime('%Y-%m-%dT%H:%M:%SZ', c.created_at) AS created_at,
        c.user_id,
        u.display_name,
        e.edited_at
      FROM article_comments c
      JOIN reader_accounts u ON u.id = c.user_id
      LEFT JOIN article_comment_edits e ON e.comment_id = c.id
      WHERE c.article_id = ?
        AND c.status = 'approved'
      ORDER BY c.created_at ASC
      LIMIT 100
    `).bind(articleId).all();

    const comments = (result.results || []).map(item => ({
      id: item.id,
      comment: item.comment,
      created_at: item.created_at,
      display_name: item.display_name,
      edited_at: item.edited_at || null,
      is_own: Boolean(user && Number(item.user_id) === Number(user.id))
    }));

    return json({ success: true, comments });

  } catch (error) {
    console.error("Comments GET error:", error);
    return json({ success: false, error: "Unable to load comments." }, 500);
  }
}

// POST: Create a comment or edit the signed-in user's own comment.
export async function onRequestPost({ request, env }) {
  try {
    if (!validOrigin(request)) {
      return json({ success: false, error: "Invalid request origin." }, 403);
    }

    const user = await currentUser(request, env);

    if (!user) {
      return json({ success: false, error: "Please log in before commenting." }, 401);
    }

    const body = await readJson(request);

    // EDIT AN EXISTING COMMENT
    if (body.action === "edit") {
      const commentId = Number(body.commentId);
      const editedComment = typeof body.comment === "string"
        ? body.comment.trim()
        : "";

      if (!Number.isSafeInteger(commentId) || commentId < 1) {
        return json({ success: false, error: "A valid comment ID is required." }, 400);
      }

      if (!editedComment) {
        return json({ success: false, error: "A comment cannot be empty." }, 400);
      }

      if (editedComment.length > 2000) {
        return json({ success: false, error: "Your comment must be 2,000 characters or fewer." }, 400);
      }

      const existing = await env.DB.prepare(`
        SELECT c.id
        FROM article_comments c
        JOIN articles a ON a.id = c.article_id
        WHERE c.id = ?
          AND c.user_id = ?
          AND c.status = 'approved'
          AND a.status = 'published'
        LIMIT 1
      `).bind(commentId, user.id).first();

      if (!existing) {
        return json({
          success: false,
          error: "Comment not found or you do not have permission to edit it."
        }, 404);
      }

      await env.DB.prepare(`
        UPDATE article_comments
        SET comment = ?
        WHERE id = ? AND user_id = ?
      `).bind(editedComment, commentId, user.id).run();

      const editedAt = new Date().toISOString();

      await env.DB.prepare(`
        INSERT INTO article_comment_edits (comment_id, edited_at)
        VALUES (?, ?)
        ON CONFLICT(comment_id)
        DO UPDATE SET edited_at = excluded.edited_at
      `).bind(commentId, editedAt).run();

      return json({
        success: true,
        message: "Your comment has been updated.",
        edited_at: editedAt
      });
    }

    // CREATE A NEW COMMENT
    const articleId = Number(body.articleId);
    const comment = typeof body.comment === "string"
      ? body.comment.trim()
      : "";

    if (!Number.isSafeInteger(articleId) || articleId < 1) {
      return json({ success: false, error: "A valid article ID is required." }, 400);
    }

    if (!comment) {
      return json({ success: false, error: "Please write a comment." }, 400);
    }

    if (comment.length > 2000) {
      return json({ success: false, error: "Your comment must be 2,000 characters or fewer." }, 400);
    }

    const article = await env.DB.prepare(`
      SELECT id FROM articles
      WHERE id = ? AND status = ?
      LIMIT 1
    `).bind(articleId, "published").first();

    if (!article) {
      return json({ success: false, error: "Article not found." }, 404);
    }

    // Limit new comments to 3 per user per minute.
    const recentComments = await env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM article_comments
      WHERE user_id = ?
        AND created_at >= datetime('now', '-1 minute')
    `).bind(user.id).first();

    if (Number(recentComments?.total || 0) >= 3) {
      return json({
        success: false,
        error: "You've submitted several comments recently. Please wait a minute before commenting again."
      }, 429);
    }

    await env.DB.prepare(`
      INSERT INTO article_comments (
        user_id,
        article_id,
        comment,
        status
      )
      VALUES (?, ?, ?, 'approved')
    `).bind(user.id, articleId, comment).run();

    return json({
      success: true,
      message: "Your comment has been published."
    }, 201);

  } catch (error) {
    console.error("Comments POST error:", error);

    if (error instanceof SyntaxError) {
      return json({ success: false, error: "Invalid request data." }, 400);
    }

    return json({
      success: false,
      error: "Unable to submit or update your comment."
    }, 500);
  }
}
