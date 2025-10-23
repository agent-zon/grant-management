# Implementation Notes: OpenAPI Scalar Integration

**Created**: 2025-10-23
**Last Updated**: 2025-10-23

## Technical Implementation Details

### CDS OpenAPI Compilation

The CDS compiler generates OpenAPI 3.0 specifications with the following characteristics:

**Command Used**:
```bash
npx cds compile srv --service all -o docs --to openapi
```

**Output Files**:
- Each CDS service generates a separate OpenAPI JSON file
- File naming: `{ServiceName}.openapi3.json`
- Location: `docs/` directory at project root

**Generated Services**:
1. **GrantsManagementService** - OAuth 2.0 Grant Management API
2. **AuthorizationService** - OAuth 2.0 Authorization Server
3. **AuthService** - Authentication and user info endpoints
4. **DemoService** - Testing and demo endpoints

**CDS Compilation Issues Found**:
- Enum default values don't support ternary operators
- Must use simple `default` keyword
- Error was in `db/grants.cds:17`

### Scalar Integration Approach

**Why CDN vs NPM Package**:
- React 19 compatibility concerns with npm package
- Simpler integration without build configuration
- Smaller bundle size for portal app
- Can be swapped for npm package later if needed

**CDN Loading Implementation**:
```typescript
const script = document.createElement("script");
script.src = "https://cdn.jsdelivr.net/npm/@scalar/api-reference";
script.async = true;
script.onload = () => {
  // Initialize Scalar after script loads
};
```

**Scalar Initialization**:
```html
<script
  id="api-reference"
  data-url="/resources/openapi/GrantsManagementService.openapi3.json"
></script>
```

### Environment Detection

**Dev vs Hybrid Mode**:
```typescript
const isDev = typeof window !== "undefined" && window.location.port === "5173";
const baseUrl = isDev ? "/openapi" : "/resources/openapi";
```

**Why This Works**:
- Dev mode: Portal runs on port 5173 (Vite default)
- Hybrid mode: Portal accessed through approuter (port 9000)
- Simple port check sufficient for environment detection

### Routing Architecture

**Three-Tier Routing**:

1. **Portal Internal Routes** (`app/portal/app/routes.ts`)
   - Defines `/api-docs` route
   - Maps to `routes/api-docs.tsx` component

2. **Approuter Routes** (`app/router/xs-app.json`)
   - Routes `/api-docs` to portal destination
   - Serves `/resources/openapi/` as static files

3. **React Router** (within api-docs.tsx)
   - Handles service selection
   - Manages Scalar initialization
   - Error boundaries for failed loads

### File Distribution Strategy

**Why Three Locations**:

1. **`app/resources/openapi/`** - Project-level resource
   - Canonical source after generation
   - Version controlled
   - Documentation reference

2. **`app/portal/public/openapi/`** - Dev mode serving
   - Vite serves public/ as static assets
   - No build step needed
   - Fast development iteration

3. **`app/router/resources/openapi/`** - Hybrid mode serving
   - Approuter's localDir for static files
   - Independent of portal build
   - Production-like testing

## Debugging Tips

### If Scalar Doesn't Load

1. **Check Console**:
   - Look for script loading errors
   - Check for CORS issues
   - Verify spec file is accessible

2. **Verify Spec URL**:
```bash
# Dev mode
curl http://localhost:5173/openapi/GrantsManagementService.openapi3.json

# Hybrid mode
curl http://localhost:9000/resources/openapi/GrantsManagementService.openapi3.json
```

3. **Test CDN Access**:
```bash
curl https://cdn.jsdelivr.net/npm/@scalar/api-reference
```

### If Routes Don't Work

1. **Check Approuter Route Order**:
   - More specific routes MUST come before catch-all
   - `/resources/openapi/**` before `/(.*)$`
   - `/api-docs**` before `/(.*)$`

2. **Verify Destination Configuration**:
```json
// In app/router/default-env.json
{
  "destinations": [
    {
      "name": "user-portal",
      "url": "http://localhost:3000",
      "forwardAuthToken": true
    }
  ]
}
```

3. **Check Portal Server**:
   - Ensure portal is running in hybrid mode
   - Verify port matches destination URL
   - Check for port conflicts

### Authentication Testing

**Test Sequence**:
1. Load /api-docs (should work - public route)
2. Try to expand an endpoint in Scalar UI
3. Click "Try it out" on any endpoint
4. Execute the request
5. Observe response:
   - **200 OK**: Auth not required (or token passed)
   - **401 Unauthorized**: Check if IAS login triggered
   - **403 Forbidden**: Auth passed but insufficient permissions
   - **CORS Error**: Expected for cross-origin requests

