<!-- f61d8be5-4332-4493-9075-f1a0b1e00856 31da69ef-27f2-4fb2-9699-bb92f60ec340 -->
# OpenAPI Documentation with Scalar Integration

## Overview

Set up interactive API documentation using Scalar to display OpenAPI specs generated from CDS services. The docs will be accessible at `/api-docs` in both dev and hybrid modes.

## Implementation Steps

### 1. Generate OpenAPI Specification

- Run `npx cds compile srv --service all -o docs --to openapi` to generate OpenAPI specs from all CDS services
- Output will be in `docs/` folder at project root
- Files expected: OpenAPI JSON/YAML for each service (grant-management, authorization-service, auth-service, demo-service)

### 2. Create Static Resources Structure for Approuter

- Create `app/resources/` folder for static assets served by approuter
- Copy generated OpenAPI spec(s) to `app/resources/openapi/`
- Structure: `app/resources/openapi/services.openapi.json` (or individual service files)

### 3. Install Scalar Dependencies

- Add to `app/portal/package.json`:
  - `@scalar/api-reference` - Scalar React component for API docs
  - `@scalar/api-reference-react` - React bindings
- Run `npm install` in portal workspace

### 4. Create API Documentation Route

- File: `app/portal/app/routes/api-docs.tsx`
- Import Scalar's `ApiReferenceReact` component
- Configure to load OpenAPI spec from:
  - Dev mode: fetch from `/openapi/services.openapi.json` (served by portal's public folder)
  - Hybrid mode: fetch from approuter at `/resources/openapi/services.openapi.json`
- Use Scalar's dark theme to match portal design (from `app.css`)

### 5. Add Route Configuration

- Update `app/portal/app/routes.ts`:
  - Add `route("api-docs", "routes/api-docs.tsx")`
- Add link to home page (`app/portal/app/welcome/welcome.tsx`) in resources list

### 6. Configure Portal Public Assets (Dev Mode)

- Copy OpenAPI spec to `app/portal/public/openapi/` for dev mode
- Ensure Vite serves this in development

### 7. Configure Approuter Routes (Hybrid Mode)

- Update `app/router/xs-app.json`:
  - Add route BEFORE catch-all for `/resources/openapi/**`:
    ```json
    {
      "source": "^/resources/openapi/(.*)$",
      "target": "/$1",
      "localDir": "./resources/openapi",
      "csrfProtection": false,
      "authenticationType": "none"
    }
    ```

  - Add route for portal's `/api-docs` page:
    ```json
    {
      "source": "^/api-docs(.*)$",
      "target": "/api-docs$1",
      "destination": "user-portal",
      "csrfProtection": false,
      "authenticationType": "none"
    }
    ```

- Create `app/router/resources/openapi/` folder
- Copy OpenAPI spec there

### 8. Testing Plan

- **Dev Profile** (`npm run dev` in portal):
  - Navigate to `http://localhost:5173/api-docs`
  - Verify Scalar loads and displays API documentation
  - Test API calls from Scalar UI (should get CORS or 401 errors - expected)

- **Hybrid Profile** (`npm run hybrid:cds` + `npm run hybrid:router` + `npm run hybrid:portal`):
  - Navigate to `http://localhost:9000/api-docs` (through approuter)
  - Verify Scalar loads
  - Test API calls from Scalar UI - if 401 triggers auth flow, keep public; otherwise switch to `"authenticationType": "ias"`

### 9. Documentation (Task Management)

Create task folder `.tasks/openapi-scalar-integration/`:

- **TASK_DEFINITION.md**: Document requirements and acceptance criteria
- **STATUS.md**: Track implementation progress
- **CHANGELOG.md**: Log all decisions and changes
- **NOTES.md**: Implementation details and findings
- **memory-bank/**:
  - `00_openapi-generation.md`: CDS OpenAPI compilation process
  - `01_scalar-integration.md`: Scalar setup and configuration
  - `02_routing-configuration.md`: Dev vs hybrid routing differences
  - `03_testing-results.md`: Test outcomes and auth flow observations

### 10. Follow-up Configuration

- If 401 doesn't trigger auth in hybrid mode, update both `/resources/openapi/**` and `/api-docs**` routes to use `"authenticationType": "ias"`
- Document the decision in CHANGELOG.md

## Key Files to Modify

- `app/portal/package.json` - Add Scalar dependencies
- `app/portal/app/routes.ts` - Add api-docs route
- `app/portal/app/routes/api-docs.tsx` - New file with Scalar component
- `app/portal/app/welcome/welcome.tsx` - Add link to API docs
- `app/router/xs-app.json` - Add approuter routes
- `.tasks/openapi-scalar-integration/` - New documentation folder

## Expected Output

- Interactive API documentation at `/api-docs`
- Beautiful, searchable interface showing all CDS services
- Working in both dev and hybrid modes
- Proper authentication flow (if needed)
- Complete documentation of implementation

### To-dos

- [ ] Generate OpenAPI specs using cds compile command
- [ ] Create app/resources/ structure and copy OpenAPI specs
- [ ] Add @scalar/api-reference-react to portal dependencies
- [ ] Create app/portal/app/routes/api-docs.tsx with Scalar component
- [ ] Update routes.ts and xs-app.json for both dev and hybrid modes
- [ ] Test in dev profile and verify Scalar loads correctly
- [ ] Test in hybrid profile with approuter and check auth flow
- [ ] Create .tasks/openapi-scalar-integration/ with all required docs