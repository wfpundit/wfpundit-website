# WF Pundit News Automation

This is the separate test news-monitoring Worker used by the WF Pundit publishing admin.

## Behaviour
- Collects women's-football stories from the configured RSS and Atom sources.
- Performs editorial triage and exposes only stories marked ready for editorial review to the admin list.
- Stores short publisher excerpts separately for internal reference.
- Provides a free, rule-based article-body starting draft in the admin. It is not AI-written original journalism and must be independently checked and rewritten by an editor.
- Automatic publishing is disabled in the Worker (`AUTO_PUBLISH = false`).

## Cloudflare configuration
Deploy the Worker using `wrangler.toml`. It uses the test D1 database configured in that file and requires an `ADMIN_TOKEN` secret. The Cloudflare Pages project must also have `NEWS_AUTOMATION_URL` and `NEWS_AUTOMATION_TOKEN` configured for the admin bridge.

Do not put secrets in this repository. Confirm the Worker is deployed and the Pages environment variables point to the same test Worker before testing the admin.

## Editorial safeguards
The article body uses only the collected headline, short feed summary and source metadata. Publisher excerpts remain in a separate read-only field and should not be republished verbatim. Verify every fact, add independently verified reporting, and save as a draft until reviewed. Use only photographs WF Pundit has permission to publish.
