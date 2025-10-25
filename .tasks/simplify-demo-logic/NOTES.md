# Implementation Notes

## Design Decisions

### Why Remove xstate?

1. **Overkill for Simple Flow**: The permissions elevation flow is sequential (step 1 → 2 → 3), not a complex state machine with multiple branches
2. **Harder to Debug**: State machine transitions are implicit; endpoint calls are explicit
3. **Extra Dependency**: xstate adds ~100KB to bundle size
4. **Learning Curve**: Team members need to understand xstate concepts to modify the flow
5. **API Clarity**: Specific endpoints (`/analysis_request`, `/deployment_request`) are more discoverable than generic `/elevate` with state machine logic

### Step-Based Architecture

Instead of states like `idle`, `analysis_granted`, `deployment_granted`, we use simple integer steps:
- **Step 0**: Initial state (no grant yet)
- **Step 1**: After analysis authorization
- **Step 2**: After deployment authorization
- **Step 3**: After subscription authorization

This maps directly to UI progress indicators and makes the flow obvious.

### Handler Pattern

Each handler follows the same structure:
```typescript
// 1. Configuration at top of file (const)
const CONFIG = { scope, authorization_details, color, risk };

// 2. UI component for rendering
function AuthorizationRequestButton({ ... }) { ... }

// 3. GET handler
export async function GET(this: DemoService, req: cds.Request) {
  // - Validate parameters
  // - Create PAR request
  // - Call authorization service
  // - Render response
  // - Handle errors
}

// 4. POST handler (delegates to GET)
export async function POST(this: DemoService, req: cds.Request) {
  return GET.call(this, req);
}
```

### Callback Flow

The callback function now:
1. Exchanges authorization code for token
2. Extracts step parameter from URL
3. Calculates next step (currentStep + 1)
4. Triggers event with grant_id and next step
5. Updates navbar via HTMX trigger

This creates a natural progression without needing to track state.

## HTMX Usage

### Custom Events

We use custom events to communicate between iframe and parent:
```javascript
const event = new CustomEvent('grant-requested', {
  bubbles: true,
  detail: { grant_id, event, step }
});
window.parent.document.body.dispatchEvent(event);
```

### Event Handling

The navbar listens for these events:
```jsx
<div
  hx-get="/demo/navbar"
  hx-trigger="grant-updated from:body, grant-requested from:body"
  hx-swap="outerHTML"
>
```

When an event fires, HTMX automatically:
1. Makes GET request to `/demo/navbar`
2. Includes event detail as parameters
3. Replaces the navbar with new content
4. Shows current step progress

## Authorization Details Structure

Each step defines specific permissions as RAR `authorization_details`:

### Analysis Step
```typescript
{
  type: "mcp",
  server: "devops-mcp-server",
  tools: { "metrics.read": { essential: true }, ... },
  actions: ["read", "query"],
  locations: ["analytics"]
}
```

### Deployment Step
```typescript
{
  type: "mcp",
  server: "devops-mcp-server",
  tools: { "deploy.read": { essential: true }, ... },
  locations: ["staging", "production"]
},
{
  type: "api",
  urls: ["https://api.deployment.internal/v1/deploy"],
  protocols: ["HTTPS"]
}
```

### Subscription Step
```typescript
{
  type: "mcp",
  server: "billing-mcp-server",
  tools: { "subscription.view": { essential: true }, ... },
  locations: ["subscriptions", "users"]
}
```

These are cumulative - each step adds more permissions to the same grant.

## Error Handling

All handlers include comprehensive error handling:
```typescript
try {
  // Main logic
} catch (e) {
  const error = e as { message: string; stack: string };
  console.error("❌ Error:", error);
  return cds.context?.http?.res.status(500).send(
    renderToString(<div>Error: {error.message}</div>)
  );
}
```

## Console Logging

Each handler logs its progress:
- `🔍` - Starting request
- `✅` - Successful response
- `❌` - Error occurred

This makes debugging the flow easier.

## Future Improvements

### Possible Enhancements

1. **Persistence**: Store step state in database instead of URL parameter
2. **Validation**: Check grant exists before allowing step 2/3
3. **Rollback**: Add ability to revoke and restart from a step
4. **Skip Steps**: Allow optional steps based on user needs
5. **Visual Feedback**: Add loading indicators during authorization
6. **Comparison View**: Show what changed between steps
7. **History**: Show audit log of grant modifications

### Refactoring Opportunities

1. **Shared Components**: Extract common UI components (e.g., `AuthorizationRequestButton`)
2. **Config Management**: Move permission configs to separate file or database
3. **Type Safety**: Create shared types for authorization details
4. **Validation**: Add schema validation for configuration objects
5. **Testing**: Add unit tests for each handler

## Migration Notes

If you need to add a new step:

1. Create new handler file: `handler.new-step-request.tsx`
2. Define configuration constant at top
3. Implement GET/POST handlers
4. Add endpoint to `demo-service.cds`
5. Add method to `demo-service.tsx` that delegates to handler
6. Update navbar to include new step
7. Update callback to handle new step number
8. Update configuration to use appropriate `grant_management_action`

## Related Files

- `/workspace/srv/authorization-service/handler.consent.tsx` - Handles consent after authorization
- `/workspace/srv/grant-management/handler.list.tsx` - Lists grants (similar pattern)
- `/workspace/srv/grant-management/handler.revoke.tsx` - Revokes grants (similar pattern)

## References

- OAuth 2.0 Grant Management: https://drafts.oauth.net/oauth-grant-mgmt/draft-ietf-oauth-grant-management.html
- Rich Authorization Requests: https://www.rfc-editor.org/rfc/rfc9396.html
- HTMX Documentation: https://htmx.org/docs/
