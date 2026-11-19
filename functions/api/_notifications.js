
import {
  currentUser,
  json,
  validOrigin,
  readJson
} from "./_auth.js";

import {
  ensureNotificationTables
} from "./_notifications.js";

// GET THE SIGNED-IN USER'S NOTIFICATIONS
export async function onRequestGet({ request, env }) {
  try {
    const user = await currentUser(request, env);

    if (!user) {
      return json({
        error: "Please sign in to view notifications."
      }, 401);
    }

    await ensureNotificationTables(env);

    const result = await env.DB.prepare(`
      SELECT
        id,
        article_id,
        title,
        message,
        link,
        created_at,
        read_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `).bind(user.id).all();

    const unread = await env.DB.prepare(`
      SELECT COUNT(*) AS total
      FROM notifications
      WHERE user_id = ?
        AND read_at IS NULL
    `).bind(user.id).first();

    return json({
      success: true,
      notifications: result.results || [],
      unread_count: Number(unread?.total || 0)
    });

  } catch (error) {
    console.error("Notification loading failed:", error);

    // TEMPORARY DIAGNOSTIC
    return json({
      error: "Unable to load notifications.",
      diagnostic: String(error.message || error)
    }, 500);
  }
}

// MARK NOTIFICATIONS AS READ
export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) {
    return json({ error: "Invalid request origin." }, 403);
  }

  try {
    const user = await currentUser(request, env);

    if (!user) {
      return json({ error: "Please sign in first." }, 401);
    }

    const data = await readJson(request);

    await ensureNotificationTables(env);

    if (data.action === "mark_all_read") {
      await env.DB.prepare(`
        UPDATE notifications
        SET read_at = ?
        WHERE user_id = ?
          AND read_at IS NULL
      `).bind(
        new Date().toISOString(),
        user.id
      ).run();

      return json({
        success: true,
        message: "All notifications marked as read."
      });
    }

    if (data.action === "mark_read") {
      const id = Number(data.id);

      if (!Number.isInteger(id) || id < 1) {
        return json({
          error: "A valid notification ID is required."
        }, 400);
      }

      const result = await env.DB.prepare(`
        UPDATE notifications
        SET read_at = ?
        WHERE id = ?
          AND user_id = ?
          AND read_at IS NULL
      `).bind(
        new Date().toISOString(),
        id,
        user.id
      ).run();

      return json({
        success: true,
        message: result.meta.changes
          ? "Notification marked as read."
          : "Notification is already read or unavailable."
      });
    }

    return json({
      error: "Invalid notification action."
    }, 400);

  } catch (error) {
    console.error("Notification update failed:", error);

    return json({
      error: "Unable to update notifications.",
      diagnostic: String(error.message || error)
    }, 500);
  }
}
