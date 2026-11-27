
function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

async function addColumnIfMissing(env, column, definition) {
  try {
    await env.DB.prepare(`
      ALTER TABLE notifications
      ADD COLUMN ${column} ${definition}
    `).run();
  } catch (error) {
    const message = String(error.message || error).toLowerCase();

    if (!message.includes("duplicate column")) {
      throw error;
    }
  }
}

export async function ensureNotificationTables(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      article_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT NOT NULL,
      created_at TEXT NOT NULL,
      read_at TEXT,
      UNIQUE(user_id, article_id)
    )
  `).run();

  // Repair older notifications tables without deleting existing records.
  await addColumnIfMissing(env, "article_id", "INTEGER");
  await addColumnIfMissing(env, "read_at", "TEXT");

  // Prevent duplicate notifications for the same user and article.
  await env.DB.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS
    notifications_user_article_unique
    ON notifications(user_id, article_id)
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS article_notification_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      article_id INTEGER NOT NULL,
      channel TEXT NOT NULL,
      delivered_at TEXT NOT NULL,
      UNIQUE(user_id, article_id, channel)
    )
  `).run();
}

async function sendArticleEmail(env, user, article, articleUrl) {
  if (!env.RESEND_API_KEY) {
    console.warn(
      "Article email not sent: configure RESEND_API_KEY."
    );
    return false;
  }

  const name = escapeHtml(user.display_name || "Football fan");
  const title = escapeHtml(article.title);
  const summary = escapeHtml(
    article.summary || "A new story has been published on WF Pundit."
  );

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + env.RESEND_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.RESEND_NEWSLETTER_FROM_EMAIL ||
        "WF Pundit Newsletter <newsletter@wfpundit.uk>",
      to: [user.email],
      subject: "New story on WF Pundit: " + article.title,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:600px;margin:auto">
          <h2 style="color:#1769e8">WF Pundit</h2>
          <p>Hello ${name},</p>
          <p>A new football story has just been published.</p>
          <h2>${title}</h2>
          <p>${summary}</p>
          <p>
            <a href="${articleUrl}"
               style="display:inline-block;padding:12px 18px;background:#1769e8;color:#fff;text-decoration:none;border-radius:6px">
              Read the full story
            </a>
          </p>
          <p>Thank you for following WF Pundit.</p>
        </div>
      `,
      text:
        "Hello " + (user.display_name || "Football fan") +
        ",\n\nA new story has been published on WF Pundit:\n\n" +
        article.title + "\n\n" +
        (article.summary || "") + "\n\nRead it here: " +
        articleUrl
    })
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("Article email delivery failed:", response.status, details);
    return false;
  }

  return true;
}

export async function notifyPublishedArticle(env, article) {
  try {
    await ensureNotificationTables(env);

    const users = await env.DB.prepare(`
      SELECT
        u.id,
        u.email,
        u.display_name,
        COALESCE(p.breaking_news_in_app, 1) AS in_app,
        COALESCE(p.breaking_news_email, 1) AS email_enabled
      FROM reader_accounts u
      LEFT JOIN notification_preferences p
        ON p.user_id = u.id
    `).all();

    const siteUrl = (
      env.SITE_URL || "https://wfpundit.pages.dev"
    ).replace(/\/+$/, "");

    const articleUrl =
      siteUrl + "/article.html?id=" +
      encodeURIComponent(article.id);

    const now = new Date().toISOString();

    for (const user of users.results || []) {
      if (Number(user.in_app) === 1) {
        await env.DB.prepare(`
          INSERT OR IGNORE INTO notifications (
            user_id,
            article_id,
            title,
            message,
            link,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          user.id,
          article.id,
          article.title,
          article.summary || "A new story has been published.",
          articleUrl,
          now
        ).run();
      }

      if (
        Number(user.email_enabled) === 1 &&
        user.email
      ) {
        const claim = await env.DB.prepare(`
          INSERT OR IGNORE INTO article_notification_deliveries (
            user_id,
            article_id,
            channel,
            delivered_at
          )
          VALUES (?, ?, 'email', ?)
        `).bind(user.id, article.id, now).run();

        if (!claim.meta.changes) continue;

        const sent = await sendArticleEmail(
          env,
          user,
          article,
          articleUrl
        );

        if (!sent) {
          await env.DB.prepare(`
            DELETE FROM article_notification_deliveries
            WHERE user_id = ?
              AND article_id = ?
              AND channel = 'email'
          `).bind(user.id, article.id).run();
        }
      }
    }

  } catch (error) {
    console.error("Article notification process failed:", error);
  }
}
