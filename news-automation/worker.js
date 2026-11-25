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
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
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

function matchesTopic(title, description) {
  const text = (title + " " + description).toLowerCase();
  return ARTICLE_KEYWORDS.some(keyword => text.includes(keyword.toLowerCase()));
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
      tagValue(block, "content:encoded") || tagValue(block, "summary") ||
      tagValue(block, "content"));
    const rawLink = isAtom ? getAtomLink(block) : (tagValue(block, "link") || tagValue(block, "guid"));
    const link = normaliseUrl(rawLink);
    const publishedAt = isAtom
      ? (tagValue(block, "published") || tagValue(block, "updated") || null)
      : (tagValue(block, "pubDate") || tagValue(block, "dc:date") || null);

    if (!title || !link || !matchesTopic(title, description)) return null;
    return {
      title, description, link, publishedAt,
      sourceName: feed.name, sourceRegion: feed.region,
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

async function ensureDatabase(env) {
  if (!env.DB) throw new Error("The D1 database binding DB is missing.");
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS wf_news_candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
      description TEXT DEFAULT '', url TEXT NOT NULL UNIQUE,
      source_name TEXT NOT NULL, source_region TEXT DEFAULT '',
      published_at TEXT, discovered_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL
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
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_wf_news_candidates_status ON wf_news_candidates(status)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_wf_news_candidates_editorial_status ON wf_news_candidates(editorial_status)").run();
  await backfillPendingEditorial(env);
}

async function saveCandidate(env, item) {
  let editorial = editorialTriage(item);
  editorial = await markPossibleDuplicates(env, item, editorial);
  const flags = JSON.stringify({
    flags: editorial.flags,
    relatedCandidates: editorial.relatedCandidates || []
  });
  const existing = await env.DB.prepare("SELECT id FROM wf_news_candidates WHERE url = ?").bind(item.link).first();

  if (existing) {
    await env.DB.prepare(`
      UPDATE wf_news_candidates
      SET title = ?, description = ?, source_name = ?, source_region = ?,
          published_at = ?, editorial_status = ?, editorial_flags = ?
      WHERE id = ?
    `).bind(item.title, item.description, item.sourceName, item.sourceRegion,
      item.publishedAt, editorial.status, flags, existing.id).run();
    return { inserted: false, editorialStatus: editorial.status };
  }

  const result = await env.DB.prepare(`
    INSERT INTO wf_news_candidates (
      title, description, url, source_name, source_region, published_at,
      discovered_at, status, created_at, editorial_status, editorial_flags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)
  `).bind(item.title, item.description, item.link, item.sourceName, item.sourceRegion,
    item.publishedAt, item.discoveredAt, item.discoveredAt, editorial.status, flags).run();

  return { inserted: result.meta.changes > 0, editorialStatus: editorial.status };
}

async function scanFeed(env, feed) {
  const response = await fetch(feed.url, {
    headers: {
      "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
      "User-Agent": "WF-Pundit-NewsMonitor/2.0"
    },
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(feed.name + " returned HTTP " + response.status);
  const xml = await response.text();
  if (!/<rss(?:\s|>)/i.test(xml) && !/<feed(?:\s|>)/i.test(xml)) {
    throw new Error(feed.name + " did not return recognisable RSS or Atom XML.");
  }

  const candidates = parseFeed(xml, feed);
  let inserted = 0, updated = 0, excluded = 0, flagged = 0;
  for (const item of candidates) {
    const saved = await saveCandidate(env, item);
    if (saved.inserted) inserted++; else updated++;
    if (saved.editorialStatus === "excluded") excluded++;
    if (saved.editorialStatus === "needs_editorial_check") flagged++;
  }
  return {
    source: feed.name,
    format: /<entry(?:\s|>)/i.test(xml) ? "Atom" : "RSS",
    fetched: candidates.length, inserted, updated, excluded, flagged,
    success: true
  };
}

async function scanAllFeeds(env) {
  await ensureDatabase(env);
  const results = [];
  for (const feed of RSS_FEEDS.filter(item => item.enabled)) {
    try { results.push(await scanFeed(env, feed)); }
    catch (error) {
      console.error("Feed error: " + feed.name, error);
      results.push({ source: feed.name, success: false, error: error.message });
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
  return json({
    success: true,
    total: groups.reduce((sum, row) => sum + Number(row.total || 0), 0),
    groups,
    checkedAt: new Date().toISOString()
  });
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
        stage: "RSS and Atom collection with editorial triage"
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
    return json({ error: "Route not found" }, 404);
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(scanAllFeeds(env)
      .then(result => console.log("WF Pundit scheduled scan:", JSON.stringify(result)))
      .catch(error => console.error("Scheduled scan failed:", error)));
  }
};
