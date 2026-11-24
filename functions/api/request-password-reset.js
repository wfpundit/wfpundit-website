import { json, readJson, sha256, validOrigin } from "./_auth.js";

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) {
    return json({
      success: false,
      error: "Request could not be verified."
    }, 403);
  }

  let data;

  try {
    data = await readJson(request);
  } catch {
    return json({
      success: false,
      error: "Please submit the form again."
    }, 400);
  }

  const email = String(data.email || "").trim().toLowerCase();

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return json({
      success: false,
      error: "Enter a valid email address."
    }, 400);
  }

  const genericMessage =
    "If an eligible account exists for that email, a password-reset link will be sent.";

  if (!env.RESEND_API_KEY || !env.DB) {
    return json({ success: true, message: genericMessage });
  }

  try {
    const user = await env.DB.prepare(
      `SELECT id, email, display_name
       FROM reader_accounts
       WHERE lower(email) = ?
       LIMIT 1`
    ).bind(email).first();

    // Password setup and reset are available to both Google and email accounts.
    // The reset link is delivered to the account's registered email address.
    if (!user) {
      return json({
        success: true,
        message: genericMessage
      });
    }

    // Prevent repeated reset requests within one minute.
    const recent = await env.DB.prepare(`
      SELECT id
      FROM reader_password_resets
      WHERE user_id = ?
      AND datetime(created_at) > datetime('now', '-1 minute')
      LIMIT 1
    `).bind(user.id).first();

    if (recent) {
      return json({
        success: true,
        message: genericMessage
      });
    }

    const tokenBytes = crypto.getRandomValues(
      new Uint8Array(32)
    );

    const token = toBase64Url(tokenBytes);
    const tokenHash = await sha256(token);

    const now = new Date();
    const createdAt = now.toISOString();

    const expiresAt = new Date(
      now.getTime() + 30 * 60 * 1000
    ).toISOString();

    // Invalidate previous unused reset links.
    await env.DB.prepare(`
      UPDATE reader_password_resets
      SET used_at = ?
      WHERE user_id = ?
      AND used_at IS NULL
    `).bind(createdAt, user.id).run();

    await env.DB.prepare(`
      INSERT INTO reader_password_resets
      (user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(
      user.id,
      tokenHash,
      expiresAt,
      createdAt
    ).run();

    const resetUrl = new URL(
      "/reset-password.html?token=" +
      encodeURIComponent(token),
      new URL(request.url).origin
    ).toString();

    const safeName = escapeHtml(
      user.display_name || "there"
    );

    const emailResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + env.RESEND_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: env.RESEND_FROM_EMAIL || "WF Pundit <onboarding@resend.dev>",
          to: [user.email],
          subject: "Reset your WF Pundit password",

          html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033">
              <h2>Reset your WF Pundit password</h2>
              <p>Hello ${safeName},</p>
              <p>We received a request to reset your WF Pundit account password.</p>
              <p>
                <a href="${resetUrl}"
                   style="display:inline-block;padding:12px 18px;background:#2865aa;color:#fff;text-decoration:none;border-radius:6px">
                  Reset password
                </a>
              </p>
              <p>This link expires in 30 minutes and can only be used once.</p>
              <p>If you didn't request this, you can ignore this email.</p>
            </div>
          `,

          text:
            "Hello " + (user.display_name || "there") +
            ",\n\nUse this link to reset your WF Pundit password. " +
            "It expires in 30 minutes:\n" +
            resetUrl +
            "\n\nIf you didn't request this, ignore this email."
        })
      }
    );

    if (!emailResponse.ok) {
      const details = await emailResponse.text();

      console.error(
        "Resend password email failed:",
        emailResponse.status,
        details
      );

      await env.DB.prepare(`
        DELETE FROM reader_password_resets
        WHERE token_hash = ?
      `).bind(tokenHash).run();
    }

  } catch (error) {
    console.error("Password reset request failed:", error);
  }

  return json({
    success: true,
    message: genericMessage
  });
}
