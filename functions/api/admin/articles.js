
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function authorised(request, env) {
  const token = request.headers.get("Authorization");
  return Boolean(
    env.ADMIN_TOKEN &&
    token === `Bearer ${env.ADMIN_TOKEN}`
  );
}

function makeSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// LOAD ALL ARTICLES, INCLUDING DRAFTS
export async function onRequestGet({ request, env }) {
  if (!authorised(request, env)) {
    return json({ error: "Unauthorised" }, 401);
  }

  try {
    const result = await env.DB.prepare(`
      SELECT * FROM articles
      ORDER BY created_at DESC
    `).all();

    return json({
      success: true,
      articles: result.results || []
    });

  } catch (error) {
    return json({ error: "Unable to load articles" }, 500);
  }
}

// CREATE ARTICLE
export async function onRequestPost({ request, env }) {
  if (!authorised(request, env)) {
    return json({ error: "Unauthorised" }, 401);
  }

  try {
    const data = await request.json();
    const title = String(data.title || "").trim();

    if (!title) {
      return json({ error: "Article title is required" }, 400);
    }

    const slug = makeSlug(data.slug || title);
    if (!slug) {
      return json({ error: "A valid article slug is required" }, 400);
    }

    const status = data.status === "published"
      ? "published"
      : "draft";

    const now = new Date().toISOString();

    const result = await env.DB.prepare(`
      INSERT INTO articles
      (title, slug, summary, content, image_url, category,
       status, author, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title,
      slug,
      data.summary || "",
      data.content || "",
      data.image_url || "",
      data.category || "Women's Football",
      status,
      data.author || "WF Pundit",
      now,
      now
    ).run();

    return json({
      success: true,
      message: "Article created",
      id: result.meta.last_row_id
    }, 201);

  } catch (error) {
    return json({
      error: "Unable to create article. Check that its slug is unique."
    }, 500);
  }
}

// UPDATE ARTICLE
export async function onRequestPut({ request, env }) {
  if (!authorised(request, env)) {
    return json({ error: "Unauthorised" }, 401);
  }

  try {
    const data = await request.json();
    const id = Number(data.id);
    const title = String(data.title || "").trim();

    if (!Number.isInteger(id) || id < 1 || !title) {
      return json({ error: "Valid article ID and title are required" }, 400);
    }

    const slug = makeSlug(data.slug || title);
    const status = data.status === "published"
      ? "published"
      : "draft";

    const result = await env.DB.prepare(`
      UPDATE articles SET
        title = ?,
        slug = ?,
        summary = ?,
        content = ?,
        image_url = ?,
        category = ?,
        status = ?,
        author = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      title,
      slug,
      data.summary || "",
      data.content || "",
      data.image_url || "",
      data.category || "Women's Football",
      status,
      data.author || "WF Pundit",
      new Date().toISOString(),
      id
    ).run();

    if (!result.meta.changes) {
      return json({ error: "Article not found" }, 404);
    }

    return json({ success: true, message: "Article updated" });

  } catch (error) {
    return json({
      error: "Unable to update article. Check that its slug is unique."
    }, 500);
  }
}

// DELETE ARTICLE
export async function onRequestDelete({ request, env }) {
  if (!authorised(request, env)) {
    return json({ error: "Unauthorised" }, 401);
  }

  try {
    const data = await request.json();
    const id = Number(data.id);

    if (!Number.isInteger(id) || id < 1) {
      return json({ error: "Valid article ID is required" }, 400);
    }

    const result = await env.DB.prepare(
      "DELETE FROM articles WHERE id = ?"
    ).bind(id).run();

    if (!result.meta.changes) {
      return json({ error: "Article not found" }, 404);
    }

    return json({ success: true, message: "Article deleted" });

  } catch (error) {
    return json({ error: "Unable to delete article" }, 500);
  }
}
