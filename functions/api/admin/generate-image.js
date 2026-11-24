import { adminAuthorised } from "../_auth.js";

const MODEL = "@cf/black-forest-labs/flux-2-klein-4b";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function imageBytes(result) {
  let value = result;
  if (value && typeof value === "object" && !(value instanceof Uint8Array)) {
    value = value.image || value.response || value.result || value;
  }
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
  if (value && typeof value.getReader === "function") {
    const reader = value.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value: chunk } = await reader.read();
      if (done) break;
      chunks.push(chunk);
      total += chunk.length;
    }
    const output = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.length;
    }
    return output;
  }
  throw new Error("The image model returned an unsupported response.");
}

export async function onRequestPost({ request, env }) {
  if (!(await adminAuthorised(request, env))) {
    return json({ success: false, error: "Unauthorised" }, 401);
  }

  if (!env.AI || typeof env.AI.run !== "function") {
    return json({
      success: false,
      error: "Workers AI is not available. Check the AI binding and redeploy."
    }, 503);
  }

  try {
    const data = await request.json();
    const prompt = String(data.prompt || "").trim().slice(0, 1800);
    if (prompt.length < 20) {
      return json({ success: false, error: "Generate the article first so the photo has a relevant prompt." }, 400);
    }

    const form = new FormData();
    form.append("prompt",
      "Create a premium, photorealistic editorial sports photograph for a women's football news publication. " +
      prompt +
      " Wide landscape 4:3 composition, natural stadium lighting, authentic football action, realistic anatomy, professional sports photojournalism. " +
      "No text, no typography, no logos, no badges, no club crests, no watermarks, no identifiable real footballer likeness."
    );
    form.append("width", "1024");
    form.append("height", "768");
    form.append("guidance", "3.5");

    const serialized = new Response(form);
    const result = await env.AI.run(MODEL, {
      multipart: {
        body: serialized.body,
        contentType: serialized.headers.get("content-type")
      }
    });

    const bytes = await imageBytes(result);
    if (!bytes.length || bytes.length > 12 * 1024 * 1024) {
      throw new Error("The generated image was empty or too large.");
    }

    return json({
      success: true,
      mime_type: "image/png",
      image_data: bytesToBase64(bytes)
    });
  } catch (error) {
    console.error("AI image generation failed:", error);
    return json({
      success: false,
      error: error.message || "AI photo generation failed. Please try again."
    }, 502);
  }
}
