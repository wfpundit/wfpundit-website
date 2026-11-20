
import { json, readJson, validOrigin } from "./_auth.js";

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

  // Spam protection
  if (typeof data.website === "string" && data.website.trim()) {
    return json({
      success: true,
      message: "Thanks for subscribing."
    });
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

  if (data.consent !== true) {
    return json({
      success: false,
      error: "Please confirm your newsletter subscription."
    }, 400);
  }

  const apiKey = env.BREVO_API_KEY;
  const listId = Number(env.BREVO_LIST_ID);

  if (!apiKey || !Number.isInteger(listId) || listId < 1) {
    console.error("Newsletter configuration is incomplete.");

    return json({
      success: false,
      error: "Newsletter sign-up is temporarily unavailable."
    }, 503);
  }

  try {
    const response = await fetch(
      "https://api.brevo.com/v3/contacts",
      {
        method: "POST",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "api-key": apiKey
        },
        body: JSON.stringify({
          email,
          listIds: [listId],
          updateEnabled: true
        })
      }
    );

    if (!response.ok) {
      const details = await response.text();

      console.error(
        "Brevo subscription error:",
        response.status,
        details
      );

      return json({
        success: false,
        error: "We couldn't add your email. Please try again."
      }, 502);
    }

    return json({
      success: true,
      message: "You're subscribed to WF Pundit updates. Thank you!"
    });

  } catch (error) {
    console.error("Newsletter connection error:", error);

    return json({
      success: false,
      error: "Connection problem. Please try again shortly."
    }, 502);
  }
}
