# Notes — Connection Management / Interpolation Feature

**Created**: 2026-03-08  
**Last Updated**: 2026-03-08  
**Category**: [NOTES] [INVESTIGATION]

---

## Key Findings from Codebase Analysis

### 1. Current Destination Proxy (`handler.destination.tsx`)

The existing handler in `grant-tools-service`:
- Uses `useOrFetchDestination({ destinationName, jwt, selectionStrategy: subscriberFirst })`.
- Calls `isHttpDestination(destination)` to guard before creating transport.
- Builds merged headers via `buildMergedHeaders()` — prioritises `destination.authTokens[].http_header` fields.
- For `OAuth2AuthorizationCode` destinations, the Cloud SDK cannot fetch a token automatically (requires user interaction). The `authTokens` array will be empty or the destination fetch may fail.

**Key gap**: No branch exists for `destination.authentication === 'OAuth2AuthorizationCode'`.

### 2. SAP Cloud SDK Destination Shape (OAuth2AuthorizationCode)

When a destination is configured as `OAuth2AuthorizationCode` in BTP, the Cloud SDK exposes:
```ts
destination.authentication      // 'OAuth2AuthorizationCode'
destination.clientId            // OAuth client_id
destination.clientSecret        // OAuth client_secret
destination.tokenServiceUrl     // Token endpoint URL
destination.url                 // The target MCP server URL
// Possibly also:
destination.authorizationUrl    // Authorization endpoint (if set in destination config)
```

The `tokenServiceUrl` and `authorizationUrl` are needed to build the authorization redirect and the token exchange POST.

### 3. MCP Tool Registration Pattern (from `handler.tools.tsx`)

Tool registration follows this pattern:
```ts
req.data.server.registerTool(toolName, {
  title, description, inputSchema (Zod), outputSchema (Zod)
}, async (args) => {
  return { structuredContent: {...}, content: [{type:'text', text:'...'}] }
})
```

The `init-auth` tool will follow this exact pattern.

### 4. State Nonce / Session Binding

The `state` parameter in OAuth flows is used to prevent CSRF and to correlate the callback to the original session. Current tools use `ulid()` for nonces (see `handler.tools.tsx`, line 74). The same approach should be used for `state`.

Storage options considered:
- **In-memory Map** (keyed by state ULID): simplest, zero-dependency, works for single-instance. Lose state on restart.
- **CDS in-memory store** (using `cds.run(cds.ql.INSERT...)`): would require a new entity, but gives persistence.
- **Recommendation**: Start with a module-level `Map<state, { destination_name, grant_id, created_at }>` with TTL cleanup. Document as a known limitation for multi-instance.

### 5. Token Forwarding to `grant-tools-service`

After obtaining the destination access token, the connection service needs to forward MCP requests to `grant-tools-service` with the token injected. Two options:

**Option A — HTTP forward:**
```
connection-management-service
  → POST /grants/mcp (internal HTTP, Authorization: Bearer <dest_token>)
  → grant-tools-service/handler.destination.tsx
    → buildMergedHeaders picks up the token from authTokens
```
Problem: This creates circular service dependency and the token would need to be in `destination.authTokens` which is SDK-controlled.

**Option B — Direct MCP proxy (same as handler.destination.tsx pattern):**
The `handler.proxy.tsx` creates its own `StreamableHTTPClientTransport` with the destination URL and injects the token directly in the request headers:
```ts
new StreamableHTTPClientTransport(new URL(destination.url), {
  requestInit: {
    headers: { Authorization: `Bearer ${access_token}` }
  }
})
```
This avoids any dependency on `grant-tools-service` internal routing and is the cleaner approach.

**Recommendation**: Option B — own the MCP transport in `connection-management-service/handler.proxy.tsx`.

### 6. CDS Service Registration

The new service needs to be added to `srv/index.cds`:
```cds
using from './connection-management-service/connection-management-service';
```

### 7. Destination `authorizationUrl` vs. Building It

