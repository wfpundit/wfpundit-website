
const ALLOWED_LEAGUES = new Set([
  "wsl",
  "ligaf",
  "uwcl",
  "womenseuro",
  "womensworldcup"
]);

const API_BASE = "https://api.api-ninjas.com/v1";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=180"
    }
  });
}

export async function onRequestGet({ request, env }) {
  const key = env.API_NINJAS_KEY;

  if (!key) {
    return json({
      success: false,
      error: "Football data is not configured yet."
    }, 503);
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "matches";
  const league = (url.searchParams.get("league") || "wsl").toLowerCase();
  const date = url.searchParams.get("date");

  if (!["matches", "standings"].includes(type)) {
    return json({ success: false, error: "Invalid data type." }, 400);
  }

  if (!ALLOWED_LEAGUES.has(league)) {
    return json({ success: false, error: "Competition is not supported." }, 400);
  }

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return json({ success: false, error: "Date must use YYYY-MM-DD." }, 400);
  }

  const endpoint = type === "standings"
    ? "soccerstandings"
    : "soccermatches";

  const apiUrl = new URL(`${API_BASE}/${endpoint}`);
  apiUrl.searchParams.set("league", league);

  if (type === "matches" && date) {
    apiUrl.searchParams.set("date", date);
  }

  try {
    const response = await fetch(apiUrl.toString(), {
      headers: { "X-Api-Key": key }
    });

    const raw = await response.text();
    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      return json({
        success: false,
        error: "The football data provider returned an unreadable response."
      }, 502);
    }

    if (!response.ok) {
      return json({
        success: false,
        error: typeof data?.error === "string"
          ? data.error
          : "The football data provider could not complete the request."
      }, response.status === 429 ? 429 : 502);
    }

    return json({
      success: true,
      type,
      league,
      data: Array.isArray(data) ? data : []
    });
  } catch (error) {
    return json({
      success: false,
      error: "Unable to connect to the football data provider."
    }, 502);
  }
}
