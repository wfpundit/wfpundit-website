
import { json, readJson, validOrigin } from "./_auth.js";

const SENDER_NAME = "WF Pundit";
const SENDER_EMAIL = "allwomenfootballupdatespundits@gmail.com";

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

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

  const firstName = String(data.firstName || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const email = String(data.email || "")
    .trim()
    .toLowerCase();

  if (!firstName || firstName.length > 100) {
    return json({
      success: false,
      error: "Please enter a valid first name."
    }, 400);
  }

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
    // 1. Save subscriber in Brevo
    const contactResponse = await fetch(
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
          updateEnabled: true,
          attributes: {
            FIRSTNAME: firstName
          }
        })
      }
    );

    if (!contactResponse.ok) {
      const details = await contactResponse.text();

      console.error(
        "Brevo contact error:",
        contactResponse.status,
        details
      );

      return json({
        success: false,
        error: "We couldn't add your email. Please try again."
      }, 502);
    }

    // 2. Prepare personalised thank-you email
    const safeName = escapeHtml(firstName);

    const htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:25px;color:#172337;">
        <h2 style="color:#2869b3;">Welcome to WF Pundit!</h2>

        <p>Hi ${safeName},</p>

        <p>
          Thank you for subscribing to the WF Pundit newsletter.
          We're delighted to have you with us.
        </p>

        <p>
          You'll receive women's football news, important updates,
          match stories and the latest developments from the game.
        </p>

        <p>Thank you for being part of our community.</p>

        <p style="font-weight:bold;">WF Pundit</p>
        <p style="color:#667085;font-size:12px;">
          Women's football. Every story matters.
        </p>
      </div>
    `;

    const textContent =
      `Hi ${firstName},\n\n` +
      "Thank you for subscribing to the WF Pundit newsletter.\n\n" +
      "You'll receive women's football news, important updates, " +
      "match stories and the latest developments from the game.\n\n" +
      "Thank you for being part of our community.\n\n" +
      "WF Pundit\n" +
      "Women's football. Every story matters.";

    // 3. Send thank-you email through Brevo
    let welcomeEmailSent = false;

    try {
      const emailResponse = await fetch(
        "https://api.brevo.com/v3/smtp/email",
        {
          method: "POST",
          headers: {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": apiKey
          },
          body: JSON.stringify({
            sender: {
              name: SENDER_NAME,
              email: SENDER_EMAIL
            },
            to: [
              {
                email,
                name: firstName
              }
            ],
            subject: "Thank you for subscribing to WF Pundit!",
            htmlContent,
            textContent
          })
        }
      );

      if (!emailResponse.ok) {
        const details = await emailResponse.text();

        console.error(
          "Brevo welcome email error:",
          emailResponse.status,
          details
        );
      } else {
        welcomeEmailSent = true;
      }

    } catch (emailError) {
      console.error(
        "Welcome email connection error:",
        emailError
      );
    }

    // 4. Confirm successful subscription
    return json({
      success: true,
      welcomeEmailSent,
      message: welcomeEmailSent
        ? `Thanks, ${firstName}! You're subscribed. Check your inbox for our welcome email.`
        : `Thanks, ${firstName}! You're subscribed to WF Pundit updates.`
    });

  } catch (error) {
    console.error("Newsletter connection error:", error);

    return json({
      success: false,
      error: "Connection problem. Please try again shortly."
    }, 502);
  }
}
