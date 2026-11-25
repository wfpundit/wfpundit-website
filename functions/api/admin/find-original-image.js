import { adminAuthorised } from "../_auth.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

const BBC_HOSTS = ["bbc.com", "bbc.co.uk", "bbci.co.uk", "bbc.net.uk", "bbcmedia.co.uk"];

function isBbcHost(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
  return BBC_HOSTS.some(domain => host === domain || host.endsWith("." + domain));
}

function isPublicWebUrl(value) {
  let url;
  try { url = new URL(value); } catch { return null; }
  const host = url.hostname.toLowerCase();
  if (isBbcHost(host)) return null;
  if (url.protocol !== "https:" || url.username || url.password ||
      (url.port && url.port !== "443") || !host || host === "localhost" ||
      host.endsWith(".localhost") || host.endsWith(".local") ||
      /^\d+(?:\.\d+){3}$/.test(host) || host.includes(":") || !host.includes(".")) {
    return null;
  }
  return url;
}

function readAttributes(tag) {
  const result = {};
  const pattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;
  while ((match = pattern.exec(tag))) {
    result[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return result;
}

function findImage(html, pageUrl) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const key of ["og:image", "og:image:url", "twitter:image", "twitter:image:src"]) {
    for (const tag of tags) {
      const attrs = readAttributes(tag);
      if ((attrs.property || attrs.name || "").toLowerCase() !== key) continue;
      try {
        const image = new URL(attrs.content || attrs.value || "", pageUrl);
        if ((image.protocol === "https:" || image.protocol === "http:") &&
            !image.username && !image.password && !isBbcHost(image.hostname)) return image.href;
      } catch { /* Ignore malformed metadata. */ }
    }
  }
  return null;
}

export async function onRequestPost({ request, env }) {
  if (!(await adminAuthorised(request, env))) {
    return json({ success: false, error: "Unauthorised" }, 401);
  }

  let data;
  try { data = await request.json(); } catch {
    return json({ success: false, error: "A valid article URL is required." }, 400);
  }

  const pageUrl = isPublicWebUrl(String(data.url || ""));
  if (!pageUrl) {
    let submittedUrl;
    try { submittedUrl = new URL(String(data.url || "")); } catch { submittedUrl = null; }
    if (submittedUrl && isBbcHost(submittedUrl.hostname)) {
      return json({ success: false, error: "BBC photographs are excluded from WF Pundit photo lookup. Please use a different source and confirm its reuse permission." }, 403);
    }
    return json({ success: false, error: "Only valid public HTTPS article URLs from non-BBC sources can be checked." }, 400);
  }

  try {
    const response = await fetch(pageUrl.href, {
      method: "GET",
      redirect: "manual",
      headers: {
        "Accept": "text/html,application/xhtml+xml",
        "User-Agent": "WFPunditEditorialBot/1.0 (+https://wfpundit.pages.dev)"
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return json({
        success: false,
        error: response.status >= 300 && response.status < 400
          ? "The source redirects. Open the original story and review its image manually."
          : "The original article could not be read. Open it and select an authorised image manually."
      }, 502);
    }

    if (!(response.headers.get("content-type") || "").toLowerCase().includes("text/html")) {
      return json({ success: false, error: "The source did not return an HTML article page." }, 415);
    }

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > 1500000) {
      return json({ success: false, error: "The article page is too large to inspect automatically." }, 413);
    }

    const html = (await response.text()).slice(0, 1500000);
    const imageUrl = findImage(html, pageUrl);
    if (!imageUrl) {
      return json({
        success: false,
        error: "No featured image metadata was found. Open the original story and upload a photo you are authorised to use."
      }, 404);
    }

    return json({ success: true, image_url: imageUrl, source_page: pageUrl.href });
  } catch (error) {
    console.error("Original article image lookup failed:", error);
    return json({
      success: false,
      error: "Could not inspect the original article. Please try again or choose an authorised photo manually."
    }, 502);
  }
}
