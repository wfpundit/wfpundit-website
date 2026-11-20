
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function authorised(request, env) {
  const token = request.headers.get("Authorization");
  return Boolean(env.ADMIN_TOKEN && token === "Bearer " + env.ADMIN_TOKEN);
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

function messageToHtml(message) {
  return escapeHtml(message)
    .split(/\r?\n/)
    .map(line => line ? line : "&nbsp;")
    .join("<br>");
}

function buildEmailHtml(message, buttons) {
  const buttonHtml = buttons.map(button =>
    '<div style="margin:12px 0;text-align:center">' +
    '<a href="' + escapeHtml(button.url) + '" style="display:inline-block;padding:13px 22px;background:#2878dc;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;border-radius:7px">' +
    escapeHtml(button.text) +
    '</a></div>'
  ).join("");

  return [
    '<!DOCTYPE html><html lang="en">',
    '<body style="margin:0;padding:24px 12px;background:#f3f6fa;font-family:Arial,sans-serif;color:#172033">',
    '<main style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5eaf1;border-radius:12px;padding:28px">',
    '<div style="font-size:19px;font-weight:900;letter-spacing:-.3px;color:#172033">wf_pundit <span style="display:inline-block;background:#2878dc;color:#fff;border-radius:50%;width:17px;height:17px;line-height:17px;text-align:center;font-size:11px">✓</span></div>',
    '<div style="height:3px;width:42px;background:#2878dc;margin:18px 0 24px"></div>',
    '<div style="font-size:15px;line-height:1.85;color:#344256;overflow-wrap:anywhere">' + messageToHtml(message) + '</div>',
    buttons.length ? '<div style="margin:20px 0 8px">' + buttonHtml + '</div>' : '',
    '<div style="border-top:1px solid #e5eaf1;margin-top:28px;padding-top:18px;color:#718096;font-size:12px;line-height:1.7"><strong style="color:#172033">WF Pundit</strong><br>Women&#39;s football. Every story matters.</div>',
    '<div style="margin-top:22px;padding-top:14px;border-top:1px solid #e5eaf1;text-align:center;font-size:12px;color:#718096">',
    '<a href="{{ unsubscribe }}" style="color:#2878dc;text-decoration:underline">Unsubscribe from WF Pundit newsletter</a>',
    '</div>',
    '</main></body></html>'
  ].join("");
}

export async function onRequestPost({ request, env }) {
  if (!authorised(request, env)) {
    return json({ success: false, error: "Unauthorised." }, 401);
  }

  const origin = request.headers.get("Origin");

  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return json({
          success: false,
          error: "Request could not be verified."
        }, 403);
      }
    } catch {
      return json({
        success: false,
        error: "Request could not be verified."
      }, 403);
    }
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

  let data;

  try {
    const length = Number(request.headers.get("Content-Length") || 0);

    if (length > 26000) {
      return json({
        success: false,
        error: "The newsletter message is too large."
      }, 413);
    }

    data = await request.json();

  } catch {
    return json({
      success: false,
      error: "Please enter a valid newsletter message."
    }, 400);
  }

  const subject = String(data.subject || "").trim();
  const message = String(data.message || "").trim();
  const rawButtons = data.buttons === undefined ? [] : data.buttons;

  if (!Array.isArray(rawButtons) || rawButtons.length > 3) {
    return json({
      success: false,
      error: "You can add a maximum of three newsletter buttons."
    }, 400);
  }

  const buttons = [];

  for (let i = 0; i < rawButtons.length; i++) {
    const item = rawButtons[i] || {};
    const buttonText = String(item.text || "").trim();
    const buttonUrl = String(item.url || "").trim();

    if (
      !buttonText ||
      !buttonUrl ||
      buttonText.length > 40 ||
      buttonUrl.length > 2048
    ) {
      return json({
        success: false,
        error: "Each button needs text (up to 40 characters) and a valid link."
      }, 400);
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(buttonUrl);
    } catch {
      return json({
        success: false,
        error: "Button " + (i + 1) + " has an invalid link."
      }, 400);
    }

    if (parsedUrl.protocol !== "https:") {
      return json({
        success: false,
        error: "Button " + (i + 1) + " link must use HTTPS."
      }, 400);
    }

    buttons.push({
      text: buttonText,
      url: parsedUrl.href
    });
  }

  if (subject.length < 3 || subject.length > 150) {
    return json({
      success: false,
      error: "The subject must be between 3 and 150 characters."
    }, 400);
  }

  if (message.length < 5 || message.length > 15000) {
    return json({
      success: false,
      error: "The message must be between 5 and 15,000 characters."
    }, 400);
  }

  const headers = {
    "api-key": env.BREVO_API_KEY,
    "Content-Type": "application/json",
    "accept": "application/json"
  };

  const campaignName = "WF Pundit Newsletter - " + new Date().toISOString();

  try {
    const createResponse = await fetch(
      "https://api.brevo.com/v3/emailCampaigns",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: campaignName,
          subject,
          sender: {
            name: "WF Pundit",
            email: "allwomenfootballupdatespundits@gmail.com"
          },
          replyTo: "allwomenfootballupdatespundits@gmail.com",
          recipients: {
            listIds: [listId]
          },
          previewText: message.replace(/\s+/g, " ").slice(0, 140),
          htmlContent: buildEmailHtml(message, buttons),
          header: "[DEFAULT_HEADER]",
          footer: "[DEFAULT_FOOTER]",
          tag: "WF Pundit Newsletter"
        })
      }
    );

    if (!createResponse.ok) {
      const detail = await createResponse.text();
      console.error("Brevo campaign creation failed:", detail);

      return json({
        success: false,
        error: "Brevo could not create the newsletter campaign. Check that the WF Pundit sender is approved for campaigns in Brevo."
      }, 502);
    }

    const campaign = await createResponse.json();
    const campaignId = Number(campaign.id);

    if (!Number.isSafeInteger(campaignId) || campaignId < 1) {
      console.error("Brevo returned an invalid campaign response:", campaign);

      return json({
        success: false,
        error: "Brevo created a campaign but did not return a valid campaign ID. Check Brevo before trying again."
      }, 502);
    }

    const sendResponse = await fetch(
      "https://api.brevo.com/v3/emailCampaigns/" + campaignId + "/sendNow",
      {
        method: "POST",
        headers
      }
    );

    if (!sendResponse.ok) {
      const detail = await sendResponse.text();
      console.error("Brevo send-now failed:", detail);

      return json({
        success: false,
        campaignCreated: true,
        campaignId,
        error: "The campaign was created as a draft, but Brevo did not accept the send request. Open Brevo to review campaign " + campaignId + " before trying again."
      }, 502);
    }

    return json({
      success: true,
      campaignId,
      message: "Newsletter submitted to Brevo."
    });

  } catch (error) {
    console.error("Admin newsletter send failed:", error);

    return json({
      success: false,
      error: "The newsletter service could not be reached. Check Brevo before retrying to avoid sending a duplicate."
    }, 502);
  }
}
