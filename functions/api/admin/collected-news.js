function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function authorised(request, env) {
  return Boolean(
    env.ADMIN_TOKEN &&
    request.headers.get("Authorization") === `Bearer ${env.ADMIN_TOKEN}`
  );
}

export async function onRequestGet({ request, env }) {
  if (!authorised(request, env)) {
    return json({ success: false, error: "Unauthorised" }, 401);
  }

  if (!env.NEWS_AUTOMATION_URL) {
    return json({
      success: false,
      error: "The test news collector URL has not been configured in this Pages environment."
    }, 503);
  }

  let endpoint;

  try {
    endpoint = new URL(env.NEWS_AUTOMATION_URL);
  } catch {
    return json({
      success: false,
      error: "The configured test news collector URL is invalid."
    }, 500);
  }

  // This bridge is deliberately restricted to the test Worker.
  if (
    endpoint.protocol !== "https:" ||
    !endpoint.hostname.endsWith(".workers.dev") ||
    !endpoint.hostname.startsWith("wf-pundit-news-automation-test.")
  ) {
    return json({
      success: false,
      error: "The configured collector must be the WF Pundit test Worker HTTPS workers.dev URL."
    }, 500);
  }

  endpoint.pathname = "/candidates";
  endpoint.search = new URLSearchParams({
    limit: "50",
    status: "new",
    editorial_status: "ready_for_editorial_review"
  }).toString();

  try {
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${env.ADMIN_TOKEN}`,
        "Accept": "application/json"
      },
      signal: AbortSignal.timeout(15000)
    });

    const result = await response.json().catch(() => null);

    if (!response.ok || !result || !result.success) {
      console.error("Test news collector request failed:", response.status);
      return json({
        success: false,
        error: response.status === 401
          ? "The test Worker admin token does not match the website admin token."
          : "Unable to retrieve candidates from the test news collector."
      }, 502);
    }

    const candidates = (Array.isArray(result.candidates) ? result.candidates : [])
      .filter(item =>
        item &&
        typeof item.title === "string" &&
        typeof item.url === "string" &&
        item.url.startsWith("https://")
      )
      .map(item => ({
        id: item.id,
        title: item.title.slice(0, 500),
        description: String(item.description || "").slice(0, 5000),
        url: item.url,
        source_name: String(item.source_name || "News source").slice(0, 180),
        source_region: String(item.source_region || "").slice(0, 100),
        published_at: item.published_at || null,
        discovered_at: item.discovered_at || null,
        editorial_flags: item.editorial_flags || []
      }));

    return json({
      success: true,
      count: candidates.length,
      candidates
    });
  } catch (error) {
    console.error("Test news collector bridge error:", error);
    return json({
      success: false,
      error: "Could not connect to the test news collector. Please try again."
    }, 502);
  }
}
