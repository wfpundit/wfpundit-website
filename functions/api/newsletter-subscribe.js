
import {
  currentUser,
  json,
  readJson,
  validOrigin
} from "./_auth.js";
import {
  normalizeNewsletterPreferences,
  saveNewsletterSubscription
} from "./_newsletter.js";

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function createUnsubscribeToken(email, env) {
  const secret =
    env.NEWSLETTER_UNSUBSCRIBE_SECRET || env.BREVO_API_KEY;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const payload = toBase64Url(
    new TextEncoder().encode(JSON.stringify({
      email,
      exp: Math.floor(Date.now() / 1000) + 31536000
    }))
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );

  return payload + "." +
    toBase64Url(new Uint8Array(signature));
}

async function sendWelcomeEmail(email, firstName, unsubscribeUrl, env) {
  const safeName = escapeHtml(firstName || "there");
  const safeUnsubscribeUrl = escapeHtml(unsubscribeUrl);

  const html = `
  <!DOCTYPE html>
  <html>
  <body style="margin:0;padding:30px 12px;background:#f3f6fa;font-family:Arial,sans-serif;color:#172033">
    <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:12px;padding:28px">
      <div style="font-size:17px;font-weight:bold;letter-spacing:.2px">
        wf_pundit
        <span style="display:inline-block;background:#2878dc;color:#fff;border-radius:50%;width:17px;height:17px;line-height:17px;text-align:center;font-size:11px">✓</span>
      </div>

      <div style="height:3px;background:#2878dc;width:42px;margin:18px 0 24px"></div>

      <h2 style="margin:0 0 16px">Welcome to WF Pundit!</h2>

      <p>Hello ${safeName},</p>

      <p>Thank you for subscribing to WF Pundit.</p>

      <p>You're now on our newsletter list and will receive women's football news, updates and important stories by email.</p>

      <p>Thank you for being part of our community.</p>

      <p style="margin-top:28px">
        <strong>WF Pundit</strong><br>
        Women's football. Every story matters.
      </p>

      <hr style="border:0;border-top:1px solid #e5eaf1;margin:25px 0">

      <p style="font-size:12px;color:#718096">
        You received this email because you subscribed to WF Pundit.
        If you no longer wish to receive newsletter updates,
        <a href="${safeUnsubscribeUrl}" style="color:#2878dc">unsubscribe here</a>.
      </p>
    </div>
  </body>
  </html>`;

  const response = await fetch(
    "https://api.brevo.com/v3/smtp/email",
    {
      method: "POST",
      headers: {
        "api-key": env.BREVO_API_KEY,
        "Content-Type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        sender: {
          name: "WF Pundit",
          email: "allwomenfootballupdatespundits@gmail.com"
        },
        to: [{
          email,
          name: firstName || "Subscriber"
        }],
        subject: "Welcome to WF Pundit!",
        htmlContent: html,
        textContent:
          "Hello " + (firstName || "there") +
          ", thank you for subscribing to WF Pundit. " +
          "You will receive women's football news and updates by email. " +
          "Unsubscribe: " + unsubscribeUrl
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      "Brevo welcome email failed: " + await response.text()
    );
  }
}

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) {
    return json({
      success: false,
      error: "Request could not be verified."
    }, 403);
  }

  try {
    // Newsletter subscriptions are public: a reader does not need a WF Pundit account.
    const user = await currentUser(request, env);

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

    let data;

    try {
      data = await readJson(request);
    } catch {
      return json({
        success: false,
        error: "Please submit the form again."
      }, 400);
    }

    if (String(data.website || "").trim()) {
      return json({ success: true });
    }

    if (data.consent !== true) {
      return json({
        success: false,
        error: "Please confirm your newsletter subscription."
      }, 400);
    }

    const preferences = normalizeNewsletterPreferences(data);
    if (!preferences.valid) {
      return json({
        success: false,
        error: preferences.error
      }, 400);
    }

    // Use verified account details when the reader is logged in.
    // Otherwise accept the visitor's name and email from the public signup form.
    const submittedName = String(data.firstName || data.first_name || "").trim();
    const submittedEmail = String(data.email || "").trim().toLowerCase();
    const displayName = String(user?.display_name || submittedName).trim();
    const firstName = (displayName.split(/\s+/)[0] || "Reader").slice(0, 80);
    const email = String(user?.email || submittedEmail).trim().toLowerCase();

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return json({
        success: false,
        error: "Invalid email"
      }, 400);
    }

    const headers = {
      "api-key": env.BREVO_API_KEY,
      "Content-Type": "application/json",
      "accept": "application/json"
    };

    const contactUrl =
      "https://api.brevo.com/v3/contacts/" +
      encodeURIComponent(email);

    let existingContact = null;

    const lookup = await fetch(contactUrl, {
      method: "GET",
      headers
    });

    if (lookup.ok) {
      existingContact = await lookup.json();
    } else if (lookup.status !== 404) {
      throw new Error(
        "Brevo contact lookup failed: " + await lookup.text()
      );
    }

    let alreadySubscribed = false;

    if (existingContact) {
      const currentLists = Array.isArray(existingContact.listIds)
        ? existingContact.listIds.map(Number)
        : [];

      alreadySubscribed = currentLists.includes(listId);

      if (!alreadySubscribed && existingContact.emailBlacklisted) {
        return json({
          success: false,
          error: "This email cannot currently be subscribed. Please contact us."
        }, 409);
      }

      if (!alreadySubscribed) {
        const update = await fetch(contactUrl, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            attributes: {
              FIRSTNAME: firstName
            },
            listIds: [listId]
          })
        });

        if (!update.ok) {
          throw new Error(
            "Brevo contact update failed: " + await update.text()
          );
        }
      }

    } else {
      const create = await fetch(
        "https://api.brevo.com/v3/contacts",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            email,
            attributes: {
              FIRSTNAME: firstName
            },
            listIds: [listId],
            updateEnabled: false
          })
        }
      );

      if (!create.ok) {
        throw new Error(
          "Brevo contact creation failed: " + await create.text()
        );
      }
    }

    // D1 is the source of truth for guest and registered reader preferences.
    await saveNewsletterSubscription(env, {
      email,
      firstName,
      accountId: user?.id || null,
      preferences
    });

    const token = await createUnsubscribeToken(email, env);

    const unsubscribeUrl = new URL(
      "/api/newsletter-unsubscribe?token=" +
      encodeURIComponent(token),
      new URL(request.url).origin
    ).toString();

    let welcomeEmailSent = false;

    // Do not resend the welcome message when an existing subscriber
    // simply updates their newsletter preferences.
    if (!alreadySubscribed) {
      try {
        await sendWelcomeEmail(
          email,
          firstName,
          unsubscribeUrl,
          env
        );

        welcomeEmailSent = true;
      } catch (emailError) {
        console.error(
          "Newsletter welcome email error:",
          emailError
        );
      }
    }

    return json({
      success: true,
      alreadySubscribed,
      welcomeEmailSent
    });

  } catch (error) {
    console.error("Newsletter subscription error:", error);

    return json({
      success: false,
      error: "Subscription could not be completed. Please try again."
    }, 500);
  }
}
