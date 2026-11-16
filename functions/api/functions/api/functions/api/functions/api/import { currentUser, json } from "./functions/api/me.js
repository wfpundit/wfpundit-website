import { currentUser, json } from "./_auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const user = await currentUser(request, env);

    if (!user) {
      return json({ success: true, user: null });
    }

    return json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        emailVerified: Boolean(user.email_verified_at),
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error("Reader session lookup error:", error);

    return json({
      success: false,
      error: "Unable to check your account right now."
    }, 500);
  }
}
