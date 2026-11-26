const SITE = "https://www.wfpundit.uk";

function xmlEscape(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export async function onRequestGet({ env }) {
  try {
    const { results = [] } = await env.DB.prepare(
      "SELECT id, created_at FROM articles WHERE status = ? ORDER BY created_at DESC"
    ).bind("published").all();

    const urls = [
      `<url><loc>${SITE}/</loc></url>`,
      ...results.map(article => {
        const loc = `${SITE}/article.html?id=${encodeURIComponent(article.id)}`;
        const rawDate = String(article.created_at || "").trim();
        const date = rawDate ? new Date(rawDate.replace(" ", "T") + (rawDate.endsWith("Z") ? "" : "Z")) : null;
        const lastmod = date && !Number.isNaN(date.getTime())
          ? `<lastmod>${date.toISOString().slice(0, 10)}</lastmod>`
          : "";
        return `<url><loc>${xmlEscape(loc)}</loc>${lastmod}</url>`;
      })
    ];

    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
    return new Response(body, {
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "public, max-age=0, s-maxage=900"
      }
    });
  } catch (error) {
    console.error("WF Pundit sitemap error:", error);
    return new Response("Sitemap temporarily unavailable", { status: 500 });
  }
}
