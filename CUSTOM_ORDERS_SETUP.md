# BONOECO custom orders backend

The customizer remains a Cloudflare Pages site. Its Pages Functions save customer specifications to D1; the private `admin.html` page lists them and exports an Excel workbook or a print-ready PDF.

## Cloudflare setup

1. In **Workers & Pages**, open the `website` Pages project. In **Settings → Bindings → Add → D1 database**, create or select a D1 database and bind it as `ORDERS_DB` for Production. Redeploy after adding the binding.
2. Run the SQL in `migrations/0001_custom_orders.sql` in the D1 Console. Keep this database private; do not expose a D1 API token to the browser.
3. In **Settings → Variables and Secrets**, add these Production variables:
   - `ADMIN_EMAIL`: `info.bonoeco@gmail.com`
   - `CF_ACCESS_TEAM_DOMAIN`: your Cloudflare Access team origin, e.g. `https://your-team.cloudflareaccess.com`
   - `CF_ACCESS_AUD`: the Application Audience (AUD) value for the Access application protecting the admin page.
4. In **Zero Trust → Access → Applications**, create a Self-hosted application for `bonoeco.com/admin*` and `bonoeco.com/api/admin/*`. Add an Allow policy for the exact email `info.bonoeco@gmail.com`. Use that application's AUD tag for `CF_ACCESS_AUD`.
5. Redeploy Pages so the Functions receive the D1 binding and variables. Verify `/admin.html` redirects to Access for signed-out users and `/api/admin/orders` returns the orders only after Access authentication.

The public `POST /api/custom-orders` endpoint accepts only same-origin JSON, has a small request limit, requires a valid email, market, and explicit consent, ignores a hidden honeypot submission, and stores only a fixed set of specification fields. Administrative routes validate the signed Cloudflare Access JWT and allow only the configured admin email.

## Local development

Run Pages Functions with a local D1 binding via Wrangler. Apply the migration to the local database before testing submissions. Never point a preview deployment at production order data; use a separate preview D1 database if preview order submission is enabled.
