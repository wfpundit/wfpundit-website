
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

  const rawName = user.display_name || "Football fan";
  const name = escapeHtml(rawName);
  const title = escapeHtml(article.title);
  const summary = escapeHtml(
    article.summary || "A new story has just been published on WF Pundit."
  );
  const safeArticleUrl = escapeHtml(articleUrl);
  const supportUrl = "mailto:support@wfpundit.uk";
  const siteUrl = escapeHtml(
    (env.SITE_URL || "https://wfpundit.uk").replace(/\\/+$/, "")
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
      subject: "New on WF Pundit: " + article.title,
      html: `
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta name="color-scheme" content="light">
            <title>New story on WF Pundit</title>
          </head>
          <body style="margin:0;padding:0;background:#f2f5f9;font-family:Arial,Helvetica,sans-serif;color:#172033;">
            <div style="display:none;font-size:1px;color:#f2f5f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
              A fresh women’s football story is waiting for you on WF Pundit.
            </div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2f5f9;padding:30px 12px;">
              <tr>
                <td align="center">
                  <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;">
                    <tr>
                      <td style="background:#071b36;padding:25px 30px 22px;">
                        <a href="${siteUrl}" style="font-size:25px;line-height:1.2;font-weight:800;letter-spacing:-.7px;color:#ffffff;text-decoration:none;">WF <span style="color:#55a4ff;">PUNDIT</span></a>
                        <div style="margin-top:8px;color:#b9c9df;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">The home of women’s football</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:32px 30px 12px;">
                        <div style="display:inline-block;background:#eaf3ff;color:#1769e8;border-radius:20px;padding:7px 11px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">New story published</div>
                        <p style="margin:22px 0 8px;font-size:15px;line-height:1.6;color:#526176;">Hello ${name},</p>
                        <h1 style="margin:0 0 16px;font-size:27px;line-height:1.25;letter-spacing:-.5px;color:#10213b;">${title}</h1>
                        <div style="height:3px;width:48px;background:#1769e8;border-radius:3px;margin:0 0 20px;"></div>
                        <p style="margin:0 0 26px;font-size:16px;line-height:1.75;color:#526176;">${summary}</p>
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                            <td bgcolor="#1769e8" style="border-radius:7px;">
                              <a href="${safeArticleUrl}" style="display:inline-block;padding:14px 23px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:7px;">Read the full story&nbsp; →</a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin:27px 0 18px;font-size:13px;line-height:1.6;color:#7a8798;">Stay informed with the latest news, results and stories from the world of women’s football.</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:22px 30px;background:#f7f9fc;border-top:1px solid #e8edf4;">
                        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#172033;">We’d love to hear from you.</p>
                        <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;">Questions, feedback or suggestions? Contact our team at <a href="${supportUrl}" style="color:#1769e8;text-decoration:none;font-weight:700;">support@wfpundit.uk</a>.</p>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding:22px 24px;background:#071b36;">
                        <p style="margin:0 0 7px;color:#ffffff;font-size:13px;font-weight:700;">WF Pundit</p>
                        <p style="margin:0 0 8px;color:#b9c9df;font-size:11px;line-height:1.6;">Independent coverage of women’s football.</p>
                        <a href="${siteUrl}" style="color:#8fc2ff;font-size:12px;text-decoration:none;">wfpundit.uk</a>
                        <p style="margin:14px 0 0;color:#8294ad;font-size:10px;line-height:1.5;">You are receiving this email because email story notifications are enabled for your WF Pundit account.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      text:
        "WF PUNDIT — THE HOME OF WOMEN’S FOOTBALL\\n\\n" +
        "Hello " + rawName + ",\\n\\n" +
        "NEW STORY PUBLISHED\\n\\n" +
        article.title + "\\n\\n" +
        (article.summary || "A new story has just been published on WF Pundit.") +
        "\\n\\nRead the full story: " + articleUrl +
        "\\n\\nQuestions, feedback or suggestions? Email support@wfpundit.uk." +
        "\\n\\nWF Pundit | wfpundit.uk"
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
