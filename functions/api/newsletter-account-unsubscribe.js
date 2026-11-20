import { currentUser, json, validOrigin } from "./_auth.js";

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) {
    return json({
      success: false,
      error: "Request could not be verified."
    }, 403);
  }

  try {
    const user = await currentUser(request, env);

    if (!user) {
      return json({
        success: false,
        error: "Please log in to manage your newsletter subscription."
      }, 401);
    }

    if (!env.BREVO_API_KEY || !env.BREVO_LIST_ID) {
      return json({
        success: false,
        error: "Newsletter service is temporarily unavailable."
      }, 500);
    }

    const listId = Number(env.BREVO_LIST_ID);

    if (!Number.isSafeInteger(listId) || listId < 1) {
      return json({
        success: false,
        error: "Newsletter configuration is invalid."
      }, 500);
    }

    const email = String(user.email || "").trim().toLowerCase();

    const headers = {
      "api-key": env.BREVO_API_KEY,
      "Content-Type": "application/json",
      "accept": "application/json"
    };

    const contactUrl =
      "https://api.brevo.com/v3/contacts/" +
      encodeURIComponent(email);

    const lookup = await fetch(contactUrl, {
      method: "GET",
      headers
    });

    if (lookup.status === 404) {
      return json({
        success: true,
        subscribed: false
      });
    }

    if (!lookup.ok) {
      throw new Error("Brevo lookup failed: " + await lookup.text());
    }

    const contact = await lookup.json();
    const lists = Array.isArray(contact.listIds)
      ? contact.listIds.map(Number)
      : [];

    if (lists.includes(listId)) {
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
      const confirmation = await fetch(
        "https://api.brevo.com/v3/smtp/email",
        {
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
                <p>Your account email has been removed from the WF Pundit newsletter list.</p>
                <p>You will no longer receive newsletter updates from us.</p>
                <strong>WF Pundit</strong>
              </div>
            `,
            textContent:
              "Your email has been removed from the WF Pundit newsletter list."
          })
        }
      );

      if (!confirmation.ok) {
        console.error(
          "Unsubscribe confirmation email failed:",
          await confirmation.text()
        );
      }
    } catch (emailError) {
      console.error("Unsubscribe confirmation email error:", emailError);
    }

    return json({
      success: true,
      subscribed: false
    });

  } catch (error) {
    console.error("Account newsletter unsubscribe error:", error);

    return json({
      success: false,
      error: "We couldn't complete your unsubscribe request. Please try again."
    }, 500);
  }
}
