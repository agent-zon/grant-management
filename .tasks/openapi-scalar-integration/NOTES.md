# NOTES

## Static /api-docs Implementation
- Dev: `app/portal/public/api-docs/index.html` served by Vite/dev and static in prod build
- Hybrid: `app/router/resources/api-docs/index.html` served via approuter localDir
- OpenAPI specs loaded from:
  - Dev: `/openapi/*.openapi3.json` (portal public)
  - Hybrid: `/resources/openapi/*.openapi3.json` (approuter resources)

## Approuter Routing
- xs-app routes added before catch-all:
```json
{
  "source": "^/api-docs$",
  "target": "/index.html",
  "localDir": "./resources/api-docs",
  "csrfProtection": false,
  "authenticationType": "none"
},
{
  "source": "^/api-docs/(.*)$",
  "target": "/$1",
  "localDir": "./resources/api-docs",
  "csrfProtection": false,
  "authenticationType": "none"
}
```

## OpenAPI Generation & Distribution
- Scripts:
  - `openapi:generate` → compile CDS to OpenAPI into `docs/`
  - `openapi:copy:dev` → copy to `app/portal/public/openapi/`
  - `openapi:copy:hybrid` → copy to `app/router/resources/openapi/`
  - `openapi:prepare` → run all

## Testing Plan
- Dev profile:
  - Start portal: `npm run dev -w portal`
  - Open: `http://localhost:5173/api-docs`
  - Verify Scalar loads and shows all services
- Hybrid profile:
  - Start services: `npm run hybrid:cds`, `npm run hybrid:approuter`, `npm run hybrid:portal`
  - Open: `http://localhost:9000/api-docs`
  - Verify static page served and specs load from `/resources/openapi/`

## Follow-ups
- If auth required, change `authenticationType` to `ias` for `/api-docs*` routes
