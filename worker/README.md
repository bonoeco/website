# bonoeco-forms Worker

This standalone Cloudflare Worker handles BONOECO email inquiries and chat transcript delivery. The source is maintained here; deploy it to the existing Worker named `bonoeco-forms` when this source changes.

## Bindings

- `EMAIL`: Cloudflare Email Service send_email binding. Restrict the sender to `forms@bonoeco.com` and the recipient to `info.bonoeco@gmail.com`.
- `AI`: Workers AI binding used by `POST /api/chat`.

## Routes

- `POST /api/inquiry`: forwards site inquiries to `info.bonoeco@gmail.com`.
- `POST /api/chat`: generates chat replies through Workers AI.
- `POST /api/chat-transcript`: emails a transcript only when the visitor opted in and closes the chat. The handler limits transcript length and sends to the fixed inbox; it does not save transcripts in a database.

The Pages project uses a Service binding named `BONOECO_FORMS` pointing to this Worker for chat transcript delivery.
