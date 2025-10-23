# Routing Configuration: Dev vs Hybrid Modes

**Created**: 2025-10-23
**Last Updated**: 2025-10-23
**Category**: [CONFIGURATION]
**Timeline**: [02] of [04] - Routing Architecture

## Overview

Comprehensive documentation of routing configuration for API documentation in both development and hybrid (production-like) deployment modes.

## Architecture Overview

### Three-Layer Routing

```
┌─────────────────────────────────────────┐
│         User Browser                    │
└──────────────┬──────────────────────────┘
               │
               ├─ Dev Mode ────────────────┐
               │   :5173/api-docs          │
               │   (Direct to Portal)      │
               └───────────────────────────┘
               │
               └─ Hybrid Mode ─────────────┐
                   :9000/api-docs          │
                   (Through Approuter)     │
               ┌───────────────────────────┘
               │
        ┌──────┴──────┐
        │  Approuter  │ (xs-app.json routes)
        │  Port 9000  │
        └──────┬──────┘
               │
      ┌────────┴────────┐
      │                 │
  ┌───▼────┐      ┌────▼───┐
  │ Portal │      │  CDS   │
  │ :3000  │      │ :55006 │
  └────────┘      └────────┘
```

## Development Mode Routing

### Port Configuration

**Portal Dev Server**: `http://localhost:5173`
- Vite development server
- Hot Module Replacement (HMR)
- Direct access without approuter

### Static Asset Serving

**Vite Public Directory**:
```
app/portal/public/
└── openapi/
    ├── GrantsManagementService.openapi3.json
    ├── AuthorizationService.openapi3.json
    ├── AuthService.openapi3.json
    └── DemoService.openapi3.json
```

**URL Mapping**:
- File: `app/portal/public/openapi/GrantsManagementService.openapi3.json`
- Served at: `http://localhost:5173/openapi/GrantsManagementService.openapi3.json`
- No configuration needed - Vite serves public/ automatically

### React Router Configuration

**File**: `app/portal/app/routes.ts`

```typescript
export default [
  // ... existing routes
  route("api-docs", "routes/api-docs.tsx"),
  // ...
] satisfies RouteConfig;
```

**URL**: `http://localhost:5173/api-docs`

**Request Flow**:
```
Browser Request: /api-docs
    ↓
React Router: Matches route("api-docs", ...)
    ↓
Component: api-docs.tsx renders
    ↓
Scalar Loads: Fetches /openapi/GrantsManagementService.openapi3.json
    ↓
Vite Serves: From public/openapi/
```

### Environment Detection

```typescript
const isDev = typeof window !== "undefined" && window.location.port === "5173";
const baseUrl = isDev ? "/openapi" : "/resources/openapi";
```

**Why This Works**:
- Vite dev server always uses port 5173
- Simple and reliable detection
- No environment variables needed

## Hybrid Mode Routing

### Service Architecture

**Three Services Running**:

1. **CDS Service** - Port 55006 (or configured)
   ```bash
   npm run hybrid:cds
   # Runs: cds watch --profile hybrid
   ```

2. **Approuter** - Port 9000
   ```bash
   npm run hybrid:router
   # Runs: @sap/approuter in app/router/
   ```

3. **Portal** - Port 3000
   ```bash
   npm run hybrid:portal
   # Runs: node server.js (production mode)
   ```

### Approuter Configuration

**File**: `app/router/xs-app.json`

**Critical**: Route order matters! More specific routes MUST come before catch-all.

```json
{
  "routes": [
    // 1. OpenAPI Static Files (FIRST)
    {
      "source": "^/resources/openapi/(.*)$",
      "target": "/$1",
      "localDir": "./resources/openapi",
      "csrfProtection": false,
      "authenticationType": "none"
    },
    
    // 2. API Docs Page (SECOND)
    {
      "source": "^/api-docs(.*)$",
      "target": "/api-docs$1",
      "destination": "user-portal",
      "csrfProtection": false,
      "authenticationType": "none"
    },
    
    // ... other routes ...
    
    // 99. Catch-all (LAST)
    {
      "source": "^/(.*)$",
      "target": "$1",
      "destination": "srv-api",
      "csrfProtection": false,
      "authenticationType": "ias"
    }
  ]
}
```

### Route Explanation

#### Route 1: OpenAPI Static Files

