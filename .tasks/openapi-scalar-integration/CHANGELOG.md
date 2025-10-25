# CHANGELOG

## 2025-10-23 12:15 UTC — Separate static /api-docs
- Changed: Serve `/api-docs` as static Scalar page (dev and hybrid)
- Added: `app/portal/public/api-docs/index.html` (dev)
- Added: `app/router/resources/api-docs/index.html` (hybrid)
- Updated: `app/router/xs-app.json` to serve `/api-docs` from `localDir`
- Removed: Portal route `app/portal/app/routes/api-docs.tsx`
- Updated: `app/portal/app/routes.ts` to remove `route("api-docs", ...)`
- Left: `welcome.tsx` link to `/api-docs` intact

## 2025-10-23 12:10 UTC — OpenAPI scripts
- Added: `openapi:generate`, `openapi:copy:dev`, `openapi:copy:hybrid`, `openapi:prepare` npm scripts in root `package.json`
- Purpose: Generate and distribute OpenAPI specs to both dev and hybrid static locations

## 2025-10-23 12:05 UTC — Routing strategy
- Decision: Prefer local static pages for `/api-docs` to decouple from portal
- Reason: Avoid portal deployment coupling and enable approuter-only serving
