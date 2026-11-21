
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));

    if (!Number.isSafeInteger(id) || id < 1) {
      return json({
        success: false,
        error: "A valid article ID is required."
      }, 400);
    }

    const article = await env.DB.prepare(`
      SELECT
        id,
        title,
        slug,
        summary,
        content,
        source,
        source_url,
        image_url,
        category,
        author,
        created_at
      FROM articles
      WHERE id = ? AND status = ?
      LIMIT 1
    `).bind(id, "published").first();

    if (!article) {
      return json({
        success: false,
        error: "Article not found."
      }, 404);
    }

    return json({
      success: true,
      article
    });

  } catch (error) {
    console.error("Article API error:", error);

    return json({
      success: false,
      error: "Unable to load this article."
    }, 500);
  }
}
