
import { json, currentUser } from "./_auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const user = await currentUser(request, env);

    if (!user) {
      return json({
        success: false,
        error: "Please log in to view your comments."
      }, 401);
    }

    const result = await env.DB.prepare(`
      SELECT
        c.id,
        c.comment,
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

    return json({
      success: true,
      comments: result.results || []
    });

  } catch (error) {
    console.error("My comments error:", error);

    return json({
      success: false,
      error: "Unable to load your comments right now."
    }, 500);
  }
}
