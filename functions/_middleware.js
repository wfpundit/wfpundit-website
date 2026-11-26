export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);

  // Send the old production Pages hostname to the official website.
  if (url.hostname === "wfpundit.pages.dev") {
    url.hostname = "www.wfpundit.uk";
    url.protocol = "https:";
    return Response.redirect(url.toString(), 301);
  }

  // Give article pages crawlable, article-specific metadata before the
  // browser or social crawler receives the HTML.
  if (url.pathname === "/article.html" && /^\d+$/.test(url.searchParams.get("id") || "")) {
    const articleId = Number(url.searchParams.get("id"));

    if (Number.isSafeInteger(articleId) && articleId > 0 && env.DB) {
      try {
        const article = await env.DB.prepare(`
          SELECT id, title, summary, image_url, author, created_at, category
          FROM articles
          WHERE id = ? AND status = ?
          LIMIT 1
        `).bind(articleId, "published").first();

        if (article) {
          const response = await next();
          const contentType = response.headers.get("content-type") || "";

          if (contentType.includes("text/html")) {
            let document = await response.text();
            const canonical = `https://www.wfpundit.uk/article.html?id=${article.id}`;
            const title = String(article.title || "Women's Football News").trim();
            const description = String(article.summary || article.title || "Read the latest women's football news, reports and analysis from WF Pundit.").trim().slice(0, 300);
            const image = /^https:\/\//i.test(String(article.image_url || "")) ? String(article.image_url).trim() : "";
            const rawPublished = String(article.created_at || "").trim().replace(" ", "T");
            const published = rawPublished
              ? new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(rawPublished) ? rawPublished : rawPublished + "Z")
              : null;
            const datePublished = published && !Number.isNaN(published.getTime()) ? published.toISOString() : undefined;

            const escapeHtml = value => String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const safeTitle = escapeHtml(title + " | WF Pundit");
            const safeDescription = escapeHtml(description);
            const safeImage = escapeHtml(image);
            const safeCanonical = escapeHtml(canonical);

            document = document.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
            document = document.replace(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${safeDescription}">`);
            document = document.replace(/<link\s+rel=["']canonical["'][^>]*>/ig, "");

            const structuredData = {
              "@context": "https://schema.org",
              "@type": "NewsArticle",
              "headline": title,
              "description": description,
              "mainEntityOfPage": canonical,
              "url": canonical,
              ...(image ? { "image": [image] } : {}),
              "publisher": { "@type": "Organization", "name": "WF Pundit", "url": "https://www.wfpundit.uk/" },
              ...(article.author ? { "author": { "@type": "Person", "name": String(article.author) } } : {}),
              ...(datePublished ? { "datePublished": datePublished } : {})
            };
            const jsonLd = JSON.stringify(structuredData).replace(/</g, "\\u003c");

            const seoTags = `
<link rel="canonical" href="${safeCanonical}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:site_name" content="WF Pundit">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDescription}">
<meta property="og:url" content="${safeCanonical}">
${image ? `<meta property="og:image" content="${safeImage}">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:image" content="${safeImage}">` : `<meta name="twitter:card" content="summary">`}
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDescription}">
<script type="application/ld+json">${jsonLd}</script>`;

            document = document.replace(/<\/head>/i, seoTags + "\n</head>");
            const headers = new Headers(response.headers);
            headers.set("content-type", "text/html; charset=utf-8");
            headers.set("cache-control", "public, max-age=0, s-maxage=300");
            return new Response(document, {
              status: response.status,
              statusText: response.statusText,
              headers
            });
          }

          return response;
        }
      } catch (error) {
        console.error("WF Pundit article SEO middleware:", error);
      }
    }
  }

  return next();
}
