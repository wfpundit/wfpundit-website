
import {
  json,
  readJson,
  validOrigin,
  currentUser
} from "./_auth.js";

// GET: Display approved comments for a published article.
export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const articleId = Number(url.searchParams.get("articleId"));

    if (!Number.isSafeInteger(articleId) || articleId < 1) {
      return json({
        success: false,
        error: "A valid article ID is required."
      }, 400);
    }

    const article = await env.DB.prepare(`
      SELECT id
      FROM articles
      WHERE id = ? AND status = ?
      LIMIT 1
    `).bind(articleId, "published").first();

    if (!article) {
      return json({
        success: false,
        error: "Article not found."
      }, 404);
    }

    const result = await env.DB.prepare(`
      SELECT
        c.id,
        c.comment,
        c.created_at,
        u.display_name
      FROM article_comments c
      JOIN reader_accounts u ON u.id = c.user_id
      WHERE c.article_id = ?
        AND c.status = 'approved'
      ORDER BY c.created_at ASC
      LIMIT 100
    `).bind(articleId).all();

    return json({
      success: true,
      comments: result.results || []
    });

  } catch (error) {
    console.error("Comments GET error:", error);

    return json({
      success: false,
      error: "Unable to load comments."
    }, 500);
  }
}

// POST: Publish a comment immediately after basic checks.
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
        error: "Please log in before commenting."
      }, 401);
    }

    const body = await readJson(request);
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

    if (!comment) {
      return json({
        success: false,
        error: "Please write a comment."
      }, 400);
    }

    if (comment.length > 2000) {
      return json({
        success: false,
        error: "Your comment must be 2,000 characters or fewer."
      }, 400);
    }

    const article = await env.DB.prepare(`
      SELECT id
      FROM articles
      WHERE id = ? AND status = ?
      LIMIT 1
    `).bind(articleId, "published").first();

    if (!article) {
      return json({
        success: false,
        error: "Article not found."
      }, 404);
    }

    // Basic rate limit: maximum 3 comments per user per minute.
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

    // Comments are approved immediately.
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
      error: "Unable to submit your comment."
    }, 500);
  }
}