```json
{
  "source": "^/resources/openapi/(.*)$",
  "target": "/$1",
  "localDir": "./resources/openapi",
  "csrfProtection": false,
  "authenticationType": "none"
}
```

**Purpose**: Serve OpenAPI JSON files as static assets

**Behavior**:
- Request: `http://localhost:9000/resources/openapi/GrantsManagementService.openapi3.json`
- Matches: `^/resources/openapi/(.*)$`
- Captures: `GrantsManagementService.openapi3.json`
- Target: `/$1` → `/GrantsManagementService.openapi3.json`
- Serves from: `app/router/resources/openapi/GrantsManagementService.openapi3.json`

**Key Settings**:
- `localDir`: Serves files from approuter's local directory
- `authenticationType: "none"`: Public access (no login required)
- `csrfProtection: false`: No CSRF token needed for GET requests

#### Route 2: API Docs Page

```json
{
  "source": "^/api-docs(.*)$",
  "target": "/api-docs$1",
  "destination": "user-portal",
  "csrfProtection": false,
  "authenticationType": "none"
}
```

**Purpose**: Proxy API docs page requests to portal app

**Behavior**:
- Request: `http://localhost:9000/api-docs`
- Matches: `^/api-docs(.*)$`
- Forwards to: `user-portal` destination
- Destination resolves to: `http://localhost:3000/api-docs`

**Key Settings**:
- `destination`: Routes to portal app (not local files)
- `target`: Preserves path (`/api-docs`)
- `authenticationType: "none"`: Testing auth behavior

### Destination Configuration

**File**: `app/router/default-env.json`

```json
{
  "destinations": [
    {
      "name": "srv-api",
      "url": "http://localhost:55006",
      "forwardAuthToken": true
    },
    {
      "name": "user-portal",
      "url": "http://localhost:3000",
      "forwardAuthToken": true
    }
  ]
}
```

**Purpose**:
- Defines where approuter forwards requests
- `srv-api`: CDS service backend
- `user-portal`: React portal frontend

**forwardAuthToken**:
- When `true`, passes IAS auth token to destination
- Allows portal/backend to identify authenticated user
- Required for protected routes

### Request Flow in Hybrid Mode

**API Docs Page Request**:
```
Browser: http://localhost:9000/api-docs
    ↓
Approuter: Matches ^/api-docs(.*)$
    ↓
Destination: user-portal (http://localhost:3000)
    ↓
Portal: React Router matches /api-docs
    ↓
Component: api-docs.tsx renders
    ↓
Scalar: Requests /resources/openapi/GrantsManagementService.openapi3.json
    ↓
Approuter: Matches ^/resources/openapi/(.*)$
    ↓
Local Files: Serves from ./resources/openapi/
    ↓
Browser: Displays API documentation
```

## Authentication Configuration

### Current State: Public Access

**Setting**: `authenticationType: "none"`

**Rationale**:
1. Test if 401 errors trigger IAS login automatically
2. Allow anonymous documentation browsing
3. APIs themselves still require auth

**Testing Needed**:
- Access /api-docs without login
- Try API calls from Scalar UI
- Observe if 401 → IAS redirect happens

### Future State: Protected Access (If Needed)

**If 401 doesn't trigger auth**, update routes:

```json
{
  "source": "^/resources/openapi/(.*)$",
  "authenticationType": "ias"  // Change from "none"
},
{
  "source": "^/api-docs(.*)$",
  "authenticationType": "ias"  // Change from "none"
}
```

**Effect**:
- User must login before accessing docs
- IAS redirects to login page
- Token forwarded to portal and APIs

**Consideration**: Documentation often public in SaaS products
- Stripe, Twilio, etc. have public API docs
- Actual API endpoints still require auth
- Documentation exposure is low risk

## Route Ordering Importance

### Why Order Matters

Approuter processes routes **sequentially** from top to bottom:

1. ❌ **Wrong Order** (Catch-all first):
```json
{
  "routes": [
    {"source": "^/(.*)$", "destination": "srv-api"},  // ← Catches everything
    {"source": "^/api-docs(.*)$", "destination": "user-portal"}  // ← Never reached
  ]
}
```

2. ✅ **Correct Order** (Specific first):
```json
{
  "routes": [
    {"source": "^/resources/openapi/(.*)$", "localDir": "./resources/openapi"},
    {"source": "^/api-docs(.*)$", "destination": "user-portal"},
    {"source": "^/(.*)$", "destination": "srv-api"}  // ← Last
  ]
}
```

