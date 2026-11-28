# WF Pundit support auto-reply

This is a separate Cloudflare Email Worker. It is not a Pages Function and must be deployed as its own Worker.

## What it does

- Forwards every incoming message for the support route to the existing verified Gmail destination.
- Sends a branded acknowledgement from `support@wfpundit.uk` through the Resend API.
- Uses the sender's first name when a display name is present in the incoming From header; otherwise it says "Hello there".
- Skips common automated/bounce and mailing-list messages.
- Uses a KV key based on the incoming Message-ID to avoid repeat acknowledgements for 30 days.

## Required setup

Do not switch the Cloudflare support route to this Worker until the current Gmail forwarding destination is known and configured below. The Worker forwards the original message itself, so this preserves delivery only when `FORWARD_TO` is set to the exact existing verified destination.

1. In Cloudflare, create a KV namespace named `REPLY_DEDUPE`.
2. Copy its namespace ID into `wrangler.toml`, replacing `REPLACE_WITH_REPLY_DEDUPE_KV_NAMESPACE_ID`.
3. From this directory, set the secrets:
   - `wrangler secret put RESEND_API_KEY` — use the existing Resend API key. Never put it in GitHub.
   - `wrangler secret put FORWARD_TO` — enter the exact Gmail destination currently used by the Cloudflare Email Routing rule for `support@wfpundit.uk`. This destination must already be verified in Cloudflare Email Routing.
4. Deploy this Worker with `wrangler deploy`.
5. In Cloudflare Email Routing, create/change the route for `support@wfpundit.uk` to invoke this Email Worker. The Worker will forward the original message to `FORWARD_TO` and send the acknowledgement separately.
6. Send a test message from an external email account and confirm both the original message arrives in Gmail and the acknowledgement arrives at the sender.

## Important

- The Pages deployment does not deploy this Worker. It requires a separate Cloudflare Worker deployment.
- Do not remove the existing route or enable the Worker route until `FORWARD_TO` has been set to the exact existing verified Gmail destination.
- The acknowledgement is sent only after the original message has been forwarded successfully.
- The sender name is read from the email's From display name. If the sender's email does not include a usable display name, the greeting falls back to "Hello there".
- Auto-replies, bulk/list mail, bounce addresses, and messages sent from the support address itself are excluded.
- The KV namespace is used for duplicate suppression. Do not remove its binding.
