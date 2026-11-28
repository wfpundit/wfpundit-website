const ALLOWED_INTERESTS = new Set([
  "wsl",
  "uwcl",
  "nwsl",
  "liga-f",
  "bundesliga-women",
  "serie-a-women",
  "women-championship",
  "international",
  "transfers",
  "match-reports",
  "analysis-interviews"
]);

export async function ensureNewsletterSubscribersTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      account_id INTEGER,
      first_name TEXT NOT NULL DEFAULT '',
      account_type TEXT NOT NULL DEFAULT 'guest',
      all_news INTEGER NOT NULL DEFAULT 1,
      story_alerts INTEGER NOT NULL DEFAULT 1,
      weekly_digest INTEGER NOT NULL DEFAULT 1,
      interests_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      consent_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      unsubscribed_at TEXT
    )
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_idx
    ON newsletter_subscribers(status)
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS newsletter_subscribers_account_idx
    ON newsletter_subscribers(account_id)
  `).run();
}

export function normalizeNewsletterPreferences(data = {}) {
  const allNews = data.allNews !== false;
  const rawInterests = Array.isArray(data.interests) ? data.interests : [];
  const interests = [...new Set(rawInterests
    .filter(value => typeof value === "string")
    .map(value => value.trim().toLowerCase())
    .filter(value => ALLOWED_INTERESTS.has(value)))];

  if (!allNews && interests.length === 0) {
    return {
      valid: false,
      error: "Choose at least one interest, or select All Women's Football News."
    };
  }

  if (rawInterests.length > ALLOWED_INTERESTS.size) {
    return {
      valid: false,
      error: "Too many interests were selected."
    };
  }

  return {
    valid: true,
    allNews,
    interests: allNews ? [] : interests,
    storyAlerts: data.storyAlerts !== false,
    weeklyDigest: data.weeklyDigest !== false
  };
}

export async function saveNewsletterSubscription(env, details) {
  await ensureNewsletterSubscribersTable(env);

  const now = new Date().toISOString();
  const accountId = Number.isSafeInteger(Number(details.accountId))
    && Number(details.accountId) > 0
    ? Number(details.accountId)
    : null;

  await env.DB.prepare(`
    INSERT INTO newsletter_subscribers (
      email,
      account_id,
      first_name,
      account_type,
      all_news,
      story_alerts,
      weekly_digest,
      interests_json,
      status,
      consent_at,
      created_at,
      updated_at,
      unsubscribed_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, NULL)
    ON CONFLICT(email) DO UPDATE SET
      account_id = COALESCE(excluded.account_id, newsletter_subscribers.account_id),
      first_name = excluded.first_name,
      account_type = CASE
        WHEN COALESCE(excluded.account_id, newsletter_subscribers.account_id) IS NULL
        THEN 'guest' ELSE 'registered' END,
      all_news = excluded.all_news,
      story_alerts = excluded.story_alerts,
      weekly_digest = excluded.weekly_digest,
      interests_json = excluded.interests_json,
      status = 'active',
      consent_at = excluded.consent_at,
      updated_at = excluded.updated_at,
      unsubscribed_at = NULL
  `).bind(
    String(details.email).trim().toLowerCase(),
    accountId,
    String(details.firstName || "Reader").slice(0, 80),
    accountId ? "registered" : "guest",
    Number(details.preferences.allNews),
    Number(details.preferences.storyAlerts),
    Number(details.preferences.weeklyDigest),
    JSON.stringify(details.preferences.interests),
    now,
    now,
    now
  ).run();
}

export async function markNewsletterUnsubscribed(env, email) {
  await ensureNewsletterSubscribersTable(env);
  await env.DB.prepare(`
    UPDATE newsletter_subscribers
    SET status = 'unsubscribed',
        unsubscribed_at = ?,
        updated_at = ?
    WHERE email = ?
  `).bind(
    new Date().toISOString(),
    new Date().toISOString(),
    String(email || "").trim().toLowerCase()
  ).run();
}
