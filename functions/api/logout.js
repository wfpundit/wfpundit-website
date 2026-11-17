import { clearSessionCookie, deleteCurrentSession, json, validOrigin } from "./_auth.js";

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) {
    return json({ success: false, error: "Request could not be verified." }, 403);
  }

  try {
    await deleteCurrentSession(request, env);

    return json({
      success: true,
      message: "You have been logged out."
    }, 200, {
      "Set-Cookie": clearSessionCookie()
    });
  } catch (error) {
    console.error("Reader logout error:", error);

    return json({
      success: false,
      error: "Unable to log out right now."
    }, 500);
  }
}
