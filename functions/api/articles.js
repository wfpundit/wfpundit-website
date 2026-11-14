
export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      "SELECT * FROM articles WHERE status = ? ORDER BY created_at DESC"
    ).bind("published").all();

    return Response.json({
      success: true,
      articles: results
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: "Unable to fetch articles"
    }, { status: 500 });
  }
}