### Testing Route Order

**Verify Priority**:
```bash
# Should serve from localDir (not srv-api)
curl http://localhost:9000/resources/openapi/GrantsManagementService.openapi3.json

# Should route to user-portal (not srv-api)
curl -I http://localhost:9000/api-docs
```

## Common Issues and Solutions

### Issue: 404 on /api-docs in Hybrid

**Symptoms**: 
- Works in dev mode
- 404 in hybrid mode through approuter

**Checks**:
1. Is portal running? (`npm run hybrid:portal`)
2. Is destination configured? (Check default-env.json)
3. Is route before catch-all? (Check xs-app.json order)

**Solution**:
```bash
# Verify portal is accessible directly
curl http://localhost:3000/api-docs

# Verify approuter routing
curl -v http://localhost:9000/api-docs
# Should see proxy to localhost:3000
```

### Issue: 404 on OpenAPI Specs

**Symptoms**:
- Scalar loads but can't find spec
- 404 on /resources/openapi/*.json

**Checks**:
1. Files exist in `app/router/resources/openapi/`
2. Route configured with `localDir`
3. Route before catch-all

**Solution**:
```bash
# Test direct file access
ls -la app/router/resources/openapi/

# Test approuter serving
curl http://localhost:9000/resources/openapi/GrantsManagementService.openapi3.json
```

### Issue: Wrong Spec URL in Component

**Symptoms**:
- Portal tries to fetch from wrong URL
- Environment detection not working

**Checks**:
1. Port detection logic
2. baseUrl calculation
3. Spec file name

**Solution**:
```typescript
// Add debug logging
console.log('isDev:', isDev);
console.log('window.location.port:', window.location.port);
console.log('baseUrl:', baseUrl);
console.log('specUrl:', specUrl);
```

## Performance Considerations

### Dev Mode

**Advantages**:
- ✅ Faster iteration (HMR)
- ✅ No proxy overhead
- ✅ Direct file access

**Limitations**:
- ❌ No authentication testing
- ❌ Different URL structure
- ❌ CORS may differ

### Hybrid Mode

**Advantages**:
- ✅ Production-like environment
- ✅ Authentication testing
- ✅ Realistic routing

**Limitations**:
- ❌ Slower startup (3 services)
- ❌ More complex debugging
- ❌ Port management required

## Testing Checklist

### Dev Profile
- [ ] Portal starts on port 5173
- [ ] Navigate to http://localhost:5173/api-docs
- [ ] Page loads without errors
- [ ] Scalar displays API documentation
- [ ] OpenAPI specs fetch from /openapi/
- [ ] No 404 errors in console

### Hybrid Profile
- [ ] All three services running (CDS, router, portal)
- [ ] Navigate to http://localhost:9000/api-docs
- [ ] Approuter routes to portal correctly
- [ ] OpenAPI specs fetch from /resources/openapi/
- [ ] Test direct spec URL access
- [ ] Verify authentication behavior
- [ ] Check token forwarding if authenticated

### Route Priority
- [ ] /resources/openapi/ routes to local files (not srv-api)
- [ ] /api-docs routes to user-portal (not srv-api)
- [ ] /auth/api/me routes to srv-api (existing route)
- [ ] Other paths route to srv-api (catch-all)

## Documentation Updates

### When Routes Change

**Update These Files**:
1. `.tasks/openapi-scalar-integration/CHANGELOG.md`
2. `.tasks/openapi-scalar-integration/memory-bank/02_routing-configuration.md` (this file)
3. `README.md` (if user-facing docs exist)

### When Adding New Routes

**Checklist**:
- [ ] Add route in correct position (before catch-all)
- [ ] Test route priority
- [ ] Document in CHANGELOG
- [ ] Update routing diagrams
- [ ] Test in both modes

## References

- [SAP Approuter Documentation](https://www.npmjs.com/package/@sap/approuter)
- [xs-app.json Configuration](https://help.sap.com/docs/btp/sap-business-technology-platform/application-router-configuration-syntax)
- [React Router v7 Routing](https://reactrouter.com/en/main/start/overview)
- [Vite Static Assets](https://vitejs.dev/guide/assets.html#the-public-directory)

