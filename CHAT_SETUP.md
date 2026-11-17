# BONOECO AI chat setup

The public site chat widget uses the same-origin Pages Function at `/api/chat`.

Before deploying this branch, open the Cloudflare Pages project connected to this repository and add a Workers AI binding:

- Variable name: `AI`
- Binding type: Workers AI

The function uses the model `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. The binding must be enabled for the Pages production environment (and preview if you want to test preview deployments).

The endpoint only accepts POST requests from bonoeco.com, limits payload size and message history, and applies a best-effort per-isolate IP rate limit. For stronger abuse protection, also add a Cloudflare rate-limiting rule for `/api/chat`. No chat messages are written to D1 or logged by this code.

Smoke test after adding the binding and deploying:
1. Open the site and confirm the floating Chat button appears.
2. Ask “What leather options are available?” and confirm a response.
3. Ask for a price and confirm the assistant directs the visitor to request a quote instead of inventing one.
4. Confirm the endpoint returns a graceful unavailable message if the AI binding is disabled.