In SAP BTP Destination configuration:
- For `OAuth2AuthorizationCode` destinations, the `authorizationUrl` field can be set explicitly.
- If not set, it's typically `tokenServiceUrl` with `/authorize` path swap.
- The Cloud SDK exposes this as part of the fetched destination object.
- We should prefer reading `destination.authorizationUrl` directly if available; fall back to constructing from `tokenServiceUrl`.

---

## Design Pivot Notes (2026-03-08)

### Why Grant-Native is Better

The revised approach aligns with how the system already works:

1. **Grants are the source of truth** for what an agent/client is allowed to do. Storing the destination AT in the grant is natural — it's per-grant, per-user, subject to grant revocation.
2. **No new OAuth state management** needed outside the existing grant flow. The PAR already ties to a `grant_id`; the `state` nonce can be the `request_uri` or a ULID written into the PAR.
3. **The user sees everything in one place** — the grant consent UI already shows what tools are authorized. Adding a "Federated Destination: connect to MY_DEST" card gives the user one coherent view.
4. **Re-uses the existing revoke path** — revoking the grant also invalidates the stored destination AT, no extra cleanup needed.

### State Tracking Between init-auth and Callback

The `init-auth` tool creates a PAR with `authorization_details` type `federated_destination`, which includes the `authorization_url` field (the destination IDP URL). When the user hits "Connect", the button opens `authorization_url` which has a `state=<ulid>` and `redirect_uri=/federated/callback`.

The callback receives `state`. To correlate it back to the right `AuthorizationDetails` record, two options:

**Option A — Module-level Map** (in `federated-destination-service`):
```ts
// Written by init-auth tool at PAR time
stateStore.set(state, { grant_id, destination_id })
// Read by callback handler
const { grant_id, destination_id } = stateStore.get(code_state)
```
Simplest. TTL = 5 minutes. Document multi-instance limitation.

**Option B — State embedded in PAR**:
The `state` field of the PAR itself encodes the destination_id. On callback, decode the state to find destination_id, then query `AuthorizationDetails` for this grant+destination.
```ts
// state = base64(JSON.stringify({ grant_id, destination_id, nonce }))
```
No separate store needed. Works across instances. Slightly more complex parsing.

**Recommendation**: Option B — avoids in-memory state store entirely, works in multi-instance, aligns with how OAuth `state` is typically used.

### Token Storage in `AuthorizationDetails`

The `access_token` field on `AuthorizationDetails` is sensitive. For Phase 1, store plaintext. Document as tech debt. For Phase 2, apply field-level encryption (CDS `@mandatory @sensitive` or an application-layer encrypt/decrypt wrapper).

The `AuthorizationDetails` record for a `federated_destination` is created by the consent flow (same as `mcp` type). The callback handler UPDATEs it with the AT fields:
```ts
await srv.run(
  cds.ql.UPDATE(AuthorizationDetails)
    .set({ access_token, token_expires_at, refresh_token })
    .where({ consent_grant_id: grant_id, type: 'federated_destination', destination_id })
)
```

### UI Interaction Pattern for "Connect" Button

The "Connect to `<destination>`" button in the consent UI needs to:
1. Open the destination IDP URL (from `authorization_url` field of the detail) in a **popup window** (preferred) or new tab.
2. After the popup completes (IDP redirects to `/federated/callback`), the callback saves the AT and closes the popup.
3. The parent grant consent page polls or the popup calls `window.opener.postMessage('connected')` to refresh the UI.

Alternative (simpler for Phase 1): full page redirect to destination IDP, callback redirects back to grant detail page. No popup needed. Slight UX disruption but zero JS complexity.

**Recommendation**: Full redirect in Phase 1 (simpler), popup in Phase 2.

---

## Risk Notes

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cloud SDK doesn't expose `authorizationUrl` on fetched destination | Medium | High | Read from destination `originalProperties` or fetch raw destination via BTP APIs |
| State store lost on pod restart (in-memory) | Low (dev) / High (prod) | Medium | Document limitation, plan CDS entity for prod |
| Token lifetime shorter than MCP session | Medium | Medium | Implement refresh token handling in follow-up task |
| Cross-tenant destination resolution | Low | High | Use existing `subscriberFirst` strategy from Cloud SDK |
