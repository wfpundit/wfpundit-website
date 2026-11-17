
import { currentUser, json, readJson, validOrigin } from "./_auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const user = await currentUser(request, env);

    if (!user) {
      return json({ success: false, error: "Please log in first." }, 401);
    }

    const { results } = await env.DB.prepare(`
      SELECT
        a.id,
        a.title,
        a.slug,
        a.summary,
        a.image_url,
        a.category,
        s.created_at AS saved_at
      FROM saved_articles s
      JOIN articles a ON a.id = s.article_id
      WHERE s.user_id = ? AND a.status = ?
      ORDER BY s.created_at DESC
    `).bind(user.id, "published").all();

    return json({ success: true, articles: results || [] });
  } catch (error) {
    console.error("Saved articles error:", error);
    return json({
      success: false,
      error: "Unable to load saved articles."
    }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) {
    return json({ success: false, error: "Request could not be verified." }, 403);
  }

  try {
    const user = await currentUser(request, env);

    if (!user) {
      return json({ success: false, error: "Please log in first." }, 401);
    }

    const data = await readJson(request);
    const articleId = Number(data.articleId);

    if (!Number.isSafeInteger(articleId) || articleId < 1) {
      return json({ success: false, error: "Invalid article." }, 400);
    }

    const article = await env.DB.prepare(`
      SELECT id FROM articles
      WHERE id = ? AND status = ?
      LIMIT 1
    `).bind(articleId, "published").first();

    if (!article) {
      return json({ success: false, error: "Article not found." }, 404);
    }

    await env.DB.prepare(`
      INSERT OR IGNORE INTO saved_articles (user_id, article_id)
      VALUES (?, ?)
    `).bind(user.id, articleId).run();

    return json({
      success: true,
      message: "Article saved."
    });
  } catch (error) {
    console.error("Save article error:", error);
    return json({
      success: false,
      error: "Unable to save this article."
    }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  if (!validOrigin(request)) {
    return json({ success: false, error: "Request could not be verified." }, 403);
  }

  try {
    const user = await currentUser(request, env);

    if (!user) {
      return json({ success: false, error: "Please log in first." }, 401);
    }

    const data = await readJson(request);
    const articleId = Number(data.articleId);

    if (!Number.isSafeInteger(articleId) || articleId < 1) {
      return json({ success: false, error: "Invalid article." }, 400);
    }

    await env.DB.prepare(`
      DELETE FROM saved_articles
      WHERE user_id = ? AND article_id = ?
    `).bind(user.id, articleId).run();

    return json({
      success: true,
      message: "Article removed from saved articles."
    });
  } catch (error) {
    console.error("Remove saved article error:", error);
    return json({
      success: false,
      error: "Unable to remove this article."
    }, 500);
  }
}
