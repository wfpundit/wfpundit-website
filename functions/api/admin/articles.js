
import { notifyPublishedArticle } from "../_notifications.js";
import { adminAuthorised } from "../_auth.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}


function makeSlug(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/*
 * VALIDATE NEWS SOURCES
 *
 * New format:
 * Source name — https://example.com
 * Source name — https://example.org
 *
 * Maximum: four sources.
 *
 * Older articles using source + source_url are still supported.
 */
function validateSourceInformation(sourceValue, sourceUrlValue) {
  const source = String(sourceValue || "").trim();
  const sourceUrl = String(sourceUrlValue || "").trim();

  if (source.length > 12000 || sourceUrl.length > 2048) {
    throw new Error("Article source information is too long.");
  }

  if (sourceUrl) {
    let parsedSourceUrl;

    try {
      parsedSourceUrl = new URL(sourceUrl);
    } catch {
      throw new Error("The source URL is invalid.");
    }

    if (parsedSourceUrl.protocol !== "https:") {
      throw new Error("The source URL must use HTTPS.");
    }
  }

  const lines = source
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length > 4) {
    throw new Error("You can add a maximum of four news sources.");
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const separator = line.lastIndexOf(" — ");

    // Support older single-source records that have no separate URL.
    if (separator < 1) {
      if (lines.length === 1 && !sourceUrl && line.length <= 180) {
        continue;
      }

      throw new Error(
        "Source " + (i + 1) +
        " must use this format: Source name — https://link"
      );
    }

    const name = line.slice(0, separator).trim();
    const rawUrl = line.slice(separator + 3).trim();

    if (!name || name.length > 180) {
      throw new Error(
        "Source " + (i + 1) +
        " needs a name of 180 characters or fewer."
      );
    }

    if (rawUrl.length > 2048) {
      throw new Error(
        "Source " + (i + 1) + " link is too long."
      );
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      throw new Error(
        "Source " + (i + 1) + " has an invalid link."
      );
    }

    if (parsedUrl.protocol !== "https:") {
      throw new Error(
        "Source " + (i + 1) +
        " link must use HTTPS."
      );
    }
  }

  return {
    source,
    sourceUrl
  };
}

// LOAD ALL ARTICLES, INCLUDING DRAFTS
export async function onRequestGet({ request, env }) {
  if (!(await adminAuthorised(request, env))) {
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
    console.error("Admin article loading failed:", error);

    return json({
      error: "Unable to load articles"
    }, 500);
  }
}

// CREATE ARTICLE
export async function onRequestPost({ request, env }) {
  if (!(await adminAuthorised(request, env))) {
    return json({ error: "Unauthorised" }, 401);
  }

  try {
    const data = await request.json();
    const title = String(data.title || "").trim();

    if (!title) {
      return json({
        error: "Article title is required"
      }, 400);
    }

    let sourceInformation;

    try {
      sourceInformation = validateSourceInformation(
        data.source,
        data.source_url
      );
    } catch (error) {
      return json({
        error: error.message
      }, 400);
    }

    const slug = makeSlug(data.slug || title);

    if (!slug) {
      return json({
        error: "A valid article slug is required"
      }, 400);
    }

    const status = data.status === "published"
      ? "published"
      : "draft";

    const now = new Date().toISOString();

    const result = await env.DB.prepare(`
      INSERT INTO articles
      (
        title,
        slug,
        summary,
        content,
        source,
        source_url,
        image_url,
        category,
        status,
        author,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title,
      slug,
      data.summary || "",
      data.content || "",
      sourceInformation.source,
      sourceInformation.sourceUrl,
      data.image_url || "",
      data.category || "Women's Football",
      status,
      data.author || "WF Pundit",
      now,
      now
    ).run();

    const articleId = result.meta.last_row_id;

    // Notify readers only when the article is published.
    if (status === "published") {
      await notifyPublishedArticle(env, {
        id: articleId,
        title,
        summary: data.summary || ""
      });
    }

    return json({
      success: true,
      message: "Article created",
      id: articleId
    }, 201);

  } catch (error) {
    console.error("Article creation failed:", error);

    return json({
      error: "Unable to create article. Check that its slug is unique."
    }, 500);
  }
}

// UPDATE ARTICLE
export async function onRequestPut({ request, env }) {
  if (!(await adminAuthorised(request, env))) {
    return json({ error: "Unauthorised" }, 401);
  }

  try {
    const data = await request.json();
    const id = Number(data.id);
    const title = String(data.title || "").trim();

    if (!Number.isInteger(id) || id < 1 || !title) {
      return json({
        error: "Valid article ID and title are required"
      }, 400);
    }

    let sourceInformation;

    try {
      sourceInformation = validateSourceInformation(
        data.source,
        data.source_url
      );
    } catch (error) {
      return json({
        error: error.message
      }, 400);
    }

    const existing = await env.DB.prepare(`
      SELECT id, status
      FROM articles
      WHERE id = ?
      LIMIT 1
    `).bind(id).first();

    if (!existing) {
      return json({
        error: "Article not found"
      }, 404);
    }

    const slug = makeSlug(data.slug || title);

    if (!slug) {
      return json({
        error: "A valid article slug is required"
      }, 400);
    }

    const status = data.status === "published"
      ? "published"
      : "draft";

    const result = await env.DB.prepare(`
      UPDATE articles SET
        title = ?,
        slug = ?,
        summary = ?,
        content = ?,
        source = ?,
        source_url = ?,
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
      sourceInformation.source,
      sourceInformation.sourceUrl,
      data.image_url || "",
      data.category || "Women's Football",
      status,
      data.author || "WF Pundit",
      new Date().toISOString(),
      id
    ).run();

    if (!result.meta.changes) {
      return json({
        error: "Article not found"
      }, 404);
    }

    // Notify only when an existing draft becomes published.
    if (
      existing.status !== "published" &&
      status === "published"
    ) {
      await notifyPublishedArticle(env, {
        id,
        title,
        summary: data.summary || ""
      });
    }

    return json({
      success: true,
      message: "Article updated"
    });

  } catch (error) {
    console.error("Article update failed:", error);

    return json({
      error: "Unable to update article. Check that its slug is unique."
    }, 500);
  }
}

// DELETE ARTICLE
export async function onRequestDelete({ request, env }) {
  if (!(await adminAuthorised(request, env))) {
    return json({ error: "Unauthorised" }, 401);
  }

  try {
    const data = await request.json();
    const id = Number(data.id);

    if (!Number.isInteger(id) || id < 1) {
      return json({
        error: "Valid article ID is required"
      }, 400);
    }

    const result = await env.DB.prepare(
      "DELETE FROM articles WHERE id = ?"
    ).bind(id).run();

    if (!result.meta.changes) {
      return json({
        error: "Article not found"
      }, 404);
    }

    return json({
      success: true,
      message: "Article deleted"
    });

  } catch (error) {
    console.error("Article deletion failed:", error);

    return json({
      error: "Unable to delete article"
    }, 500);
  }
}
