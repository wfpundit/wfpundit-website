
import {
  json,
  readJson,
  validOrigin,
  currentUser
} from "./_auth.js";

import {
  ensureCommentInteractionTables
} from "./_comment-interactions.js";

const MAX_COMMENT_LENGTH = 2000;
const ALLOWED_REACTIONS = ["like", "love", "laugh", "support"];

async function getPublishedArticle(env, articleId) {
  return env.DB.prepare(`
    SELECT id
    FROM articles
    WHERE id = ? AND status = 'published'
    LIMIT 1
  `).bind(articleId).first();
}

async function getApprovedComment(env, commentId, articleId) {
  return env.DB.prepare(`
    SELECT id, article_id, parent_comment_id
    FROM article_comments
    WHERE id = ?
      AND article_id = ?
      AND status = 'approved'
    LIMIT 1
  `).bind(commentId, articleId).first();
}

// GET: Load approved comments, replies and reaction totals.
export async function onRequestGet({ request, env }) {
  try {
    await ensureCommentInteractionTables(env);

    const url = new URL(request.url);
    const articleId = Number(url.searchParams.get("articleId"));

    if (!Number.isSafeInteger(articleId) || articleId < 1) {
      return json({
        success: false,
        error: "A valid article ID is required."
      }, 400);
    }

    const article = await getPublishedArticle(env, articleId);

    if (!article) {
      return json({
        success: false,
        error: "Article not found."
      }, 404);
    }

    const user = await currentUser(request, env);

    const result = await env.DB.prepare(`
      SELECT
        c.id,
        c.parent_comment_id,
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
      ORDER BY c.created_at ASC, c.id ASC
      LIMIT 200
    `).bind(articleId).all();

    const rows = result.results || [];

    const reactionResult = await env.DB.prepare(`
      SELECT
        r.comment_id,
        r.reaction,
        COUNT(*) AS total
      FROM article_comment_reactions r
      JOIN article_comments c ON c.id = r.comment_id
      WHERE c.article_id = ?
        AND c.status = 'approved'
      GROUP BY r.comment_id, r.reaction
    `).bind(articleId).all();

    const myReactionResult = user
      ? await env.DB.prepare(`
          SELECT r.comment_id, r.reaction
          FROM article_comment_reactions r
          JOIN article_comments c ON c.id = r.comment_id
          WHERE c.article_id = ?
            AND c.status = 'approved'
            AND r.user_id = ?
        `).bind(articleId, user.id).all()
      : { results: [] };

    const reactionCounts = new Map();

    for (const item of reactionResult.results || []) {
      if (!reactionCounts.has(Number(item.comment_id))) {
        reactionCounts.set(Number(item.comment_id), {});
      }

      reactionCounts.get(Number(item.comment_id))[item.reaction] =
        Number(item.total);
    }

    const myReactions = new Map();

    for (const item of myReactionResult.results || []) {
      myReactions.set(Number(item.comment_id), item.reaction);
    }

    const comments = rows.map(item => ({
      id: Number(item.id),
      parent_comment_id: item.parent_comment_id
        ? Number(item.parent_comment_id)
        : null,
      comment: item.comment,
      created_at: item.created_at,
      display_name: item.display_name || "Reader",
      edited_at: item.edited_at || null,
      is_own: Boolean(
        user && Number(item.user_id) === Number(user.id)
      ),
      reaction_counts: reactionCounts.get(Number(item.id)) || {},
      my_reaction: myReactions.get(Number(item.id)) || null
    }));

    return json({
      success: true,
      comments
    });

  } catch (error) {
    console.error("Comments GET error:", error);

    return json({
      success: false,
      error: "Unable to load comments."
    }, 500);
  }
}

