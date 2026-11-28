const BRAND = "WF Pundit";
const SUPPORT_EMAIL = "support@wfpundit.uk";
const SITE_URL = "https://wfpundit.uk";

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function decodeMimeWords(value) {
  return String(value || "").replace(/=?UTF-8?([BQ])\?([^?]+)\?=/gi, (match, encoding, data) => {
    try {
      if (encoding.toUpperCase() === "B") {
        const binary = atob(data);
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        return new TextDecoder("utf-8").decode(bytes);
      }
      const bytes = data.replace(/_/g, " ").replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      return new TextDecoder("utf-8").decode(Uint8Array.from(bytes, (char) => char.charCodeAt(0)));
    } catch {
      return "";
    }
  });
}

function getFirstName(fromHeader) {
  const decoded = decodeMimeWords(fromHeader);
  const match = decoded.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>/);
  if (!match) return "";
  const displayName = match[1].replace(/^['"]|['"]$/g, "").trim();
  const firstName = displayName.split(/\s+/)[0].replace(/[^\p{L}\p{M}'’-]/gu, "");
  return firstName.length >= 2 && firstName.length <= 40 ? firstName : "";
}

function shouldSkipAutoReply(message, env) {
  const headers = message.headers;
  const from = String(message.from || "").toLowerCase();
  const autoSubmitted = String(headers?.get("auto-submitted") || "").toLowerCase();
  const precedence = String(headers?.get("precedence") || "").toLowerCase();
  const fromHeader = String(headers?.get("from") || "");
  return (
    !from ||
    from === SUPPORT_EMAIL ||
    from.includes("no-reply") ||
    from.includes("noreply") ||
    from.includes("mailer-daemon") ||
    from.includes("postmaster") ||
    autoSubmitted && autoSubmitted !== "no" ||
    /bulk|list|junk/.test(precedence) ||
    headers?.has("list-id") ||
    headers?.has("list-unsubscribe") ||
    headers?.has("x-autoreply") ||
    headers?.has("x-auto-response-suppress") ||
    /mailer-daemon|postmaster/i.test(fromHeader)
  );
}

function buildEmail(firstName) {
  const greeting = firstName ? `Hello ${escapeHtml(firstName)},` : "Hello there,";
  const html = `
  <!doctype html><html><body style="margin:0;padding:24px 12px;background:#f2f5f9;font-family:Arial,Helvetica,sans-serif;color:#26364d">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden">
      <tr><td style="padding:30px 24px;text-align:center;background:#101d35">
        <div style="font-size:25px;line-height:1.2;font-weight:800;letter-spacing:2px;color:#ffffff">WF PUNDIT</div>
        <div style="margin-top:10px"><span style="display:inline-block;padding:6px 11px;border:1px solid #426b9d;border-radius:20px;color:#dceaff;font-size:10px;font-weight:700;letter-spacing:1.5px">READER SUPPORT</span></div>
        <div style="margin-top:9px;color:#b9cce5;font-size:10px;letter-spacing:1.4px">THE HOME OF WOMEN'S FOOTBALL</div>
      </td></tr>
      <tr><td style="padding:34px 32px 12px">
        <div style="font-size:25px;line-height:1.3;font-weight:700;color:#14233d">We've got your message.</div>
        <p style="margin:22px 0 14px;font-size:15px;line-height:1.7">${greeting}</p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.75">Thank you for reaching out to <strong>WF Pundit</strong>. Your message has safely reached our support team, and we appreciate you taking the time to contact us.</p>
        <div style="padding:20px 21px;background:#f1f6fc;border-left:3px solid #3478c9;border-radius:8px">
          <div style="font-size:11px;font-weight:800;letter-spacing:1.3px;color:#245b9e">WHAT HAPPENS NEXT?</div>
          <p style="margin:9px 0 0;font-size:14px;line-height:1.7;color:#526176">Our team will review your message. If a personal response is needed, we'll get back to you as soon as possible.</p>
        </div>
        <p style="margin:23px 0 18px;font-size:15px;line-height:1.75">Whether you're sharing feedback, submitting a review, reporting an issue, suggesting a story or making an enquiry, we value hearing from you.</p>
        <p style="margin:0 0 26px;font-size:14px;line-height:1.7;color:#526176">Thank you for being part of our growing women's football community.</p>
        <div style="font-size:17px;font-weight:800;letter-spacing:1.4px;color:#14233d">WF PUNDIT</div>
        <div style="margin-top:5px;font-size:13px;color:#65748a">Reader Support Team</div>
        <p style="margin:15px 0 0;font-size:13px;line-height:1.8"><a href="mailto:support@wfpundit.uk" style="color:#2463b5;text-decoration:none">support@wfpundit.uk</a><br><a href="${SITE_URL}" style="color:#2463b5;text-decoration:none">wfpundit.uk</a></p>
      </td></tr>
      <tr><td style="padding:18px 24px;text-align:center;background:#101d35;color:#d6e5f8;font-size:11px;line-height:1.6">Independent coverage. A stronger voice for women's football.</td></tr>
    </table>
  </body></html>`;
  const text = `${firstName ? `Hello ${firstName},` : "Hello there,"}

Thank you for reaching out to WF Pundit. Your message has safely reached our support team, and we appreciate you taking the time to contact us.

WHAT HAPPENS NEXT?
Our team will review your message. If a personal response is needed, we'll get back to you as soon as possible.

Whether you're sharing feedback, submitting a review, reporting an issue, suggesting a story or making an enquiry, we value hearing from you.

Thank you for being part of our growing women's football community.

WF PUNDIT
Reader Support Team
support@wfpundit.uk
https://wfpundit.uk

Independent coverage. A stronger voice for women's football.`;
  return { html, text };
}

async function makeDedupeKey(message) {
  const messageId = String(message.headers?.get("message-id") || "").trim();
  const source = messageId || [message.from, message.headers?.get("date"), message.headers?.get("subject"), message.rawSize].join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return "support-auto-reply:" + Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default {
  async email(message, env, ctx) {
    if (!env.FORWARD_TO) {
      message.setReject("Support forwarding is not configured.");
      return;
    }

    // Preserve the existing Gmail delivery before attempting the acknowledgement.
    await message.forward(env.FORWARD_TO);

    if (shouldSkipAutoReply(message, env)) return;
    if (!env.RESEND_API_KEY || !env.REPLY_DEDUPE) {
      console.error("Support auto-reply is not configured: missing RESEND_API_KEY or REPLY_DEDUPE.");
      return;
    }

    const dedupeKey = await makeDedupeKey(message);
    if (await env.REPLY_DEDUPE.get(dedupeKey)) return;

    const firstName = getFirstName(message.headers?.get("from") || "");
    const email = buildEmail(firstName);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "WF Pundit Support <support@wfpundit.uk>",
        to: [message.from],
        reply_to: SUPPORT_EMAIL,
        subject: "We've received your message | WF Pundit",
        html: email.html,
        text: email.text
      })
    });

    if (!response.ok) {
      console.error("Resend support acknowledgement failed:", response.status, (await response.text()).slice(0, 500));
      return;
    }

    await env.REPLY_DEDUPE.put(dedupeKey, "sent", { expirationTtl: 60 * 60 * 24 * 30 });
  }
};
