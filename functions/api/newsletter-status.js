import { currentUser, json } from "./_auth.js";

export async function onRequestGet({ request, env }) {
  try {
    const user = await currentUser(request, env);

    if (!user) {
      return json({
        success: true,
        loggedIn: false,
        subscribed: false
      });
    }

    if (!env.BREVO_API_KEY || !env.BREVO_LIST_ID) {
      return json({
        success: false,
        error: "Newsletter service is not configured."
      }, 500);
    }

    const listId = Number(env.BREVO_LIST_ID);

    if (!Number.isSafeInteger(listId) || listId < 1) {
      return json({
        success: false,
        error: "Newsletter list configuration is invalid."
      }, 500);
    }

    const email = String(user.email || "").trim().toLowerCase();
    const displayName = String(user.display_name || "").trim();
    const firstName = displayName.split(/\s+/)[0] || "Reader";

    if (!email) {
      return json({
        success: false,
        error: "Your account email could not be verified."
      }, 400);
    }

    const lookup = await fetch(
      "https://api.brevo.com/v3/contacts/" +
      encodeURIComponent(email),
      {
        method: "GET",
        headers: {
          "api-key": env.BREVO_API_KEY,
          "accept": "application/json"
        }
      }
    );

    let subscribed = false;

    if (lookup.status !== 404) {
      if (!lookup.ok) {
        throw new Error(
          "Brevo subscription lookup failed: " +
          await lookup.text()
        );
      }

      const contact = await lookup.json();

      const lists = Array.isArray(contact.listIds)
        ? contact.listIds.map(Number)
        : [];

      subscribed = lists.includes(listId);
    }

    return json({
      success: true,
      loggedIn: true,
      firstName,
      email,
      subscribed
    });

  } catch (error) {
    console.error("Newsletter status error:", error);

    return json({
      success: false,
      error: "Unable to check newsletter subscription status."
    }, 500);
  }
}
