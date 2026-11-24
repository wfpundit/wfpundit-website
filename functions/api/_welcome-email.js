const SITE_URL = "https://wfpundit.pages.dev";
function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}
export async function sendWelcomeEmail(env, email, displayName) {
  if (!env.RESEND_API_KEY) return;
  const firstName = String(displayName || "").trim().split(/\\s+/)[0] || "there";
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
      subject: "Welcome to WF Pundit",
      html: `<!doctype html><html><body style="margin:0;padding:32px 12px;background:#081321;font-family:Arial,Helvetica,sans-serif;color:#edf4fc"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#101f32;border:1px solid #29415e;border-radius:16px;overflow:hidden"><tr><td style="padding:30px 34px 24px;background:linear-gradient(120deg,#183858,#101f32);border-bottom:1px solid #35516f"><div style="font-size:25px;font-weight:900;letter-spacing:-1px;color:#fff">WF PUNDIT</div><div style="margin-top:7px;color:#b9d8f8;font-size:10px;font-weight:bold;letter-spacing:2px">WOMEN'S FOOTBALL. EVERY STORY MATTERS.</div></td></tr><tr><td style="padding:34px"><div style="color:#e0bd7c;font-size:11px;font-weight:bold;letter-spacing:2px">WELCOME TO THE COMMUNITY</div><h1 style="margin:12px 0 16px;color:#fff;font-size:29px;line-height:1.2">Your account is ready, ${safeName}.</h1><p style="margin:0 0 18px;color:#d0dbea;font-size:15px;line-height:1.8">Thank you for joining WF Pundit. Your account gives you a place to follow the stories, conversations and developments shaping women's football.</p><p style="margin:0 0 26px;color:#d0dbea;font-size:15px;line-height:1.8">Want the latest headlines delivered by email? You can choose to subscribe to our newsletter at any time. Newsletter sign-up is optional and is not enabled automatically with your account.</p><table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:7px;background:#3978c8"><a href="${SITE_URL}/#about" style="display:inline-block;padding:14px 22px;color:#fff;text-decoration:none;font-size:12px;font-weight:bold;letter-spacing:1px">EXPLORE THE NEWSLETTER</a></td></tr></table><p style="margin:30px 0 0;color:#8fa5bf;font-size:12px;line-height:1.7">Thank you for being part of WF Pundit.<br><strong style="color:#dce9f8">Women’s football. Every story matters.</strong></p></td></tr><tr><td style="padding:18px 34px;border-top:1px solid #29415e;color:#8298b2;font-size:11px">WF Pundit · <a href="${SITE_URL}" style="color:#9fc5ed;text-decoration:none">wfpundit.pages.dev</a></td></tr></table></td></tr></table></body></html>`,
      text: `Welcome to WF Pundit, ${firstName}. Your account is ready. Thank you for joining our women's football community. Newsletter subscription is optional and is not enabled automatically. Explore the newsletter: ${SITE_URL}/#about`
    })
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("WF Pundit welcome email failed:", response.status, detail.slice(0, 500));
  }
}
