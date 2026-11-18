import {
  hashPassword,
  json,
  readJson,
  sha256,
  validOrigin
} from "./_auth.js";

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

  const token = typeof data.token === "string"
    ? data.token
    : "";

  const password = typeof data.password === "string"
    ? data.password
    : "";

  if (!token || token.length > 200) {
    return json({
      success: false,
      error: "This reset link is invalid or has expired. Request a new one."
    }, 400);
  }

  if (password.length < 12 || password.length > 128) {
    return json({
      success: false,
      error: "Use a password between 12 and 128 characters."
    }, 400);
  }

  try {
    const tokenHash = await sha256(token);
    const now = new Date().toISOString();

    const reset = await env.DB.prepare(`
      SELECT r.id, r.user_id, u.google_sub
      FROM reader_password_resets r
      JOIN reader_accounts u ON u.id = r.user_id
      WHERE r.token_hash = ?
      AND r.used_at IS NULL
      AND r.expires_at > ?
      LIMIT 1
    `).bind(tokenHash, now).first();

    if (!reset || reset.google_sub) {
      return json({
        success: false,
        error: "This reset link is invalid or has expired. Request a new one."
      }, 400);
    }

    // Mark the reset token as used.
    const consumed = await env.DB.prepare(`
      UPDATE reader_password_resets
      SET used_at = ?
      WHERE id = ?
      AND used_at IS NULL
      AND expires_at > ?
    `).bind(now, reset.id, now).run();

    if (!consumed.meta || consumed.meta.changes !== 1) {
      return json({
        success: false,
        error: "This reset link is invalid or has expired. Request a new one."
      }, 400);
    }

    // Hash the new password securely.
    const passwordHash = await hashPassword(password);

    const updated = await env.DB.prepare(`
      UPDATE reader_accounts
      SET password_hash = ?
      WHERE id = ?
      AND google_sub IS NULL
    `).bind(passwordHash, reset.user_id).run();

    if (!updated.meta || updated.meta.changes !== 1) {
      return json({
        success: false,
        error: "We couldn't reset your password. Please request a new link."
      }, 400);
    }

    // Invalidate any other outstanding reset links.
    await env.DB.prepare(`
      UPDATE reader_password_resets
      SET used_at = ?
      WHERE user_id = ?
      AND used_at IS NULL
    `).bind(now, reset.user_id).run();

    // Sign out existing sessions on all devices.
    await env.DB.prepare(`
      DELETE FROM reader_sessions
      WHERE user_id = ?
    `).bind(reset.user_id).run();

    return json({
      success: true,
      message: "Your password has been reset. Please log in with your new password."
    });

  } catch (error) {
    console.error("Password reset completion failed:", error);

    return json({
      success: false,
      error: "We couldn't reset your password. Please try again."
    }, 500);
  }
}
