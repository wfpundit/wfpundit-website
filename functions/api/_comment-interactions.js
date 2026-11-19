
/**
 * WF Pundit comment replies and reactions.
 *
 * This helper safely adds the reply column to the existing
 * article_comments table and creates the reactions table.
 */

export async function ensureCommentInteractionTables(env) {
  if (!env || !env.DB) {
    throw new Error("The database binding is unavailable.");
  }

  // Add the parent link needed to store replies.
  // Existing comments remain top-level comments because this
  // column is NULL for records already in the database.
  try {
    await env.DB.prepare(`
      ALTER TABLE article_comments
      ADD COLUMN parent_comment_id INTEGER
    `).run();
  } catch (error) {
    const message = String(error && error.message ? error.message : error);

    // Ignore only the expected error when the column already exists.
    if (!/duplicate column name|already exists/i.test(message)) {
      throw error;
    }
  }

  // One reaction per reader per comment.
  // A reader can change their reaction at any time.
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS article_comment_reactions (
      comment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      reaction TEXT NOT NULL
        CHECK (reaction IN ('like', 'love', 'laugh', 'support')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (comment_id, user_id)
    )
  `).run();

  // Keep comment and reaction lookups efficient.
  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_article_comments_parent
    ON article_comments (parent_comment_id)
  `).run();

  await env.DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment
    ON article_comment_reactions (comment_id)
  `).run();
}
