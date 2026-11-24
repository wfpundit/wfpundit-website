import { currentUser, isSiteAdmin, json } from "./_auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const user = await currentUser(request, env);

    if (!user) {
      return json({
        success: true,
        loggedIn: false,
        user: null
      });
    }

    const isAdmin = await isSiteAdmin(request, env);

    return json({
      success: true,
      loggedIn: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        emailVerified: Boolean(user.email_verified_at),
        isAdmin
      }
    });
  } catch (error) {
    console.error("Session check error:", error);

    return json({
      success: false,
      error: "Unable to check login status."
    }, 500);
  }
}
