
import { currentUser, json, readJson, validOrigin } from "./_auth.js";

function parseList(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cleanList(value, limit = 20) {
  if (!Array.isArray(value)) return null;

  const cleaned = value
    .filter(item => typeof item === "string")
    .map(item => item.trim())
    .filter(Boolean);

  if (
    cleaned.length > limit ||
    cleaned.some(item => item.length > 60)
  ) {
    return null;
  }

  return [...new Set(cleaned)];
}

export async function onRequestGet({ request, env }) {
  try {
    const user = await currentUser(request, env);

    if (!user) {
      return json({
        success: false,
        error: "Please log in again."
      }, 401);
    }

    const row = await env.DB.prepare(`
      SELECT *
      FROM notification_preferences
      WHERE user_id = ?
    `).bind(user.id).first();

    const reading = await env.DB.prepare(`
      SELECT *
      FROM reading_preferences
      WHERE user_id = ?
    `).bind(user.id).first();

    return json({
      success: true,

      notifications: {
        breakingNewsInApp: row
          ? Boolean(row.breaking_news_in_app)
          : true,

        breakingNewsEmail: row
          ? Boolean(row.breaking_news_email)
          : true,

        commentRepliesInApp: row
          ? Boolean(row.comment_replies_in_app)
          : true,

        commentRepliesEmail: row
          ? Boolean(row.comment_replies_email)
          : true
      },

      reading: {
        competitions: parseList(reading?.favourite_competitions),
        clubs: parseList(reading?.favourite_clubs),
        topics: parseList(reading?.favourite_topics)
      }
    });

  } catch (error) {
    console.error("Settings preferences load error:", error);

    return json({
      success: false,
      error: "Unable to load your preferences."
    }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) {
    return json({
      success: false,
      error: "Request could not be verified."
    }, 403);
  }

  let data;

  try {
    data = await readJson(request);
  } catch {
    return json({
      success: false,
      error: "Please submit the form again."
    }, 400);
  }

  const notificationKeys = [
    "breakingNewsInApp",
    "breakingNewsEmail",
    "commentRepliesInApp",
    "commentRepliesEmail"
  ];

  if (
    !data.notifications ||
    notificationKeys.some(
      key => typeof data.notifications[key] !== "boolean"
    )
  ) {
    return json({
      success: false,
      error: "Please check your notification choices."
    }, 400);
  }

  const competitions = cleanList(data.reading?.competitions, 20);
  const clubs = cleanList(data.reading?.clubs, 100);
  const topics = cleanList(data.reading?.topics, 20);

  if (!competitions || !clubs || !topics) {
    return json({
      success: false,
      error: "You can select up to 20 competitions, 100 clubs and 20 topics. Each selection must be no longer than 60 characters."
    }, 400);
  }

  try {
    const user = await currentUser(request, env);

    if (!user) {
      return json({
        success: false,
        error: "Please log in again."
      }, 401);
    }

    const n = data.notifications;

    await env.DB.prepare(`
      INSERT INTO notification_preferences (
        user_id,
        breaking_news_in_app,
        breaking_news_email,
        comment_replies_in_app,
        comment_replies_email,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)

      ON CONFLICT(user_id) DO UPDATE SET
        breaking_news_in_app = excluded.breaking_news_in_app,
        breaking_news_email = excluded.breaking_news_email,
        comment_replies_in_app = excluded.comment_replies_in_app,
        comment_replies_email = excluded.comment_replies_email,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      user.id,
      Number(n.breakingNewsInApp),
      Number(n.breakingNewsEmail),
      Number(n.commentRepliesInApp),
      Number(n.commentRepliesEmail)
    ).run();

    await env.DB.prepare(`
      INSERT INTO reading_preferences (
        user_id,
        favourite_competitions,
        favourite_clubs,
        favourite_topics,
        updated_at
      )
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)

      ON CONFLICT(user_id) DO UPDATE SET
        favourite_competitions = excluded.favourite_competitions,
        favourite_clubs = excluded.favourite_clubs,
        favourite_topics = excluded.favourite_topics,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      user.id,
      JSON.stringify(competitions),
      JSON.stringify(clubs),
      JSON.stringify(topics)
    ).run();

    return json({
      success: true,
      message: "Your preferences have been saved."
    });

  } catch (error) {
    console.error("Settings preferences save error:", error);

    return json({
      success: false,
      error: "Unable to save your preferences. Please try again."
    }, 500);
  }
}
