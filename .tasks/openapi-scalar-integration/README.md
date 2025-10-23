# OpenAPI Scalar Integration - Complete Implementation Guide

**Project**: Agent Grants Platform
**Feature**: Interactive API Documentation with Scalar
**Status**: Ready for Testing
**Date**: 2025-10-23

## Quick Start

### For Testing

**Development Mode**:
```bash
cd app/portal
npm install  # If not already done
npm run dev
# Navigate to: http://localhost:5173/api-docs
```

**Hybrid Mode**:
```bash
# Terminal 1 - CDS Service
npm run hybrid:cds

# Terminal 2 - Approuter
npm run hybrid:router

# Terminal 3 - Portal
npm run hybrid:portal

# Navigate to: http://localhost:9000/api-docs
```

## What Was Implemented

### 1. OpenAPI Generation ✅

Generated OpenAPI 3.0 specifications from CDS services:

```bash
npx cds compile srv --service all -o docs --to openapi
```

**Output**:
- `docs/GrantsManagementService.openapi3.json` - OAuth 2.0 Grant Management API
- `docs/AuthorizationService.openapi3.json` - OAuth 2.0 Authorization Server
- `docs/AuthService.openapi3.json` - Authentication endpoints
- `docs/DemoService.openapi3.json` - Demo/testing endpoints

### 2. Directory Structure ✅

Created and populated:
```
app/
├── resources/openapi/           # Project-level resources
│   └── *.openapi3.json
├── portal/public/openapi/       # Dev mode static assets
│   └── *.openapi3.json
└── router/resources/openapi/    # Hybrid mode static files
    └── *.openapi3.json
```

### 3. Portal Integration ✅

**Files Created/Modified**:
- ✅ `app/portal/app/routes/api-docs.tsx` - API documentation page
- ✅ `app/portal/app/routes.ts` - Added api-docs route
- ✅ `app/portal/app/welcome/welcome.tsx` - Added nav link
- ✅ `app/portal/package.json` - Added Scalar dependency

**Features**:
- Service overview cards (4 services)
- CDN-based Scalar loading
- Environment-aware spec loading (dev vs hybrid)
- Dark theme matching platform
- Loading states and error handling
- Responsive design

### 4. Approuter Configuration ✅

**File Modified**: `app/router/xs-app.json`

**Routes Added** (before catch-all):
```json
{
  "source": "^/resources/openapi/(.*)$",
  "target": "/$1",
  "localDir": "./resources/openapi",
  "csrfProtection": false,
  "authenticationType": "none"
},
{
  "source": "^/api-docs(.*)$",
  "target": "/api-docs$1",
  "destination": "user-portal",
  "csrfProtection": false,
  "authenticationType": "none"
}
```

### 5. Bug Fixes ✅

**Fixed**: CDS syntax error in `db/grants.cds:17`
- **Issue**: Enum default value with ternary operator
- **Fix**: Changed to simple `default 'active'`
- **Impact**: Allows successful OpenAPI compilation

### 6. Documentation ✅

**Task Documentation**:
- `TASK_DEFINITION.md` - Requirements and acceptance criteria
- `STATUS.md` - Progress tracking
- `CHANGELOG.md` - All changes and decisions
- `NOTES.md` - Implementation details
- `README.md` - This file

**Memory Bank**:
- `memory-bank/00_openapi-generation.md` - CDS OpenAPI compilation
- `memory-bank/01_scalar-integration.md` - Scalar setup
- `memory-bank/02_routing-configuration.md` - Dev vs hybrid routing
- `memory-bank/03_testing-results.md` - Testing template

## File Locations Reference

### OpenAPI Specs (3 locations)

1. **Source** (version controlled):
   ```
   docs/*.openapi3.json
   ```

2. **Portal Dev Mode**:
   ```
   app/portal/public/openapi/*.openapi3.json
   ```
   - Served by Vite at `/openapi/*.json`
   - Access: `http://localhost:5173/openapi/GrantsManagementService.openapi3.json`

3. **Hybrid Mode**:
   ```
   app/router/resources/openapi/*.openapi3.json
   ```
   - Served by Approuter at `/resources/openapi/*.json`
   - Access: `http://localhost:9000/resources/openapi/GrantsManagementService.openapi3.json`

### Code Files

**Portal App**:
```
app/portal/
├── app/
│   ├── routes/
│   │   └── api-docs.tsx          # NEW: API documentation page
│   ├── routes.ts                  # MODIFIED: Added api-docs route
│   └── welcome/
│       └── welcome.tsx            # MODIFIED: Added nav link
└── package.json                   # MODIFIED: Added Scalar dependency
```

**Approuter**:
```
app/router/
├── resources/
│   └── openapi/                   # NEW: OpenAPI specs for hybrid mode
└── xs-app.json                    # MODIFIED: Added routes
```

**CDS**:
```
db/
└── grants.cds                     # MODIFIED: Fixed enum syntax
```

## Testing Checklist

### Before Testing
- [ ] Free up disk space if needed
- [ ] Run `npm install` in `app/portal`
- [ ] Verify all 3 OpenAPI spec locations have files

### Dev Profile Testing
- [ ] Start portal: `npm run dev` (in app/portal)
- [ ] Access: `http://localhost:5173/api-docs`
- [ ] Verify page loads
- [ ] Check Scalar displays endpoints
- [ ] Test navigation back to home
- [ ] Check console for errors