**If 401 Doesn't Trigger Auth**:
1. Update `app/router/xs-app.json`:
   ```json
   {
     "source": "^/api-docs(.*)$",
     "authenticationType": "ias"  // Change from "none"
   }
   ```
2. Test again - should redirect to IAS login
3. Document behavior in testing results

## Performance Considerations

### Initial Load Time

**Components**:
- Portal app: ~500ms (React + routing)
- Scalar CDN: ~300-500ms (first load, cached after)
- OpenAPI spec: ~50-100ms (small JSON files)
- **Total**: ~1-2 seconds for first load

**Optimization Opportunities**:
- Preload Scalar script in HTML head
- Cache OpenAPI specs with service worker
- Use HTTP/2 for parallel loading
- Consider npm package for production (no CDN dependency)

### Bundle Size Impact

**Added to Portal**:
- api-docs.tsx component: ~5KB
- No significant bundle increase (using CDN)

**Comparison to npm Package**:
- @scalar/api-reference npm: ~500KB+ to bundle
- CDN approach: 0 KB to bundle
- Trade-off: Runtime vs build-time dependency

## Common Issues and Solutions

### Issue: Scalar Not Displaying

**Symptoms**:
- Loading spinner forever
- Blank page
- Console errors about script loading

**Solutions**:
1. Check network tab for CDN request
2. Verify internet connection
3. Try alternative CDN (e.g., unpkg instead of jsdelivr)
4. Fall back to npm package approach

### Issue: OpenAPI Spec Not Found

**Symptoms**:
- 404 errors in network tab
- Scalar shows "spec not found"

**Solutions**:
1. Verify file exists in correct location
2. Check URL path matches environment
3. Verify approuter route configuration
4. Test direct URL access in browser

### Issue: CDS Compilation Fails

**Symptoms**:
- Error during `cds compile`
- No OpenAPI files generated

**Solutions**:
1. Check CDS syntax errors in service definitions
2. Verify all imports and dependencies
3. Check for unsupported CDS features in OpenAPI compilation
4. Review CDS error messages for specific issues

## Future Enhancements

### Short Term
1. Add service switcher dropdown in UI
2. Custom theme matching platform colors exactly
3. Add "Copy as cURL" functionality
4. Implement request/response examples

### Medium Term
1. Version history for API specs
2. Diff viewer between versions
3. Interactive examples with real data
4. API testing workflow integration

### Long Term
1. Auto-generate API client code
2. Performance metrics for endpoints
3. Usage analytics integration
4. Collaborative API documentation editing

## Testing Checklist

### Dev Profile Testing
- [ ] Navigate to http://localhost:5173/api-docs
- [ ] Verify page loads without errors
- [ ] Check all 4 service cards display
- [ ] Scalar loads and shows API endpoints
- [ ] Dark theme matches platform
- [ ] Responsive on mobile (test at 375px width)
- [ ] Can expand/collapse endpoints
- [ ] Can view request/response schemas
- [ ] Back button works to home page

### Hybrid Profile Testing
- [ ] Start all three services (cds, router, portal)
- [ ] Navigate to http://localhost:9000/api-docs
- [ ] Verify routing through approuter works
- [ ] OpenAPI specs load from /resources/openapi/
- [ ] Test "Try it out" functionality
- [ ] Document authentication behavior (401 → login?)
- [ ] Verify token forwarding if authenticated
- [ ] Test logout and re-access

### Cross-Browser Testing
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## Known Limitations

1. **Service Switching**: Currently loads first service only
   - UI shows all services but doesn't switch between them
   - Enhancement needed for multiple spec support

2. **Authentication**: Initial configuration is public
   - May need to change based on testing
   - Documentation assumes IAS will trigger on 401

3. **CDN Dependency**: Requires internet for first load
   - Cached after first load
   - Could be issue in air-gapped environments

4. **Mobile UX**: Scalar UI optimized for desktop
   - Works on mobile but not ideal
   - Consider responsive improvements

## References

- [Scalar Documentation](https://github.com/scalar/scalar)
- [CAP OpenAPI Documentation](https://cap.cloud.sap/docs/advanced/openapi)
- [SAP Approuter Documentation](https://www.npmjs.com/package/@sap/approuter)
- [React Router v7 Documentation](https://reactrouter.com/)

