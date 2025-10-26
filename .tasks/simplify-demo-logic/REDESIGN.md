# Demo Service Redesign - Simpler RESTful Approach

**Created**: 2025-10-25
**Status**: In Progress

## New Architecture

Based on feedback, switching from scope-based config to simple RESTful routes with grant_id in path.

### Key Principles

1. **No Config Map** - Each API route is specific, no dynamic configuration
2. **Grant ID in URL** - `/demo/devops_bot/{grant_id}/...`
3. **Specific Routes** - Each route does one thing
4. **Grant-Aware UIs** - Sections check grant and render accordingly
5. **Mustache Templates** - For JSON rendering
6. **Simple** - No xstate, no complex state management

### URL Structure

```
/demo/devops_bot/
  /index                              → Generate grant_id, redirect to shell
  /{grant_id}/shell                   → Main shell page with buttons
  /{grant_id}/requests/analyze        → PAR request for analysis
  /{grant_id}/requests/deploy         → PAR request for deployment
  /{grant_id}/requests/monitor        → PAR request for monitoring
  /{grant_id}/analyze                 → Analysis UI (grant-aware)
  /{grant_id}/deploy                  → Deployment UI (grant-aware)
  /{grant_id}/monitor                 → Monitoring UI (grant-aware)
  /{grant_id}/callback                → OAuth callback
```

### Shell Page

```tsx
<div>
  <h1>DevOps Bot - {grant_id}</h1>
  
  {/* Actions */}
  <button hx-get="/{grant_id}/requests/analyze">Request Analysis</button>
  <button hx-get="/{grant_id}/requests/deploy">Request Deployment</button>
  
  {/* Grant Details - fetched from grant-management API */}
  <div 
    hx-get="/grants-management/Grants/{grant_id}"
    hx-headers='{"Accept": "application/json"}'
    hx-trigger="load, grant-updated from:body"
  >
    {/* Rendered with Mustache template */}
  </div>
  
  {/* Content area */}
  <div id="content">
    {/* Dynamic content from requests */}
  </div>
</div>
```

### Request Routes

Each request route:
1. Creates PAR request with specific permissions
2. Returns HTML with request details and authorize button
3. Simple, no config lookup

```tsx
async analyze_request(grant_id: string) {
  const request = {
    scope: "analytics_read",
    authorization_details: [...specific details...],
    grant_id,
    ...
  };
  
  const response = await authorizationService.par(request);
  
  return (
    <div>
      <pre>{JSON.stringify(request, null, 2)}</pre>
      <form action="/authorize">
        <input type="hidden" name="request_uri" value={response.request_uri} />
        <button>Authorize</button>
      </form>
    </div>
  );
}
```

### Section UIs

Each section:
1. Fetches grant from grant-management API
2. Checks if permission is granted
3. Renders enabled UI or disabled/sketch mode

```tsx
async deploy(grant_id: string) {
  const grant = await fetch(`/grants-management/Grants/${grant_id}`);
  const hasDeployPermission = grant.scope.includes("deployments");
  
  if (!hasDeployPermission) {
    return (
      <div class="opacity-50">
        <h3>Deployment (Disabled)</h3>
        <button hx-get="/{grant_id}/requests/deploy">
          Request Access
        </button>
      </div>
    );
  }
  
  return (
    <div>
      <h3>Deployment</h3>
      {/* Actual deployment UI */}
      <button>Deploy to Staging</button>
      <button>Deploy to Production</button>
    </div>
  );
}
```

### Callback

Simple: exchange code for token, return JSON

```tsx
async callback(code, ...) {
  const tokenResponse = await authorizationService.token({...});
  
  return (
    <div>
      <h3>Token Response</h3>
      <pre>{JSON.stringify(tokenResponse, null, 2)}</pre>
      <div hx-trigger="grant-updated from:body"></div>
    </div>
  );
}
```

### Benefits

1. **Simple** - Each route is standalone
2. **RESTful** - Grant ID in URL, not hidden
3. **No Config** - Code is self-documenting
4. **Flexible** - Easy to add new routes
5. **Grant-Aware** - UIs check actual permissions
6. **Multiple Instances** - Different grant_ids = different sessions

### Implementation Status

- [x] Service definition updated
- [x] Shell page with grant_id generation
- [x] Request routes (analyze, deploy, monitor)
- [x] Callback with JSON response
- [ ] Section UIs with grant-aware rendering
- [ ] Mustache template integration
- [ ] Testing

### Next Steps

1. Complete section UI implementations
2. Add grant checking logic
3. Style disabled/sketch modes
4. Test full flow
5. Remove old scope-config approach
