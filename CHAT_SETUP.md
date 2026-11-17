# BONOECO AI chat setup

The public site chat widget calls the same-origin Pages Functions at `/api/chat` and `/api/chat-transcript`.

## Cloudflare Pages bindings

In the Cloudflare Pages project connected to this repository, configure:

- Workers AI binding named `AI` for assistant replies.
- Service binding named `BONOECO_FORMS`, pointing to the existing `bonoeco-forms` Worker, for emailing consented transcripts.

Deploy the updated `worker/worker.js` source to the existing `bonoeco-forms` Worker. Its existing Email Service binding must be named `EMAIL`; restrict it to send from `forms@bonoeco.com` and to `info.bonoeco@gmail.com`. The Worker also needs its existing Workers AI binding named `AI` for `/api/chat` if that route is still used.

The Pages Function uses model `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Bindings must be enabled for production (and preview if preview deployments should be tested). Redeploy after changing bindings.

## Transcript behavior

A visitor must check the transcript email box. The latest 40 messages are emailed to `info.bonoeco@gmail.com` when they close the chat. If they leave the box unchecked, no transcript is emailed. Transcripts are not stored in D1 by this code. The email Worker enforces a small request-size limit, validates consent and origin, uses a fixed recipient, and applies a best-effort per-isolate send limit.

For stronger abuse protection, add a Cloudflare rate-limiting rule for `/api/chat` and `/api/chat-transcript`.

## Smoke test

1. Open the site and confirm the floating Chat button appears.
2. Ask about leather choices and verify a response.
3. Check the transcript option, exchange a short conversation, close the chat, and confirm the transcript arrives at `info.bonoeco@gmail.com`.
4. Repeat without checking the option and verify no transcript is sent.
5. Ask for a price and verify the assistant directs the visitor to request a quote instead of inventing one.
