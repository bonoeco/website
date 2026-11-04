# bonoeco-forms Worker

The inquiry form handler for bonoeco.com lives in a standalone Cloudflare
Worker named `bonoeco-forms` (deployed via the Cloudflare API, not from
this repo — this copy is the source of record).

- Route: `bonoeco.com/api/inquiry*` → bonoeco-forms (zone route; note that
  workers.dev URLs return error 1101 on this account, so the Worker is
  only reachable through the bonoeco.com route).
- Binding: `EMAIL` (send_email) → info.bonoeco@gmail.com, a verified
  Cloudflare Email Routing destination.
- Handles POSTs from contact.html and custom.html, then redirects to
  `?sent=1` on the originating page.
