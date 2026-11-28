import { adminAuthorised, json } from "../_auth.js";
import { ensureNewsletterSubscribersTable } from "../_newsletter.js";

const INTEREST_LABELS = {
  "wsl": "Women's Super League",
  "uwcl": "Women's Champions League",
  "nwsl": "NWSL",
  "liga-f": "Liga F",
  "bundesliga-women": "Frauen-Bundesliga",
  "serie-a-women": "Serie A Women",
  "women-championship": "Women's Championship",
  "international": "International tournaments",
  "transfers": "Transfers",
  "match-reports": "Match reports",
  "analysis-interviews": "Analysis & interviews"
};

export async function onRequestGet({ request, env }) {
  if (!(await adminAuthorised(request, env))) {
    return json({ success: false, error: "Unauthorised." }, 401);
  }

  try {
    await ensureNewsletterSubscribersTable(env);

    const totals = await env.DB.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status = 'unsubscribed' THEN 1 ELSE 0 END) AS unsubscribed,
        SUM(CASE WHEN status = 'active' AND account_type = 'guest' THEN 1 ELSE 0 END) AS guests,
        SUM(CASE WHEN status = 'active' AND account_type = 'registered' THEN 1 ELSE 0 END) AS registered,
        SUM(CASE WHEN status = 'active' AND all_news = 1 THEN 1 ELSE 0 END) AS all_news,
        SUM(CASE WHEN status = 'active' AND story_alerts = 1 THEN 1 ELSE 0 END) AS story_alerts,
        SUM(CASE WHEN status = 'active' AND weekly_digest = 1 THEN 1 ELSE 0 END) AS weekly_digest
      FROM newsletter_subscribers
    `).first();

    const rows = await env.DB.prepare(`
      SELECT interests_json
      FROM newsletter_subscribers
      WHERE status = 'active' AND all_news = 0
    `).all();

    const interestCounts = {};
    for (const row of rows.results || []) {
      let interests = [];
      try {
        const parsed = JSON.parse(row.interests_json || "[]");
        interests = Array.isArray(parsed) ? parsed : [];
      } catch {}

      for (const interest of interests) {
        if (Object.prototype.hasOwnProperty.call(INTEREST_LABELS, interest)) {
          interestCounts[interest] = (interestCounts[interest] || 0) + 1;
        }
      }
    }

    return json({
      success: true,
      stats: {
        total: Number(totals?.total || 0),
        active: Number(totals?.active || 0),
        unsubscribed: Number(totals?.unsubscribed || 0),
        guests: Number(totals?.guests || 0),
        registered: Number(totals?.registered || 0),
        allNews: Number(totals?.all_news || 0),
        storyAlerts: Number(totals?.story_alerts || 0),
        weeklyDigest: Number(totals?.weekly_digest || 0),
        interests: Object.entries(interestCounts)
          .map(([key, count]) => ({
            key,
            label: INTEREST_LABELS[key],
            count
          }))
          .sort((a, b) => b.count - a.count)
      }
    });
  } catch (error) {
    console.error("Newsletter preference statistics failed:", error);
    return json({
      success: false,
      error: "Unable to load subscriber preference statistics."
    }, 500);
  }
}
