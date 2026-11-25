import {
  RSS_FEEDS,
  ARTICLE_KEYWORDS,
  SOURCE_REGISTRY_VERSION,
  OFFICIAL_CLUBS,
  OFFICIAL_CLUB_FEEDS
} from "./sources.js";

const WORKER_NAME = "WF Pundit News Automation";
const AUTO_PUBLISH = false;
const MAX_ITEMS_PER_FEED = 40;
const MAX_DUPLICATE_COMPARISON_ROWS = 120;

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

function authorised(request, env) {
  return Boolean(env.ADMIN_TOKEN &&
    request.headers.get("Authorization") === `Bearer ${env.ADMIN_TOKEN}`);
}

function decodeXML(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return code === 160 ? " " : String.fromCodePoint(code);
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function tagValue(xml, tag) {
  const match = xml.match(new RegExp(
    "<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">",
    "i"
  ));
  return match ? decodeXML(match[1].trim()) : "";
}

function attributeValue(xml, attribute) {
  const match = xml.match(new RegExp("\\b" + attribute + "\\s*=\\s*[\"']([^\"']+)[\"']", "i"));
  return match ? decodeXML(match[1].trim()) : "";
}

function cleanText(value = "") {
  return decodeXML(value).replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000);
}


function safePublicArticleUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (!host || host === "localhost" || host.endsWith(".localhost") ||
        host.endsWith(".local") || host.endsWith(".internal") ||
        host.includes(":") || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return null;
    return url;
  } catch {
    return null;
  }
}

async function readLimitedText(response, maxBytes = 1200000) {
  if (!response.body) return (await response.text()).slice(0, maxBytes);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "", bytes = 0;
  while (bytes < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    const remaining = maxBytes - bytes;
    const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
    bytes += chunk.byteLength;
    text += decoder.decode(chunk, { stream: true });
    if (chunk.byteLength < value.byteLength) break;
  }
  text += decoder.decode();
  try { await reader.cancel(); } catch {}
  return text;
}

function metaContent(html, names) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const name = (attributeValue(tag, "property") || attributeValue(tag, "name") || "").toLowerCase();
    if (!names.includes(name)) continue;
    const content = attributeValue(tag, "content");
    if (content) return content;
  }
  return "";
}

function extractArticleImage(html, baseUrl) {
  const candidates = [];
  const metaImage = metaContent(html, ["og:image", "og:image:url", "twitter:image", "twitter:image:src"]);
  if (metaImage) candidates.push(metaImage);

  const linkTags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of linkTags) {
    const rel = attributeValue(tag, "rel").toLowerCase();
    if (rel.split(/\s+/).includes("image_src")) {
      const href = attributeValue(tag, "href");
      if (href) candidates.push(href);
    }
  }

  // Publishers often lazy-load lead images instead of placing them in src.
  const imageTags = html.match(/<img\b[^>]*>/gi) || [];
  for (const tag of imageTags.slice(0, 20)) {
    for (const attr of ["src", "data-src", "data-lazy-src", "data-original", "data-image"]) {
      const value = attributeValue(tag, attr);
      if (value) candidates.push(value);
    }
    for (const attr of ["srcset", "data-srcset"]) {
      const value = attributeValue(tag, attr);
      if (value) {
        const first = value.split(",")[0].trim().split(/\s+/)[0];
        if (first) candidates.push(first);
      }
    }
  }

  // Some publishers expose the article's lead image only in JSON-LD.
  const jsonImage = html.match(/["']image["']\s*:\s*(?:["']([^"']+)["']|\[\s*["']([^"']+)["'])/i);
  if (jsonImage) candidates.push(jsonImage[1] || jsonImage[2]);

  for (const raw of candidates) {
    try {
      const safe = safePublicArticleUrl(new URL(raw, baseUrl).toString());
      if (!safe || /\.(?:svg|ico)$/i.test(safe.pathname)) continue;
      return safe.toString();
    } catch {}
  }
  return "";
}

async function fetchArticleDetails(articleUrl) {
  let current = safePublicArticleUrl(articleUrl);
  if (!current) return { excerpt: "", imageUrl: "", articleText: "" };
  for (let redirects = 0; redirects <= 3; redirects++) {
    let response;
    try {
      response = await fetch(current.toString(), {
        redirect: "manual",
        headers: {
          "Accept": "text/html,application/xhtml+xml",
          "User-Agent": "WF-Pundit-NewsMonitor/2.3"
        },
        signal: AbortSignal.timeout(6000)
      });
    } catch {
      return { excerpt: "", imageUrl: "", articleText: "" };
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("Location");
      if (!location || redirects === 3) return { excerpt: "", imageUrl: "", articleText: "" };
      try { current = safePublicArticleUrl(new URL(location, current).toString()); }
      catch { return { excerpt: "", imageUrl: "", articleText: "" }; }
      if (!current) return { excerpt: "", imageUrl: "", articleText: "" };
      continue;
    }
    if (!response.ok || !(response.headers.get("content-type") || "").toLowerCase().includes("html")) {
      return { excerpt: "", imageUrl: "", articleText: "" };
    }
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > 1200000) return { excerpt: "", imageUrl: "", articleText: "" };
    const finalUrl = safePublicArticleUrl(response.url || current.toString());
    if (!finalUrl) return { excerpt: "", imageUrl: "", articleText: "" };
    const html = await readLimitedText(response);
    const imageUrl = extractArticleImage(html, finalUrl);
    const articleMatch = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
    const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
    let body = articleMatch?.[1] || mainMatch?.[1] || html;
    body = body.replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|svg|nav|footer|header|aside|form|noscript)\b[\s\S]*?<\/\1>/gi, " ");
    const paragraphs = [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map(match => cleanText(match[1]))
      .filter(paragraph => paragraph.length > 45);
    // Keep extracted publisher text in a separate reference-only field.
    // It is never copied into the publishable article body.
    const articleText = paragraphs.join("\n\n").slice(0, 12000);
    let excerpt = paragraphs.join(" ").slice(0, 1800);
    if (!excerpt) {
      const description = metaContent(html, ["description", "og:description", "twitter:description"]);
      excerpt = cleanText(description).slice(0, 700);
    }
    return { excerpt, imageUrl, articleText };
  }
  return { excerpt: "", imageUrl: "", articleText: "" };
}

function normaliseUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || ["fbclid", "gclid", "mc_cid", "mc_eid"].includes(key)) {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  } catch { return null; }
}

