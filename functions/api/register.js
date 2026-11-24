
import { createSession, hashPassword, json, readJson, validOrigin } from "./_auth.js";
import { sendWelcomeEmail } from "./_welcome-email.js";

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) {
    return json({ success: false, error: "Request could not be verified." }, 403);
  }

  let data;
  try {
    data = await readJson(request);
  } catch {
    return json({ success: false, error: "Please submit the form again." }, 400);
  }

  const displayName = String(data.displayName || "").trim();
  const email = String(data.email || "").trim().toLowerCase();
  const password = typeof data.password === "string" ? data.password : "";

  if (displayName.length < 2 || displayName.length > 50) {
    return json({ success: false, error: "Enter a name between 2 and 50 characters." }, 400);
  }

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ success: false, error: "Enter a valid email address." }, 400);
  }

  if (password.length < 12 || password.length > 128) {
    return json({ success: false, error: "Use a password between 12 and 128 characters." }, 400);
  }

  try {
    const existingAccount = await env.DB.prepare(
      "SELECT id FROM reader_accounts WHERE lower(email) = ? LIMIT 1"
    ).bind(email).first();

    if (existingAccount) {
      return json({
        success: false,
        error: "This email address is already registered. Please log in to your account."
      }, 409);
    }

    const passwordHash = await hashPassword(password);

    const result = await env.DB.prepare(`
      INSERT INTO reader_accounts (email, password_hash, display_name)
      VALUES (?, ?, ?)
    `).bind(email, passwordHash, displayName).run();

    const session = await createSession(result.meta.last_row_id, env);

    try {
      await sendWelcomeEmail(env, email, displayName);
    } catch (emailError) {
      console.error("WF Pundit registration welcome email error:", emailError);
    }

    return json({
      success: true,
      message: "Your account is ready.",
      user: {
        id: result.meta.last_row_id,
        email,
        displayName
      }
    }, 201, { "Set-Cookie": session.cookie });

  } catch (error) {
    console.error("Reader registration diagnostic:", error);

    try {
      const existingAccount = await env.DB.prepare(
        "SELECT id FROM reader_accounts WHERE lower(email) = ? LIMIT 1"
      ).bind(email).first();

      if (existingAccount) {
        return json({
          success: false,
          error: "This email address is already registered. Please log in to your account."
        }, 409);
      }
    } catch (lookupError) {
      console.error("Reader registration duplicate check failed:", lookupError);
    }

    return json({
      success: false,
      error: "We couldn't complete your registration. Please try again."
    }, 500);
  }
}
