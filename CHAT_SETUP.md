# BONOECO AI chat setup

The public chat widget uses these same-origin Pages Functions:

- `/api/chat` generates replies with Workers AI.
- `/api/chat-transcript` forwards an opted-in transcript to the existing `bonoeco-forms` Worker. That Worker sends the email using its existing Cloudflare Email Service binding.

## Cloudflare Pages bindings

In the Pages project connected to this repository, configure:

- Workers AI binding named `AI` for the assistant.
- Service binding named `BONOECO_FORMS`, pointing to the existing `bonoeco-forms` Worker.

The existing Worker must keep its `EMAIL` binding and be routed to accept `POST /api/inquiry`. Its sending configuration should allow sender `forms@bonoeco.com` and the fixed destination `info.bonoeco@gmail.com`. Pages Functions support Service bindings to call another Worker; the email binding remains on the existing Worker.

The chat function uses model `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Enable the bindings for production (and preview if desired), then redeploy for changes to take effect.

## Transcript behavior

The visitor must check the transcript-email option. When the visitor closes the chat, the latest 40 messages are sent to `info.bonoeco@gmail.com`. With the option unchecked, nothing is emailed. The website does not store chat transcripts in D1. The endpoint validates origin and consent, limits body size, and applies a best-effort per-isolate sending limit.

For stronger abuse protection, add Cloudflare rate-limiting rules for `/api/chat` and `/api/chat-transcript`.

## Smoke test

1. Open the site and confirm the floating Chat button appears.
2. Ask about leather choices and verify a response.
3. Check the transcript option, exchange a short conversation, close the chat, and confirm the transcript arrives at `info.bonoeco@gmail.com`.
4. Repeat without checking the option and verify no transcript is sent.
5. Ask for a price and verify the assistant points to the quote flow rather than inventing one.