function matchesTopic(title, description, feed = {}) {
  // Dedicated women's-football RSS feeds are trusted as section-filtered.
  // Mixed football feeds (such as Sky Sports Football) must carry an explicit
  // women's-football, women's competition, or women's national-team signal.
  if (feed.womenOnly === true) return true;

  const text = (title + " " + description).toLowerCase();
  const explicitWomensFootballSignal =
    /\b(women|women'?s?\s+(football|soccer|team|teams|league|super league|champions league|world cup|euros|national team)|female football|female soccer|wsl|nwsl|uwcl|wafcon|liga f|liga mx femenil|serie a femminile|serie a women|frauen[- ]bundesliga|bundesliga women|a[- ]league women|we league|damallsvenskan|toppserien|uswnt|matildas|lionesses|copa libertadores femenina|afc women's champions league)\b/i.test(text);

  if (!explicitWomensFootballSignal) return false;
  return ARTICLE_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
}

const LEAGUE_SUBCATEGORIES = [
  ["Women's Super League (WSL)", /\b(wsl|women's super league|barclays women's super league)\b/i],
  ["Women's Championship", /\b(women's championship|wsl 2)\b/i],
  ["NWSL", /\b(nwsl|national women's soccer league)\b/i],
  ["Liga F", /\bliga f\b/i],
  ["Première Ligue", /\b(première ligue|premiere ligue|arkema)\b/i],
  ["Serie A Femminile", /\bserie a femminile|serie a women\b/i],
  ["Bundesliga Women", /\b(frauen[- ]bundesliga|bundesliga women|google pixel frauen)\b/i],
  ["A-League Women", /\ba[- ]league women\b/i],
  ["Liga MX Femenil", /\bliga mx femenil\b/i],
  ["WE League", /\bwe league\b/i],
  ["Damallsvenskan", /\bdamallsvenskan\b/i],
  ["Toppserien", /\btoppserien\b/i]
];
const INTERNATIONAL_SUBCATEGORIES = [
  ["FIFA Women's World Cup", /\b(world cup|fifa women's world cup)\b/i],
  ["UEFA Women's Euros", /\b(women's euros|uefa women's euro|euro 202[0-9])\b/i],
  ["Women's Africa Cup of Nations (WAFCON)", /\b(wafcon|afcon women|women's africa cup of nations)\b/i],
  ["Olympic Women's Football", /\b(olympic women's football|women's olympic)\b/i],
  ["AFC Women's Asian Cup", /\b(afc women's asian cup|women's asian cup)\b/i],
  ["Copa América Femenina", /\b(copa am[eé]rica femenina)\b/i],
  ["UEFA Women's Nations League", /\b(women's nations league|uefa women's nations league)\b/i]
];
function classifyCandidate(title = "", description = "") {
  const text = (title + " " + description).toLowerCase();
  let category = "Latest News";
  let subcategory = "";
  const league = LEAGUE_SUBCATEGORIES.find(([, pattern]) => pattern.test(text));
  const international = INTERNATIONAL_SUBCATEGORIES.find(([, pattern]) => pattern.test(text));
  if (/\b(transfer|signs? for|joins?|loan deal|contract extension|in talks|linked with)\b/i.test(text)) {
    category = "Transfers";
    subcategory = league?.[0] || "Multiple leagues / unspecified";
  } else if (/\b(uefa women's champions league|women's champions league|uwcl)\b/i.test(text)) {
    category = "Women's Champions League (UWCL)";
    subcategory = "UEFA Women's Champions League";
  } else if (international || /\b(national team|international break|qualifier|qualifying)\b/i.test(text)) {
    category = "International Football";
    subcategory = international?.[0] || "";
  } else if (league) {
    category = "Women's Leagues";
    subcategory = league[0];
  } else if (/\b(match report|full[- ]?time|defeats?|beats?|draw|victory|match reaction|post[- ]match analysis|analysis)\b/i.test(text)) {
    category = "Match Reports & Analysis";
    subcategory = league?.[0] || (international?.[0] || "");
  } else if (/\b(interview|exclusive|sits down|speaks to| Q&A|profile|feature)\b/i.test(text)) {
    category = "Interviews & Features";
    subcategory = league?.[0] || (international?.[0] || "");
  }
  return { mainCategory: category, subcategory };
}

function getAtomLink(entry) {
  const links = entry.match(/<link\b[^>]*\/?>/gi) || [];
  const preferred = links.find(link => {
    const rel = attributeValue(link, "rel");
    return !rel || rel === "alternate";
  }) || links[0];
  return preferred ? attributeValue(preferred, "href") : "";
}

function parseFeed(xml, feed) {
  const isAtom = /<feed(?:\s|>)/i.test(xml) && /<entry(?:\s|>)/i.test(xml);
  const blocks = isAtom
    ? (xml.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi) || [])
    : (xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || []);

  return blocks.slice(0, MAX_ITEMS_PER_FEED).map(block => {
    const title = cleanText(tagValue(block, "title"));
    const description = cleanText(tagValue(block, "description") ||
      tagValue(block, "summary") || tagValue(block, "content"));
    const articleFeedContent = tagValue(block, "content:encoded") ||
      (isAtom ? tagValue(block, "content") : "");
    const articleExcerpt = cleanText(articleFeedContent).slice(0, 1800);
    // Google News RSS includes the actual publisher in its <source> element.
    // Preserve that attribution rather than displaying "Google News".
    const publisher = cleanText(tagValue(block, "source"));
    const sourceName = publisher || feed.name;
    const rawLink = isAtom ? getAtomLink(block) : (tagValue(block, "link") || tagValue(block, "guid"));
    const link = normaliseUrl(rawLink);
    const publishedAt = isAtom
      ? (tagValue(block, "published") || tagValue(block, "updated") || null)
      : (tagValue(block, "pubDate") || tagValue(block, "dc:date") || null);

    const mediaContent = (block.match(/<media:content\b[^>]*\/?\s*>/i) || [])[0] || "";
    const mediaThumbnail = (block.match(/<media:thumbnail\b[^>]*\/?\s*>/i) || [])[0] || "";
    const enclosure = (block.match(/<enclosure\b[^>]*\/?\s*>/i) || [])[0] || "";
    const encodedImage = (articleFeedContent.match(/<img\b[^>]*>/i) || [])[0] || "";
    const rawImageUrl =
      attributeValue(mediaContent, "url") ||
      attributeValue(mediaThumbnail, "url") ||
      (/^image\//i.test(attributeValue(enclosure, "type")) ? attributeValue(enclosure, "url") : "") ||
      attributeValue(encodedImage, "src");
    const normalisedImageUrl = rawImageUrl ? normaliseUrl(rawImageUrl) : null;
    const imageUrl = normalisedImageUrl && new URL(normalisedImageUrl).protocol === "https:"
      ? normalisedImageUrl
      : "";

    if (!title || !link || !matchesTopic(title, description, feed)) return null;
    return {
      title, description, articleExcerpt, imageUrl, link, publishedAt,
      sourceName, sourceRegion: feed.region,
      ...classifyCandidate(title, description),
      discoveredAt: new Date().toISOString()
    };
  }).filter(Boolean);
}

function editorialTriage(item) {
  const text = (item.title + " " + item.description).toLowerCase();
  const flags = [];
  const bettingPattern = /\b(betting|betting tips?|odds|wager(?:ing)?|gambling|casino|bookmaker|sportsbook)\b/i;
  const liveBlogPattern = /\b(live blog|live updates|live commentary|minute[- ]by[- ]minute)\b/i;
  const predictionPattern = /\b(prediction|predicted lineup|score prediction|match preview and tips)\b/i;

  if (bettingPattern.test(text)) {
    flags.push("betting_or_gambling");
    return { status: "excluded", flags };
  }
  if (liveBlogPattern.test(text)) flags.push("live_blog");
  if (predictionPattern.test(text)) flags.push("prediction_or_preview");

  if (item.publishedAt) {
    const time = Date.parse(item.publishedAt);
    if (Number.isNaN(time)) {
      flags.push("unparsed_publication_date");
    } else if (time > Date.now() + 5 * 60 * 1000) {
      flags.push("future_publication_date");
    } else if (Date.now() - time > 48 * 60 * 60 * 1000) {
      flags.push("older_than_48_hours");
    }
  }

  // Keep older stories in the database for reference, but remove them
  // from the current editorial-review queue.
  if (flags.includes("older_than_48_hours")) {
    return { status: "excluded", flags };
  }

  return {
    status: flags.length ? "needs_editorial_check" : "ready_for_editorial_review",
    flags
  };
}

function normaliseTitle(title = "") {
  return title.toLowerCase().replace(/&amp;/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(women|womens|fc|afc|the|match|report|highlights|reaction)\b/g, " ")
    .replace(/\s+/g, " ").trim();
}

function titleSimilarity(a, b) {
  // Keep numeric tokens such as "10" and "11": they distinguish matchweeks
  // and episode numbers that would otherwise be discarded as short words.
  const keepToken = word => word.length > 2 || /^\d+$/.test(word);
  const left = new Set(normaliseTitle(a).split(" ").filter(keepToken));
  const right = new Set(normaliseTitle(b).split(" ").filter(keepToken));
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const word of left) if (right.has(word)) overlap++;
  return overlap / (left.size + right.size - overlap);
}

async function markPossibleDuplicates(env, item, editorial) {
  if (editorial.status === "excluded") return editorial;
  const recent = await env.DB.prepare(`
    SELECT id, title, source_name, url FROM wf_news_candidates
    WHERE discovered_at >= datetime('now', '-48 hours')
    ORDER BY discovered_at DESC LIMIT ?
  `).bind(MAX_DUPLICATE_COMPARISON_ROWS).all();
  const currentTitle = normaliseTitle(item.title);
  const matches = (recent.results || [])
    .filter(row => {
      if (row.url === item.link) return false;
      const existingTitle = normaliseTitle(row.title);
      // Same-feed items with an identical recurring programme title are
      // not treated as cross-article duplicates (e.g. weekly podcast feeds).
      if (item.sourceName && row.source_name === item.sourceName) {
        if (existingTitle === currentTitle) return false;

        // Separate numbered editions of the same recurring series (for
        // example, WSL matchweek 10 vs matchweek 11) are not duplicates.
        const editionPattern = /\bmatchweek\s+(\d+)\b/i;
        const currentEdition = item.title.match(editionPattern);
        const existingEdition = row.title.match(editionPattern);
        if (currentEdition && existingEdition &&
            currentEdition[1] !== existingEdition[1]) {
          const withoutEditionNumber = title =>
            normaliseTitle(title.replace(/\bmatchweek\s+\d+\b/ig, " matchweek "));
          if (withoutEditionNumber(row.title) === withoutEditionNumber(item.title)) {
            return false;
          }
        }
      }
      return titleSimilarity(row.title, item.title) >= 0.72;
    })
    .slice(0, 3);
  if (matches.length) {
    editorial.flags.push("possible_related_story");
    editorial.relatedCandidates = matches.map(row => ({
      id: row.id, title: row.title, source: row.source_name
    }));
    if (editorial.status === "ready_for_editorial_review") editorial.status = "needs_editorial_check";
  }
  return editorial;
}

async function backfillPendingEditorial(env) {
  const pending = await env.DB.prepare(`
    SELECT id, title, description, published_at, url
    FROM wf_news_candidates
    WHERE editorial_status = 'pending_triage'
    ORDER BY discovered_at DESC
    LIMIT 1000
  `).all();

  for (const row of pending.results || []) {
    const item = {
      title: row.title || "",
      description: row.description || "",
      publishedAt: row.published_at || null,
      sourceName: row.source_name || "",
      link: row.url
    };
    let editorial = editorialTriage(item);
    editorial = await markPossibleDuplicates(env, item, editorial);
    const flags = JSON.stringify({
      flags: editorial.flags,
      relatedCandidates: editorial.relatedCandidates || []
    });
    await env.DB.prepare(`
      UPDATE wf_news_candidates
      SET editorial_status = ?, editorial_flags = ?
      WHERE id = ?
    `).bind(editorial.status, flags, row.id).run();
  }
}

async function backfillCandidateCategories(env) {
  const pending = await env.DB.prepare("SELECT id, title, description FROM wf_news_candidates WHERE main_category = 'Latest News' AND (subcategory IS NULL OR subcategory = '') LIMIT 1000").all();
  for (const row of pending.results || []) {
    const detected = classifyCandidate(row.title || "", row.description || "");
    if (detected.mainCategory !== "Latest News" || detected.subcategory) {
      await env.DB.prepare("UPDATE wf_news_candidates SET main_category = ?, subcategory = ? WHERE id = ?").bind(detected.mainCategory, detected.subcategory, row.id).run();
    }
  }
}

async function ensureDatabase(env) {
  if (!env.DB) throw new Error("The D1 database binding DB is missing.");
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS wf_news_candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
      description TEXT DEFAULT '', url TEXT NOT NULL UNIQUE,
      source_name TEXT NOT NULL, source_region TEXT DEFAULT '',
      published_at TEXT, discovered_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL,
      article_excerpt TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      main_category TEXT NOT NULL DEFAULT 'Latest News',
      subcategory TEXT NOT NULL DEFAULT ''
    )
  `).run();

  const columns = await env.DB.prepare("PRAGMA table_info(wf_news_candidates)").all();
  const names = new Set((columns.results || []).map(column => column.name));
  if (!names.has("editorial_status")) {
    await env.DB.prepare("ALTER TABLE wf_news_candidates ADD COLUMN editorial_status TEXT NOT NULL DEFAULT 'pending_triage'").run();
  }
  if (!names.has("editorial_flags")) {
    await env.DB.prepare("ALTER TABLE wf_news_candidates ADD COLUMN editorial_flags TEXT NOT NULL DEFAULT '[]'").run();
  }
  if (!names.has("article_excerpt")) {
    await env.DB.prepare("ALTER TABLE wf_news_candidates ADD COLUMN article_excerpt TEXT DEFAULT ''").run();
  }
  if (!names.has("article_source_text")) {
    await env.DB.prepare("ALTER TABLE wf_news_candidates ADD COLUMN article_source_text TEXT DEFAULT ''").run();
  }
  if (!names.has("image_url")) {
    await env.DB.prepare("ALTER TABLE wf_news_candidates ADD COLUMN image_url TEXT DEFAULT ''").run();
  }
  if (!names.has("main_category")) {
    await env.DB.prepare("ALTER TABLE wf_news_candidates ADD COLUMN main_category TEXT NOT NULL DEFAULT 'Latest News'").run();
  }
  if (!names.has("subcategory")) {
    await env.DB.prepare("ALTER TABLE wf_news_candidates ADD COLUMN subcategory TEXT NOT NULL DEFAULT ''").run();
  }
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_wf_news_candidates_status ON wf_news_candidates(status)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_wf_news_candidates_editorial_status ON wf_news_candidates(editorial_status)").run();
  await backfillCandidateCategories(env);
  await backfillPendingEditorial(env);
}

async function saveCandidate(env, item, contentBudget) {
  let editorial = editorialTriage(item);
  editorial = await markPossibleDuplicates(env, item, editorial);
  const flags = JSON.stringify({
    flags: editorial.flags,
    relatedCandidates: editorial.relatedCandidates || []
  });
  const existing = await env.DB.prepare(
    "SELECT id, article_excerpt, article_source_text, image_url FROM wf_news_candidates WHERE url = ?"
  ).bind(item.link).first();
  let articleExcerpt = item.articleExcerpt || existing?.article_excerpt || "";
  let articleSourceText = item.articleText || existing?.article_source_text || "";
  let imageUrl = item.imageUrl || existing?.image_url || "";
  let publisherPageFetchAttempted = false;
  let publisherPageImageFound = false;
  if ((!articleExcerpt || !articleSourceText || !imageUrl) && contentBudget.remaining > 0) {
    contentBudget.remaining--;
    contentBudget.used++;
    publisherPageFetchAttempted = true;
    try {
      const details = await fetchArticleDetails(item.link);
      if (!articleExcerpt) articleExcerpt = details.excerpt || "";
      if (!articleSourceText) articleSourceText = details.articleText || "";
      if (!imageUrl) imageUrl = details.imageUrl || "";
      publisherPageImageFound = Boolean(details.imageUrl);
    } catch {
      // Keep any RSS-provided text or image if the publisher page cannot be read.
    }
  }
  const imageAvailable = Boolean(imageUrl);

  if (existing) {
    await env.DB.prepare(`
      UPDATE wf_news_candidates
      SET title = ?, description = ?, source_name = ?, source_region = ?,
          published_at = ?, editorial_status = ?, editorial_flags = ?,
          main_category = ?, subcategory = ?,
          article_excerpt = CASE WHEN ? <> '' THEN ? ELSE article_excerpt END,
          article_source_text = CASE WHEN ? <> '' THEN ? ELSE article_source_text END,
          image_url = CASE WHEN ? <> '' THEN ? ELSE image_url END
      WHERE id = ?
    `).bind(item.title, item.description, item.sourceName, item.sourceRegion,
      item.publishedAt, editorial.status, flags, item.mainCategory || "Latest News", item.subcategory || "", articleExcerpt, articleExcerpt,
      articleSourceText, articleSourceText, imageUrl, imageUrl, existing.id).run();
    return {
      inserted: false, editorialStatus: editorial.status,
      excerptAvailable: Boolean(articleExcerpt), imageAvailable,
      publisherPageFetchAttempted, publisherPageImageFound,
      articleTextAvailable: Boolean(articleSourceText)
    };
  }

  const result = await env.DB.prepare(`
    INSERT INTO wf_news_candidates (
      title, description, url, source_name, source_region, published_at,
      discovered_at, status, created_at, editorial_status, editorial_flags, article_excerpt, article_source_text, image_url,
      main_category, subcategory
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(item.title, item.description, item.link, item.sourceName, item.sourceRegion,
    item.publishedAt, item.discoveredAt, item.discoveredAt, editorial.status, flags, articleExcerpt, articleSourceText, imageUrl,
    item.mainCategory || "Latest News", item.subcategory || "").run();

  return {
    inserted: result.meta.changes > 0,
    editorialStatus: editorial.status,
    excerptAvailable: Boolean(articleExcerpt), articleTextAvailable: Boolean(articleSourceText), imageAvailable,
    publisherPageFetchAttempted, publisherPageImageFound
  };
}

async function fetchFeedWithRetry(feed) {
  const retryableStatuses = new Set([429, 500, 502, 503, 504]);
  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try {
      response = await fetch(feed.url, {
        headers: {
          "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
          "User-Agent": "WF-Pundit-NewsMonitor/2.3"
        },
        signal: AbortSignal.timeout(20000)
      });
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, [500, 1200][attempt]));
      continue;
    }
    if (response.ok) return response;
    const status = response.status;
    try { await response.body?.cancel(); } catch {}
    const error = new Error(feed.name + " returned HTTP " + status);
    if (!retryableStatuses.has(status) || attempt === 2) throw error;
    const retryAfter = Number(response.headers.get("Retry-After") || 0);
    const delay = retryAfter > 0 ? Math.min(retryAfter * 1000, 2500) : [500, 1200][attempt];
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error(feed.name + " could not be fetched after retries.");
}

async function scanFeed(env, feed, contentBudget) {
  const response = await fetchFeedWithRetry(feed);
  const xml = await response.text();
  if (!/<rss(?:\s|>)/i.test(xml) && !/<feed(?:\s|>)/i.test(xml)) {
    throw new Error(feed.name + " did not return recognisable RSS or Atom XML.");
  }

  const candidates = parseFeed(xml, feed);
  let inserted = 0, updated = 0, excluded = 0, flagged = 0;
  let excerptAvailable = 0, articleTextAvailable = 0, imageAvailable = 0;
  let publisherPageFetchAttempts = 0, publisherPageImagesFound = 0;
  for (const item of candidates) {
    const saved = await saveCandidate(env, item, contentBudget);
    if (saved.inserted) inserted++; else updated++;
    if (saved.editorialStatus === "excluded") excluded++;
    if (saved.editorialStatus === "needs_editorial_check") flagged++;
    if (saved.excerptAvailable) excerptAvailable++;
    if (saved.articleTextAvailable) articleTextAvailable++;
    if (saved.imageAvailable) imageAvailable++;
    if (saved.publisherPageFetchAttempted) publisherPageFetchAttempts++;
    if (saved.publisherPageImageFound) publisherPageImagesFound++;
  }
  return {
    source: feed.name,
    format: /<entry(?:\s|>)/i.test(xml) ? "Atom" : "RSS",
    fetched: candidates.length, inserted, updated, excluded, flagged,
    excerptAvailable, articleTextAvailable, imageAvailable, publisherPageFetchAttempts,
    publisherPageImagesFound, success: true
  };
}

async function scanAllFeeds(env) {
  await ensureDatabase(env);
  const results = [];
  // Spread publisher-page image/excerpt lookups across feeds instead of exhausting
  // the entire allowance on the first publisher in the registry.
  const contentBudget = { remaining: 12, perFeedLimit: 2 };
  for (const feed of RSS_FEEDS.filter(item => item.enabled)) {
    const feedBudget = { remaining: Math.min(contentBudget.perFeedLimit, contentBudget.remaining), used: 0 };
    try { results.push(await scanFeed(env, feed, feedBudget)); }
    catch (error) {
      console.error("Feed error: " + feed.name, error);
      results.push({ source: feed.name, success: false, error: error.message });
    } finally {
      contentBudget.remaining -= feedBudget.used;
    }
  }
  const successful = results.filter(item => item.success).length;
  return {
    success: successful === results.length,
    worker: WORKER_NAME,
    scannedAt: new Date().toISOString(),
    feedsChecked: results.length,
    successfulFeeds: successful,
    failedFeeds: results.length - successful,
    inserted: results.reduce((sum, item) => sum + (item.inserted || 0), 0),
    updated: results.reduce((sum, item) => sum + (item.updated || 0), 0),
    excluded: results.reduce((sum, item) => sum + (item.excluded || 0), 0),
    flagged: results.reduce((sum, item) => sum + (item.flagged || 0), 0),
    articleExcerptsLoaded: results.reduce((sum, item) => sum + (item.excerptAvailable || 0), 0),
    articleTextsLoaded: results.reduce((sum, item) => sum + (item.articleTextAvailable || 0), 0),
    candidatesWithImages: results.reduce((sum, item) => sum + (item.imageAvailable || 0), 0),
    publisherPageFetchAttempts: 6 - contentBudget.remaining,
    publisherPageImagesFound: results.reduce((sum, item) => sum + (item.publisherPageImagesFound || 0), 0),
    publisherPageFetchLimit: 12,
    automaticPublishing: AUTO_PUBLISH,
    results
  };
}

async function getDiagnostics(env) {
  await ensureDatabase(env);
  const result = await env.DB.prepare(`
    SELECT status, editorial_status, COUNT(*) AS total,
      MAX(discovered_at) AS latest_discovered
    FROM wf_news_candidates
    GROUP BY status, editorial_status
    ORDER BY status, editorial_status
  `).all();
  const groups = result.results || [];
  const categoryResult = await env.DB.prepare("SELECT main_category, subcategory, COUNT(*) AS total FROM wf_news_candidates GROUP BY main_category, subcategory ORDER BY main_category, subcategory").all();
  return json({
    success: true,
    total: groups.reduce((sum, row) => sum + Number(row.total || 0), 0),
    groups,
    categoryGroups: categoryResult.results || [],
    checkedAt: new Date().toISOString()
  });
}

async function deleteNonRssCandidates(env) {
  await ensureDatabase(env);
  const approvedRssNames = RSS_FEEDS
    .filter(feed => feed.enabled !== false)
    .map(feed => feed.name)
    .filter(Boolean);
  if (!approvedRssNames.length) {
    return json({ success: false, error: "No approved RSS feeds are configured; no records were deleted." }, 409);
  }
  const placeholders = approvedRssNames.map(() => "?").join(", ");
  const result = await env.DB.prepare(
    `DELETE FROM wf_news_candidates
     WHERE source_name IS NULL
        OR TRIM(source_name) = ''
        OR source_name NOT IN (${placeholders})`
  ).bind(...approvedRssNames).run();
  return json({
    success: true,
    deletedCount: Number(result.meta?.changes || 0),
    preservedRssSources: approvedRssNames
  });
}

async function deleteCandidate(env, request) {
  await ensureDatabase(env);
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) {
    return json({ success: false, error: "A valid collected-story ID is required." }, 400);
  }
  const result = await env.DB.prepare(
    "DELETE FROM wf_news_candidates WHERE id = ?"
  ).bind(id).run();
  if (!result.meta || result.meta.changes < 1) {
    return json({ success: false, error: "This collected story was not found. Refresh the list." }, 404);
  }
  return json({ success: true, deletedId: id });
}

async function markCandidateReviewed(env, request) {
  await ensureDatabase(env);
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isSafeInteger(id) || id < 1) {
    return json({ success: false, error: "A valid collected-story ID is required." }, 400);
  }
  const result = await env.DB.prepare(
    "UPDATE wf_news_candidates SET status = 'reviewed' WHERE id = ? AND status = 'new'"
  ).bind(id).run();
  if (!result.meta || result.meta.changes < 1) {
    const existing = await env.DB.prepare("SELECT status FROM wf_news_candidates WHERE id = ?").bind(id).first();
    if (!existing) return json({ success: false, error: "Collected story not found." }, 404);
    if (existing.status === "reviewed") return json({ success: true, alreadyReviewed: true, id });
    return json({ success: false, error: "This story is no longer in the review queue." }, 409);
  }
  return json({ success: true, reviewedId: id });
}

async function getCandidates(env, request) {
  await ensureDatabase(env);
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 30, 1), 100);
  const status = url.searchParams.get("status") || "all";
  const editorialStatus = url.searchParams.get("editorial_status") || "all";
  const clauses = [], values = [];

  if (status !== "all") { clauses.push("status = ?"); values.push(status); }
  if (editorialStatus !== "all") { clauses.push("editorial_status = ?"); values.push(editorialStatus); }

  const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
  const result = await env.DB.prepare(`
    SELECT * FROM wf_news_candidates ${where}
    ORDER BY discovered_at DESC LIMIT ?
  `).bind(...values, limit).all();

  return json({
    success: true, count: result.results.length,
    filters: { status, editorial_status: editorialStatus },
    candidates: result.results.map(row => {
      let parsed = [];
      try { parsed = JSON.parse(row.editorial_flags || "[]"); } catch {}
      return { ...row, editorial_flags: parsed };
    })
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/" || path === "/health") {
      return json({
        success: true, worker: WORKER_NAME,
        sourceRegistryVersion: SOURCE_REGISTRY_VERSION,
        enabledFeeds: RSS_FEEDS.filter(item => item.enabled).length,
        officialClubWebsites: Array.isArray(OFFICIAL_CLUBS) ? OFFICIAL_CLUBS.length : 0,
        databaseConfigured: Boolean(env.DB),
        adminTokenConfigured: Boolean(env.ADMIN_TOKEN),
        automaticPublishing: AUTO_PUBLISH,
        stage: "RSS and Atom collection with publisher article text references, excerpts and editorial triage"
      });
    }
    if (path === "/sources") return json({ success: true, feeds: RSS_FEEDS, officialClubFeeds: OFFICIAL_CLUB_FEEDS });
    if (path === "/clubs") return json({ success: true, count: OFFICIAL_CLUBS.length, clubs: OFFICIAL_CLUBS });

    if (!authorised(request, env)) return json({ error: "Unauthorised" }, 401);
    if (path === "/run" && request.method === "POST") {
      const result = await scanAllFeeds(env);
      return json(result, result.success ? 200 : 502);
    }
    if (path === "/diagnostics" && request.method === "GET") return await getDiagnostics(env);
    if (path === "/candidates" && request.method === "GET") return await getCandidates(env, request);
    if (path === "/candidates" && request.method === "DELETE" && new URL(request.url).searchParams.get("scope") === "non-rss") return await deleteNonRssCandidates(env);\n    if (path === "/candidates" && request.method === "DELETE") return await deleteCandidate(env, request);
    if (path === "/candidates" && request.method === "PATCH") return await markCandidateReviewed(env, request);
    return json({ error: "Route not found" }, 404);
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(scanAllFeeds(env)
      .then(result => console.log("WF Pundit scheduled scan:", JSON.stringify(result)))
      .catch(error => console.error("Scheduled scan failed:", error)));
  }
};
