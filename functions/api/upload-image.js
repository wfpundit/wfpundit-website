
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function isAuthorised(request, env) {
  return Boolean(
    env.ADMIN_TOKEN &&
    request.headers.get("Authorization") === `Bearer ${env.ADMIN_TOKEN}`
  );
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + chunkSize)
    );
  }

  return btoa(binary);
}

export async function onRequestPost({ request, env }) {
  if (!isAuthorised(request, env)) {
    return json({ error: "Unauthorised" }, 401);
  }

  if (!env.GITHUB_TOKEN) {
    return json({
      error: "Photo storage is not configured. Check GITHUB_TOKEN in Cloudflare Pages."
    }, 500);
  }

  try {
    const form = await request.formData();
    const file = form.get("photo");

    if (!file || typeof file.arrayBuffer !== "function") {
      return json({ error: "Please choose a photo first." }, 400);
    }

    const allowedTypes = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif"
    };

    const extension = allowedTypes[file.type];

    if (!extension) {
      return json({
        error: "Please use a JPG, PNG, WEBP, or GIF image."
      }, 400);
    }

    if (file.size > 4 * 1024 * 1024) {
      return json({
        error: "Please choose an image smaller than 4 MB."
      }, 400);
    }

    if (file.size === 0) {
      return json({
        error: "The selected photo is empty."
      }, 400);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    const filename =
      `wf-pundit-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;

    const path = `uploads/${filename}`;

    const githubResponse = await fetch(
      `https://api.github.com/repos/wfpundit/wfpundit-website/contents/${path}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "WF-Pundit-Website",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Add article image ${filename}`,
          content: bytesToBase64(bytes),
          branch: "main"
        })
      }
    );

    const responseText = await githubResponse.text();

    let result = {};

    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      result = { message: responseText.slice(0, 500) };
    }

    if (!githubResponse.ok) {
      return json({
        error: `GitHub upload error (${githubResponse.status}): ${
          result.message || "Unknown GitHub error"
        }`
      }, 502);
    }

    const imageUrl =
      result.content && result.content.download_url;

    if (!imageUrl) {
      return json({
        error: "GitHub saved the photo but did not return an image link."
      }, 502);
    }

    return json({
      success: true,
      image_url: imageUrl
    });

  } catch (error) {
    return json({
      error: "Photo upload failed: " +
        (error.message || "Unknown server error")
    }, 500);
  }
}
