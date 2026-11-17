
const SESSION_COOKIE = "wf_reader_session";
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100000;

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

export function validOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function readJson(request) {
  if (!(request.headers.get("Content-Type") || "").toLowerCase().includes("application/json")) {
    throw new Error("Please submit the form again.");
  }
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 10000) throw new Error("Request is too large.");
  return request.json();
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

export async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERATIONS },
    key,
    256
  );
  return "pbkdf2$" + PBKDF2_ITERATIONS + "$" + toBase64Url(salt) + "$" + toBase64Url(new Uint8Array(bits));
}

export async function verifyPassword(password, stored) {
  try {
    const [algorithm, iterationsText, saltText, hashText] = stored.split("$");
    const iterations = Number(iterationsText);
    if (algorithm !== "pbkdf2" || !Number.isInteger(iterations) || iterations < 100000 || iterations > 100000) return false;

    const salt = fromBase64Url(saltText);
    const expected = fromBase64Url(hashText);
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = new Uint8Array(await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations },
      key,
      expected.length * 8
    ));

    if (bits.length !== expected.length) return false;
    let difference = 0;
    for (let i = 0; i < bits.length; i++) difference |= bits[i] ^ expected[i];
    return difference === 0;
  } catch {
    return false;
  }
}

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || "";
  for (const part of cookie.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return "";
}

export async function createSession(userId, env) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = toBase64Url(bytes);
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();

  await env.DB.prepare(
    "INSERT INTO reader_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)"
  ).bind(userId, tokenHash, expiresAt).run();

  return {
    cookie: SESSION_COOKIE + "=" + token + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + (SESSION_DAYS * 86400),
    expiresAt
  };
}

export async function currentUser(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token || token.length > 100) return null;

  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(`
    SELECT u.id, u.email, u.display_name, u.email_verified_at, u.created_at
    FROM reader_sessions s
    JOIN reader_accounts u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?
    LIMIT 1
  `).bind(tokenHash, new Date().toISOString()).first();

  return row || null;
}

export function clearSessionCookie() {
  return SESSION_COOKIE + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

export async function deleteCurrentSession(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (token && token.length <= 100) {
    await env.DB.prepare("DELETE FROM reader_sessions WHERE token_hash = ?")
      .bind(await sha256(token)).run();
  }
}
