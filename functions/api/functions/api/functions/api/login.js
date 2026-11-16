import { createSession, json, readJson, validOrigin, verifyPassword } from "./_auth.js";

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

  const email = String(data.email || "").trim().toLowerCase();
  const password = typeof data.password === "string" ? data.password : "";

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    password.length > 128
  ) {
    return json({ success: false, error: "Email or password is incorrect." }, 401);
  }

  try {
    const user = await env.DB.prepare(`
      SELECT id, email, display_name, password_hash
      FROM reader_accounts
      WHERE email = ?
      LIMIT 1
    `).bind(email).first();

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return json({ success: false, error: "Email or password is incorrect." }, 401);
    }

    const session = await createSession(user.id, env);

    return json({
      success: true,
      message: "Welcome back.",
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name
      }
    }, 200, { "Set-Cookie": session.cookie });

  } catch (error) {
    console.error("Reader login error:", error);

    return json({
      success: false,
      error: "We couldn't sign you in right now. Please try again."
    }, 500);
  }
}
