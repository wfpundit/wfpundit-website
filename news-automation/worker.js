
import {
  RSS_FEEDS,
  ARTICLE_KEYWORDS,
  SOURCE_REGISTRY_VERSION
} from "./sources.js";

const WORKER_NAME = "WF Pundit News Automation";
const AUTO_PUBLISH = false;
const MAX_ITEMS_PER_FEED = 40;

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function authorised(request, env) {
  const header = request.headers.get("Authorization");

  return Boolean(
    env.ADMIN_TOKEN &&
    header === `Bearer ${env.ADMIN_TOKEN}`
  );
}

function decodeXML(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) =>
      String.fromCodePoint(Number(n))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCodePoint(parseInt(n, 16))
    );
}

function tagValue(xml, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(
    new RegExp(
      `<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`,
      "i"
    )
  );

  return match ? decodeXML(match[1].trim()) : "";
}

function cleanText(value = "") {
  return decodeXML(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000);
}

function normaliseUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    url.hash = "";

    // Remove common tracking parameters.
    for (const key of [...url.searchParams.keys()]) {
      if (
        key.startsWith("utm_") ||
        ["fbclid", "gclid", "mc_cid", "mc_eid"].includes(key)
      ) {
        url.searchParams.delete(key);
      }
    }

    return url.toString();
  } catch {
    return null;
  }
}

function matchesTopic(title, description) {
  const text = `${title} ${description}`.toLowerCase();

  return ARTICLE_KEYWORDS.some(keyword =>
    text.includes(keyword.toLowerCase())
  );
}

function parseRSS(xml, feed) {
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];

  return items.slice(0, MAX_ITEMS_PER_FEED).map(item => {
    const title = cleanText(tagValue(item, "title"));
    const description = cleanText(
      tagValue(item, "description") ||
      tagValue(item, "content:encoded")
    );

    const rawLink =
      tagValue(item, "link") ||
      tagValue(item, "guid");

    const link = normaliseUrl(rawLink);

    const publishedAt =
      tagValue(item, "pubDate") ||
      tagValue(item, "dc:date") ||
      null;

    if (!title || !link || !matchesTopic(title, description)) {
      return null;
    }

    return {
      title,
      description,
      link,
      publishedAt,
      sourceName: feed.name,
      sourceRegion: feed.region,
      discoveredAt: new Date().toISOString()
    };
  }).filter(Boolean);
}

async function ensureDatabase(env) {
  if (!env.DB) {
    throw new Error("The D1 database binding DB is missing.");
  }

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS wf_news_candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      url TEXT NOT NULL UNIQUE,
      source_name TEXT NOT NULL,
      source_region TEXT DEFAULT '',
      published_at TEXT,
      discovered_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL
    )
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS
    idx_wf_news_candidates_status
    ON wf_news_candidates(status)
  `).run();
}

async function scanFeed(env, feed) {
  const response = await fetch(feed.url, {
    headers: {
      "Accept": "application/rss+xml, application/xml, text/xml",
      "User-Agent": "WF-Pundit-NewsMonitor/1.0"
    },
    signal: AbortSignal.timeout(20000)
  });

  if (!response.ok) {
    throw new Error(
      `${feed.name} returned HTTP ${response.status}`
    );
  }

  const xml = await response.text();

  if (!xml.includes("<rss") && !xml.includes("<feed")) {
    throw new Error(`${feed.name} did not return recognisable feed XML.`);
  }

  const candidates = parseRSS(xml, feed);
  let inserted = 0;
  let duplicates = 0;

  for (const item of candidates) {
    const result = await env.DB.prepare(`
      INSERT OR IGNORE INTO wf_news_candidates (
        title,
        description,
        url,
        source_name,
        source_region,
        published_at,
        discovered_at,
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)
    `).bind(
      item.title,
      item.description,
      item.link,
      item.sourceName,
      item.sourceRegion,
      item.publishedAt,
      item.discoveredAt,
      item.discoveredAt
    ).run();

    if (result.meta.changes > 0) {
      inserted++;
    } else {
      duplicates++;
    }
  }

  return {
    source: feed.name,
    fetched: candidates.length,
    inserted,
    duplicates,
    success: true
  };
}

async function scanAllFeeds(env) {
  await ensureDatabase(env);

  const results = [];

  for (const feed of RSS_FEEDS.filter(item => item.enabled)) {
    try {
      results.push(await scanFeed(env, feed));
    } catch (error) {
      console.error(`Feed error: ${feed.name}`, error);

      results.push({
        source: feed.name,
        success: false,
        error: error.message
      });
    }
  }

  const successful = results.filter(item => item.success).length;
  const failed = results.length - successful;

  return {
    success: failed === 0,
    worker: WORKER_NAME,
    scannedAt: new Date().toISOString(),
    feedsChecked: results.length,
    successfulFeeds: successful,
    failedFeeds: failed,
    inserted: results.reduce(
      (sum, item) => sum + (item.inserted || 0), 0
    ),
    duplicates: results.reduce(
      (sum, item) => sum + (item.duplicates || 0), 0
    ),
    results
  };
}

async function getCandidates(env, request) {
  await ensureDatabase(env);

  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(Number(url.searchParams.get("limit")) || 30, 1),
    100
  );

  const status = url.searchParams.get("status") || "all";

  let result;

  if (status === "all") {
    result = await env.DB.prepare(`
      SELECT *
      FROM wf_news_candidates
      ORDER BY discovered_at DESC
      LIMIT ?
    `).bind(limit).all();
  } else {
    result = await env.DB.prepare(`
      SELECT *
      FROM wf_news_candidates
      WHERE status = ?
      ORDER BY discovered_at DESC
      LIMIT ?
    `).bind(status, limit).all();
  }

  return json({
    success: true,
    count: result.results.length,
    candidates: result.results
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/" || path === "/health") {
      return json({
        success: true,
        worker: WORKER_NAME,
        sourceRegistryVersion: SOURCE_REGISTRY_VERSION,
        enabledFeeds: RSS_FEEDS.filter(item => item.enabled).length,
        databaseConfigured: Boolean(env.DB),
        adminTokenConfigured: Boolean(env.ADMIN_TOKEN),
        automaticPublishing: AUTO_PUBLISH,
        stage: "RSS collection and candidate storage"
      });
    }

    if (path === "/sources") {
      return json({
        success: true,
        feeds: RSS_FEEDS
      });
    }

    if (!authorised(request, env)) {
      return json({ error: "Unauthorised" }, 401);
    }

    if (path === "/run" && request.method === "POST") {
      const result = await scanAllFeeds(env);
      return json(result, result.success ? 200 : 502);
    }

    if (path === "/candidates" && request.method === "GET") {
      return await getCandidates(env, request);
    }

    return json({ error: "Route not found" }, 404);
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      scanAllFeeds(env)
        .then(result => {
          console.log(
            "WF Pundit scheduled scan:",
            JSON.stringify(result)
          );
        })
        .catch(error => {
          console.error("Scheduled scan failed:", error);
        })
    );
  }
};
