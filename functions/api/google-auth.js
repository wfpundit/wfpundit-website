
import { json, validOrigin, readJson, hashPassword, createSession } from "./_auth.js";

const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function readCookie(request, name) {
  const cookies = request.headers.get("Cookie") || "";
  for (const part of cookies.split(";")) {
    const index = part.indexOf("=");
    if (index >= 0 && part.slice(0, index).trim() === name) {
      return part.slice(index + 1).trim();
    }
  }
  return "";
}

async function verifyGoogleCredential(token, clientId) {
  if (typeof token !== "string" || token.length > 10000) {
    throw new Error("Google sign-in could not be verified.");
  }

  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Google sign-in could not be verified.");

  let header;
  let payload;

  try {
    header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
    payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));
  } catch {
    throw new Error("Google sign-in could not be verified.");
  }

  if (header.alg !== "RS256" || typeof header.kid !== "string") {
    throw new Error("Google sign-in could not be verified.");
  }

  const response = await fetch(GOOGLE_CERTS_URL);

  if (!response.ok) {
    throw new Error("Google sign-in is temporarily unavailable.");
  }

  const certs = await response.json();
  const jwk = (certs.keys || []).find(
    key => key.kid === header.kid && key.alg === "RS256"
  );

  if (!jwk) throw new Error("Google sign-in could not be verified.");

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signingInput = new TextEncoder().encode(parts[0] + "." + parts[1]);

  const validSignature = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    decodeBase64Url(parts[2]),
    signingInput
  );

  const now = Math.floor(Date.now() / 1000);

  const issuerValid =
    payload.iss === "https://accounts.google.com" ||
    payload.iss === "accounts.google.com";

  if (
    !validSignature ||
    !issuerValid ||
    payload.aud !== clientId ||
    !payload.sub ||
    !payload.email ||
    payload.email_verified !== true ||
    !Number.isFinite(payload.exp) ||
    payload.exp <= now ||
    (payload.iat && payload.iat > now + 60)
  ) {
    throw new Error("Google sign-in could not be verified.");
  }

  return {
    googleSub: String(payload.sub),
    email: String(payload.email).trim().toLowerCase(),
    displayName:
      typeof payload.name === "string"
        ? payload.name.trim().slice(0, 80)
        : ""
  };
}

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) {
    return json({ error: "Request not allowed." }, 403);
  }

  if (!env.GOOGLE_CLIENT_ID) {
    return json({ error: "Google sign-in is not configured yet." }, 503);
  }

  let body;

  try {
    body = await readJson(request);
  } catch (error) {
    return json({ error: error.message || "Please try again." }, 400);
  }

  const origin = request.headers.get("Origin");

if (!origin || origin !== new URL(request.url).origin) {
  return json({
    error: "Google security check failed. Please refresh and try again."
  }, 403);
}

  

  const mode = body.mode === "register" ? "register" : "login";

  let identity;

  try {
    identity = await verifyGoogleCredential(
      body.credential,
      env.GOOGLE_CLIENT_ID
    );
  } catch (error) {
    return json({
      error: error.message || "Google sign-in could not be verified."
    }, 401);
  }

  try {
    let user = await env.DB.prepare(
      "SELECT id, email, display_name FROM reader_accounts WHERE google_sub = ? LIMIT 1"
    ).bind(identity.googleSub).first();

    if (!user) {
      const emailUser = await env.DB.prepare(
        "SELECT id FROM reader_accounts WHERE lower(email) = ? LIMIT 1"
      ).bind(identity.email).first();

      if (emailUser) {
        return json({
          error: "An account already uses this email. Sign in with your password first; Google has not been linked."
        }, 409);
      }

      if (mode !== "register") {
        return json({
          error: "No Google account is linked yet. Please use Sign up with Google first."
        }, 404);
      }

      const randomSecret = Array.from(
        crypto.getRandomValues(new Uint8Array(32))
      ).map(byte => byte.toString(16).padStart(2, "0")).join("");

      const passwordHash = await hashPassword(randomSecret);

      const result = await env.DB.prepare(`
        INSERT INTO reader_accounts
          (email, password_hash, display_name, email_verified_at, google_sub)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        identity.email,
        passwordHash,
        identity.displayName || identity.email.split("@")[0],
        new Date().toISOString(),
        identity.googleSub
      ).run();

      user = {
        id: result.meta.last_row_id,
        email: identity.email,
        display_name: identity.displayName || identity.email.split("@")[0]
      };
    }

    const session = await createSession(user.id, env);

    return json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name || ""
      }
    }, 200, {
      "Set-Cookie": session.cookie
    });

  } catch (error) {
    return json({
      error: "Google sign-in could not be completed. Please try again."
    }, 500);
  }
}
