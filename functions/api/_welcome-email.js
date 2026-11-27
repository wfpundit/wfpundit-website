const SITE_URL = "https://wfpundit.pages.dev";

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

export async function sendWelcomeEmail(env, email, displayName) {
  if (!env.RESEND_API_KEY) return;

  const firstName = String(displayName || "").trim().split(/\s+/)[0] || "there";
  const safeName = escapeHtml(firstName);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL || "WF Pundit <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to WF Pundit — your account is ready",
      html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Welcome to WF Pundit</title>
</head>
<body style="margin:0;padding:0;background:#edf2f7;font-family:Arial,Helvetica,sans-serif;color:#15263b;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Your WF Pundit account is ready. Get closer to every story in women's football.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#edf2f7;padding:34px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 38px rgba(18,39,64,.10);">
        <tr><td style="height:5px;background:#d9ad62;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:30px 36px 28px;background:#0b1b2d;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr><td align="left">
              <div style="font-size:27px;line-height:1;font-weight:900;letter-spacing:-1.2px;color:#ffffff;">WF PUNDIT</div>
              <div style="margin-top:9px;font-size:10px;line-height:1.5;font-weight:700;letter-spacing:2.1px;color:#b9cbe0;">WOMEN'S FOOTBALL. EVERY STORY MATTERS.</div>
            </td><td align="right" valign="middle">
              <span style="display:inline-block;padding:7px 10px;border:1px solid #49627d;border-radius:20px;color:#d9ad62;font-size:9px;line-height:1;font-weight:700;letter-spacing:1.2px;">WELCOME</span>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:38px 36px 16px;">
          <div style="font-size:10px;line-height:1.4;font-weight:700;letter-spacing:2px;color:#a77b35;">YOUR PLACE IN THE GAME STARTS HERE</div>
          <h1 style="margin:13px 0 16px;font-size:32px;line-height:1.18;letter-spacing:-.8px;color:#10243a;">Welcome to WF Pundit, ${safeName}.</h1>
          <p style="margin:0 0 17px;font-size:15px;line-height:1.8;color:#526276;">Your account is ready. We're delighted to have you in a community that follows the stories, people and moments shaping women's football.</p>
          <p style="margin:0;font-size:15px;line-height:1.8;color:#526276;">From the biggest matchdays to the conversations beyond the pitch, WF Pundit is here to keep you connected to the game.</p>
        </td></tr>
        <tr><td style="padding:22px 36px 8px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f6fa;border:1px solid #e3eaf2;border-radius:12px;">
            <tr><td style="padding:20px 21px;">
              <div style="font-size:10px;line-height:1.4;font-weight:700;letter-spacing:1.7px;color:#a77b35;">THE LATEST, DELIVERED</div>
              <div style="margin-top:8px;font-size:18px;line-height:1.35;font-weight:700;color:#142a43;">Make sure you never miss a story.</div>
              <p style="margin:8px 0 0;font-size:13px;line-height:1.7;color:#607187;">Choose to receive our newsletter for selected headlines and updates in your inbox. It's completely optional, and creating an account has not subscribed you automatically.</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:22px 36px 34px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr><td align="center" bgcolor="#1e65a5" style="border-radius:7px;box-shadow:0 5px 12px rgba(30,101,165,.18);">
              <a href="${SITE_URL}/#about" style="display:inline-block;padding:16px 24px;color:#ffffff;text-decoration:none;font-size:11px;line-height:1;font-weight:700;letter-spacing:1.3px;">EXPLORE THE NEWSLETTER&nbsp; &rarr;</a>
            </td></tr>
          </table>
          <p style="margin:25px 0 0;font-size:13px;line-height:1.75;color:#68798d;">Thanks for being part of the WF Pundit community. Here's to a season full of stories worth talking about.</p>
          <p style="margin:17px 0 0;font-size:13px;line-height:1.6;font-weight:700;color:#18324e;">The WF Pundit Team</p>
        </td></tr>
        <tr><td style="padding:19px 36px;background:#0b1b2d;border-top:1px solid #263c54;">
          <div style="font-size:10px;line-height:1.7;color:#9db0c5;">WF PUNDIT</div>
          <div style="margin-top:4px;font-size:10px;line-height:1.7;color:#71869d;">WOMEN'S FOOTBALL. EVERY STORY MATTERS.</div>
        </td></tr>
      </table>
      <div style="max-width:580px;padding:16px 8px 0;font-size:10px;line-height:1.6;text-align:center;color:#8291a2;">You received this email because an account was created with your email address on WF Pundit.</div>
    </td></tr>
  </table>
</body>
</html>`,
      text: `Welcome to WF Pundit, ${firstName}. Your account is ready. We're delighted to have you in a community that follows the stories, people and moments shaping women's football. You can choose to subscribe to our newsletter at any time; account registration does not subscribe you automatically. Explore the newsletter: ${SITE_URL}/#about

The WF Pundit Team
Women's football. Every story matters.`
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("WF Pundit welcome email failed:", response.status, detail.slice(0, 500));
  }
}
