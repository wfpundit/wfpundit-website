
import { json, validOrigin } from "./_auth.js";
import { markNewsletterUnsubscribed } from "./_newsletter.js";

function html(content, status = 200) {
  return new Response(content, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
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

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function verifyToken(token, env) {
  try {
    if (typeof token !== "string" || token.length > 2000) return null;

    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const secret = env.NEWSLETTER_UNSUBSCRIBE_SECRET || env.BREVO_API_KEY;
    if (!secret) return null;

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(parts[1]),
      new TextEncoder().encode(parts[0])
    );

    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(parts[0]))
    );

    if (
      typeof payload.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email) ||
      !Number.isFinite(payload.exp) ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function page(title, message, token = "") {
  const tokenField = token
    ? `<input type="hidden" name="token" value="${escapeHtml(token)}">`
    : "";

  const button = token
    ? `<form method="POST" action="/api/newsletter-unsubscribe">
         ${tokenField}
         <button type="submit">Confirm unsubscribe</button>
       </form>`
    : "";

  return html(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} | WF Pundit</title>
<style>
body{margin:0;background:#f3f6fa;color:#172033;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:20px;box-sizing:border-box}
main{background:#fff;max-width:480px;width:100%;padding:32px;border-radius:12px;box-sizing:border-box}
.brand{font-weight:bold;font-size:19px}
.verified{display:inline-grid;place-items:center;background:#2878dc;color:#fff;border-radius:50%;width:17px;height:17px;font-size:11px}
h1{font-size:25px;margin-top:28px}
p{line-height:1.7;color:#526078}
button{border:0;background:#2878dc;color:white;padding:13px 20px;border-radius:6px;font-weight:bold;cursor:pointer}
</style>
</head>
<body>
<main>
<div class="brand">wf_pundit <span class="verified">✓</span></div>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(message)}</p>
${button}
<p><a href="/" style="color:#2878dc">Return to WF Pundit</a></p>
</main>
</body>
</html>`);
}

export async function onRequestGet({ request, env }) {
  const token = new URL(request.url).searchParams.get("token");
  const payload = await verifyToken(token, env);

  if (!payload) {
    return page(
      "Unsubscribe link invalid",
      "This link is invalid or has expired. Please contact WF Pundit for assistance.",
      ""
    );
  }

  return page(
    "Unsubscribe from WF Pundit",
    "Are you sure you want to stop receiving WF Pundit newsletter emails?",
    token
  );
}

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) {
    return json({
      success: false,
      error: "Request could not be verified."
    }, 403);
  }

  if (!env.BREVO_API_KEY || !env.BREVO_LIST_ID) {
    return page(
      "Unable to unsubscribe",
      "The newsletter service is temporarily unavailable. Please try again later."
    );
  }

  const listId = Number(env.BREVO_LIST_ID);

  if (!Number.isSafeInteger(listId) || listId < 1) {
    return page(
      "Unable to unsubscribe",
      "The newsletter service is temporarily unavailable."
    );
  }

  let form;

  try {
    form = await request.formData();
  } catch {
    return page("Invalid request", "Please use the unsubscribe link in your email.");
  }

  const token = String(form.get("token") || "");
  const payload = await verifyToken(token, env);

  if (!payload) {
    return page(
      "Unsubscribe link invalid",
      "This link is invalid or has expired. Please contact WF Pundit for assistance."
    );
  }

  const email = payload.email.toLowerCase();
  await markNewsletterUnsubscribed(env, email);

  const headers = {
    "api-key": env.BREVO_API_KEY,
    "Content-Type": "application/json",
    "accept": "application/json"
  };

  try {
    const contactUrl =
      "https://api.brevo.com/v3/contacts/" +
      encodeURIComponent(email);

    const lookup = await fetch(contactUrl, {
      method: "GET",
      headers
    });

    if (lookup.status === 404) {
      return page(
        "Unsubscribe complete",
        "This email address is no longer on the WF Pundit newsletter list."
      );
    }

    if (!lookup.ok) {
      throw new Error("Brevo contact lookup failed: " + await lookup.text());
    }

    const contact = await lookup.json();
    const currentLists = Array.isArray(contact.listIds)
      ? contact.listIds.map(Number)
      : [];

    if (currentLists.includes(listId)) {
      const update = await fetch(contactUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          unlinkListIds: [listId]
        })
      });

      if (!update.ok) {
        throw new Error("Brevo unsubscribe failed: " + await update.text());
      }
    }

    try {
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers,
        body: JSON.stringify({
          sender: {
            name: "WF Pundit",
            email: "allwomenfootballupdatespundits@gmail.com"
          },
          to: [{ email }],
          subject: "WF Pundit newsletter unsubscribe confirmation",
          htmlContent: `
            <div style="font-family:Arial,sans-serif;line-height:1.7;color:#172033">
              <strong>wf_pundit <span style="color:#2878dc">✓</span></strong>
              <h2>Unsubscribe confirmed</h2>
              <p>Your email address has been removed from the WF Pundit newsletter list.</p>
              <p>You will no longer receive newsletter updates from this list.</p>
              <p>Thank you for being part of our community.</p>
              <strong>WF Pundit</strong>
            </div>
          `,
          textContent:
            "Your email address has been removed from the WF Pundit newsletter list. Thank you for being part of our community."
        })
      });
    } catch (emailError) {
      console.error("Unsubscribe confirmation email failed:", emailError);
    }

    return page(
      "Unsubscribe complete",
      "Your email address has been removed from the WF Pundit newsletter list. You will no longer receive newsletter updates from us."
    );

  } catch (error) {
    console.error("Newsletter unsubscribe error:", error);

    return page(
      "Unable to unsubscribe",
      "We couldn't complete your request right now. Please try again later."
    );
  }
}
