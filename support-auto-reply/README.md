# WF Pundit support auto-reply

This is a separate Cloudflare Email Worker. It is not a Pages Function and must be deployed as its own Worker.

## What it does

- Forwards every incoming message for the support route to the existing verified Gmail destination.
- Sends a branded acknowledgement from `support@wfpundit.uk` through the Resend API.
- Uses the sender's first name when a display name is present in the incoming From header; otherwise it says "Hello there".
- Skips common automated/bounce and mailing-list messages.
- Uses a KV key based on the incoming Message-ID to avoid repeat acknowledgements for 30 days.

## Cloudflare Git deployment

The Git-connected Worker should deploy this configuration from the repository using:

```bash
npx wrangler deploy --config support-auto-reply/wrangler.toml
```

The configuration file already contains the `REPLY_DEDUPE` KV namespace ID. The Worker still requires its Cloudflare runtime settings before email routing is switched to it.

## Required runtime setup

Do not switch the Cloudflare support route to this Worker until the current Gmail forwarding destination is configured below. The Worker forwards the original message itself, so this preserves delivery only when `FORWARD_TO` is set to the exact existing verified destination.

1. In Cloudflare Worker settings, add the KV namespace binding `REPLY_DEDUPE` and select `wf-pundit-support-reply-dedupe`.
2. Add the secret `RESEND_API_KEY` using the existing Resend API key. Never put it in GitHub.
3. Add the text variable `FORWARD_TO` with the exact existing verified Gmail destination: `oscardiegortiger71@gmail.com`.
4. Deploy the Worker after adding the binding and runtime settings.
5. In Cloudflare Email Routing, create/change the route for `support@wfpundit.uk` to invoke this Email Worker. The Worker will forward the original message to `FORWARD_TO` and send the acknowledgement separately.
6. Send a test message from an external email account and confirm both the original message arrives in Gmail and the acknowledgement arrives at the sender.

## Important

- The Pages deployment does not deploy this Worker. It requires a separate Cloudflare Worker deployment.
- Do not remove the existing route or enable the Worker route until `FORWARD_TO` has been set to the exact existing verified Gmail destination.
- The acknowledgement is sent only after the original message has been forwarded successfully.
- The sender name is read from the email's From display name. If the sender's email does not include a usable display name, the greeting falls back to "Hello there".
- Auto-replies, bulk/list mail, bounce addresses, and messages sent from the support address itself are excluded.
- The KV namespace is used for duplicate suppression. Do not remove its binding.