### Hybrid Profile Testing
- [ ] Start CDS: `npm run hybrid:cds`
- [ ] Start Router: `npm run hybrid:router`
- [ ] Start Portal: `npm run hybrid:portal`
- [ ] Access: `http://localhost:9000/api-docs`
- [ ] Verify routing through approuter
- [ ] Test OpenAPI spec loading
- [ ] Try API call from Scalar (observe auth behavior)
- [ ] Document if 401 triggers IAS login

### Authentication Decision
- [ ] Test API calls without auth
- [ ] Observe response (401, CORS, etc.)
- [ ] Determine if docs should require auth
- [ ] Update routes if needed (see below)

## Authentication Configuration

### Current State: Public Access
- Routes configured with `authenticationType: "none"`
- Allows anonymous documentation browsing
- Actual APIs still require authentication

### If Authentication Needed

**When to Add Auth**:
- If 401 errors don't trigger IAS login
- If documentation should be private
- If stakeholders request protected docs

**How to Add Auth**:

Update `app/router/xs-app.json`:
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

Then restart approuter and test.

## Regenerating OpenAPI Specs

### When CDS Services Change

**Manual Process**:
```bash
# 1. Regenerate specs
npx cds compile srv --service all -o docs --to openapi

# 2. Copy to all locations
cp docs/*.openapi3.json app/resources/openapi/
cp docs/*.openapi3.json app/portal/public/openapi/
cp docs/*.openapi3.json app/router/resources/openapi/

# 3. Commit updated specs
git add docs/*.openapi3.json
git add app/**/openapi/*.openapi3.json
git commit -m "chore: regenerate OpenAPI specifications"
```

**Automated Script** (Future):
```json
{
  "scripts": {
    "openapi:generate": "npx cds compile srv --service all -o docs --to openapi",
    "openapi:copy": "cp docs/*.openapi3.json app/resources/openapi/ && cp docs/*.openapi3.json app/portal/public/openapi/ && cp docs/*.openapi3.json app/router/resources/openapi/",
    "openapi:refresh": "npm run openapi:generate && npm run openapi:copy"
  }
}
```

## Troubleshooting

### Issue: npm install fails

**Symptoms**: ENOSPC: no space left on device

**Solution**:
```bash
# Free up space
npm cache clean --force
rm -rf node_modules
df -h  # Check disk space

# Try again
npm install
```

### Issue: API docs page shows 404

**Dev Mode**:
```bash
# Check portal is running
ps aux | grep "vite"

# Verify route exists
curl http://localhost:5173/api-docs
```

**Hybrid Mode**:
```bash
# Check all services running
ps aux | grep "cds\|approuter\|node server"

# Test routing
curl -I http://localhost:9000/api-docs
# Should redirect/proxy to portal

# Test approuter config
curl http://localhost:9000/resources/openapi/GrantsManagementService.openapi3.json
# Should return JSON
```

### Issue: Scalar doesn't load

**Check**:
1. Network tab for CDN request
2. Console for JavaScript errors
3. OpenAPI spec URL is correct

**Debug**:
```javascript
// In browser console
console.log('Port:', window.location.port);
console.log('Spec URL:', document.querySelector('[data-url]')?.getAttribute('data-url'));
```

### Issue: OpenAPI specs not found

**Verify Files Exist**:
```bash
# Dev mode
ls -la app/portal/public/openapi/

# Hybrid mode
ls -la app/router/resources/openapi/

# Both should show *.openapi3.json files
```

## Next Steps

### Immediate (Before Merge)
1. Complete npm install in app/portal
2. Test in dev profile
3. Test in hybrid profile
4. Fill in `memory-bank/03_testing-results.md`
5. Make authentication decision
6. Take screenshots for documentation
7. Update STATUS.md to COMPLETED

### Short-term Enhancements
1. Add service switcher dropdown
2. Custom Scalar theme matching platform exactly
3. Add regeneration script to package.json
4. Add pre-commit hook for spec regeneration

### Long-term Ideas
1. Version history for API specs
2. API testing workflow integration
3. Auto-generate client code
4. Usage analytics

## References

### Internal Documentation
- `TASK_DEFINITION.md` - Full requirements
- `CHANGELOG.md` - All changes made
- `NOTES.md` - Implementation details
- `memory-bank/*.md` - Knowledge base

### External Resources
- [Scalar GitHub](https://github.com/scalar/scalar)
- [CAP OpenAPI](https://cap.cloud.sap/docs/advanced/openapi)
- [SAP Approuter](https://www.npmjs.com/package/@sap/approuter)
- [React Router v7](https://reactrouter.com/)

## Questions or Issues?

If you encounter problems:

1. Check `NOTES.md` for common issues
2. Review `memory-bank/02_routing-configuration.md` for routing help
3. Check console and network tabs for errors
4. Verify all services are running
5. Test direct URL access to diagnose routing

## Success Criteria

✅ This implementation is successful when:

1. OpenAPI specs generated and distributed
2. Dev mode documentation accessible at :5173/api-docs
3. Hybrid mode documentation accessible at :9000/api-docs
4. Scalar displays all API endpoints
5. Dark theme matches platform
6. Responsive on mobile/tablet
7. No console errors
8. Authentication decision documented
9. All documentation complete
10. Tests passing

---

**Implementation Status**: READY FOR TESTING
**Last Updated**: 2025-10-23
**Next Action**: Run tests and complete testing-results.md