// POST: Create, edit, delete, reply or react.
export async function onRequestPost({ request, env }) {
  try {
    if (!validOrigin(request)) {
      return json({
        success: false,
        error: "Invalid request origin."
      }, 403);
    }

    const user = await currentUser(request, env);

    if (!user) {
      return json({
        success: false,
        error: "Please log in before commenting or reacting."
      }, 401);
    }

    await ensureCommentInteractionTables(env);

    const body = await readJson(request);
    const action = body.action || "create";

    // EDIT AN EXISTING COMMENT
    if (action === "edit") {
      const commentId = Number(body.commentId);
      const editedComment = typeof body.comment === "string"
        ? body.comment.trim()
        : "";

      if (!Number.isSafeInteger(commentId) || commentId < 1) {
        return json({
          success: false,
          error: "A valid comment ID is required."
        }, 400);
      }

      if (!editedComment || editedComment.length > MAX_COMMENT_LENGTH) {
        return json({
          success: false,
          error: "Your comment must contain between 1 and 2,000 characters."
        }, 400);
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

    // DELETE THE SIGNED-IN USER'S OWN COMMENT
    if (action === "delete") {
      const commentId = Number(body.commentId);

      if (!Number.isSafeInteger(commentId) || commentId < 1) {
        return json({
          success: false,
          error: "A valid comment ID is required."
        }, 400);
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
          error: "Comment not found or you do not have permission to delete it."
        }, 404);
      }

      await env.DB.prepare(`
        DELETE FROM article_comment_edits
        WHERE comment_id = ?
      `).bind(commentId).run();

      await env.DB.prepare(`
        DELETE FROM article_comment_reactions
        WHERE comment_id = ?
      `).bind(commentId).run();

      await env.DB.prepare(`
        DELETE FROM article_comments
        WHERE id = ? AND user_id = ?
      `).bind(commentId, user.id).run();

      return json({
        success: true,
        message: "Your comment has been deleted."
      });
    }

    // ADD A REPLY TO AN APPROVED TOP-LEVEL COMMENT
    if (action === "reply") {
      const articleId = Number(body.articleId);
      const parentCommentId = Number(body.parentCommentId);
      const reply = typeof body.comment === "string"
        ? body.comment.trim()
        : "";

      if (!Number.isSafeInteger(articleId) || articleId < 1 ||
          !Number.isSafeInteger(parentCommentId) || parentCommentId < 1) {
        return json({
          success: false,
          error: "A valid article and parent comment are required."
        }, 400);
      }

      if (!reply || reply.length > MAX_COMMENT_LENGTH) {
        return json({
          success: false,
          error: "Your reply must contain between 1 and 2,000 characters."
        }, 400);
      }

      const article = await getPublishedArticle(env, articleId);

      if (!article) {
        return json({
          success: false,
          error: "Article not found."
        }, 404);
      }

      const parent = await getApprovedComment(
        env,
        parentCommentId,
        articleId
      );

      if (!parent || parent.parent_comment_id !== null) {
        return json({
          success: false,
          error: "This comment cannot be replied to."
        }, 404);
      }

      const recent = await env.DB.prepare(`
        SELECT COUNT(*) AS total
        FROM article_comments
        WHERE user_id = ?
          AND created_at >= datetime('now', '-1 minute')
      `).bind(user.id).first();

      if (Number(recent?.total || 0) >= 5) {
        return json({
          success: false,
          error: "You've submitted several comments recently. Please wait a minute."
        }, 429);
      }

      await env.DB.prepare(`
        INSERT INTO article_comments (
          user_id,
          article_id,
          parent_comment_id,
          comment,
          status
        )
        VALUES (?, ?, ?, ?, 'approved')
      `).bind(
        user.id,
        articleId,
        parentCommentId,
        reply
      ).run();

      return json({
        success: true,
        message: "Your reply has been posted."
      }, 201);
    }

    // ADD, CHANGE OR REMOVE A REACTION
    if (action === "react") {
      const commentId = Number(body.commentId);
      const reaction = typeof body.reaction === "string"
        ? body.reaction.toLowerCase()
        : "";

      if (!Number.isSafeInteger(commentId) || commentId < 1) {
        return json({
          success: false,
          error: "A valid comment ID is required."
        }, 400);
      }

      if (reaction !== "remove" &&
          !ALLOWED_REACTIONS.includes(reaction)) {
        return json({
          success: false,
          error: "Choose a valid reaction."
        }, 400);
      }

      const existing = await env.DB.prepare(`
        SELECT c.id
        FROM article_comments c
        JOIN articles a ON a.id = c.article_id
        WHERE c.id = ?
          AND c.status = 'approved'
          AND a.status = 'published'
        LIMIT 1
      `).bind(commentId).first();

      if (!existing) {
        return json({
          success: false,
          error: "Comment not found."
        }, 404);
      }

      if (reaction === "remove") {
        await env.DB.prepare(`
          DELETE FROM article_comment_reactions
          WHERE comment_id = ? AND user_id = ?
        `).bind(commentId, user.id).run();

      } else {
        await env.DB.prepare(`
          INSERT INTO article_comment_reactions (
            comment_id,
            user_id,
            reaction
          )
          VALUES (?, ?, ?)
          ON CONFLICT(comment_id, user_id)
          DO UPDATE SET
            reaction = excluded.reaction,
            created_at = CURRENT_TIMESTAMP
        `).bind(commentId, user.id, reaction).run();
      }

      return json({
        success: true,
        message: reaction === "remove"
          ? "Reaction removed."
          : "Reaction saved."
      });
    }

    // CREATE A NEW TOP-LEVEL COMMENT
    if (action !== "create") {
      return json({
        success: false,
        error: "Unknown comment action."
      }, 400);
    }

    const articleId = Number(body.articleId);
    const comment = typeof body.comment === "string"
      ? body.comment.trim()
      : "";

    if (!Number.isSafeInteger(articleId) || articleId < 1) {
      return json({
        success: false,
        error: "A valid article ID is required."
      }, 400);
    }

    if (!comment || comment.length > MAX_COMMENT_LENGTH) {
      return json({
        success: false,
        error: "Your comment must contain between 1 and 2,000 characters."
      }, 400);
    }

    const article = await getPublishedArticle(env, articleId);

    if (!article) {
      return json({
        success: false,
        error: "Article not found."
      }, 404);
    }

    const recentComments = await env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM article_comments
      WHERE user_id = ?
        AND created_at >= datetime('now', '-1 minute')
    `).bind(user.id).first();

    if (Number(recentComments?.total || 0) >= 5) {
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
      return json({
        success: false,
        error: "Invalid request data."
      }, 400);
    }

    return json({
      success: false,
      error: "Unable to submit or update your comment."
    }, 500);
  }
}
