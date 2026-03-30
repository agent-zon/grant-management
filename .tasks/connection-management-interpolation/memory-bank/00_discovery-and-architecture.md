# Discovery & Architecture — Connection Management / Interpolation

**Created**: 2026-03-08  
**Last Updated**: 2026-03-08  
**Category**: [ARCHITECTURE] [OAUTH2] [MCP]  
**Timeline**: 00 of N — Initial discovery and architecture decisions

---

## Overview

This file records the initial codebase exploration and architectural decisions made at the start of the Connection Management / Interpolation feature.

---

## Codebase Snapshot (key files)

### `srv/grant-tools-service/handler.destination.tsx`
- Fetches SAP BTP destination via `useOrFetchDestination`.
- Creates `StreamableHTTPClientTransport` with merged headers from destination auth tokens.
- Lists and registers all tools from the downstream MCP server.
- **Gap**: No handling for `OAuth2AuthorizationCode` destination type.

### `srv/grant-tools-service/handler.tools.tsx`
- Registers the `push-authorization-request` tool — initiates our internal OAuth (to the grant AS).
- Shows the pattern for registering MCP tools with Zod schemas and structured output.
- Uses `ulid()` for nonce/state.

### `srv/grant-tools-service/handler.callback.tsx`
- Receives `code` + `state` from the authorization redirect.
- Calls `authorizationService.token({ grant_type: 'authorization_code', code, ... })`.
- Renders success/error HTML.

### `srv/authorization-service/handler.token.tsx`
- Handles multiple grant types: `authorization_code`, `refresh_token`, `user_token`, `token-exchange`.
- Reads `AuthorizationRequests` from CDS in-memory store for `authorization_code` grant.
- Exchanges via IAS (SAP Identity Authentication Service) SDK.

---

## Architectural Decision: Separate Service

**Decision**: Create `srv/connection-management-service/` as a **new, independent CAP service** rather than extending `grant-tools-service`.

**Rationale**:
1. **Domain boundary**: Grant tools = MCP tool registry + authorization enforcement. Connection management = IDP connection bootstrap + token lifecycle.
2. **Single responsibility**: `grant-tools-service` should not know about external IDP OAuth flows.
3. **Rule compliance**: The project SSR/domain rules require one file per domain. A new domain = new service.
4. **Future extensibility**: `connection-management-service` can later support multiple auth types (SAML, mTLS) without touching grant tools.

---

## Architectural Decision: Direct MCP Proxy (No Grant-Tools HTTP Forwarding)

**Decision**: After obtaining the destination access token, `connection-management-service` creates its own `StreamableHTTPClientTransport` with the token injected directly, rather than forwarding to `grant-tools-service` via HTTP.

**Rationale**:
1. Avoids a circular service dependency.
2. Simpler token injection — no need to re-route through `buildMergedHeaders`.
3. Mirrors the existing pattern in `handler.destination.tsx` exactly.
4. `grant-tools-service` is still the "model" — the proxy code is copied/adapted into `handler.proxy.tsx`.

**Note**: The `init-auth` tool and MCP registration live in `connection-management-service/handler.mcp.tsx`. The actual proxy-to-downstream-MCP is in `handler.proxy.tsx`.

---

## Architectural Decision: In-Memory State Store (Phase 1)

**Decision**: Use a module-level `Map<string, OAuthState>` in `handler.mcp.tsx` to track the OAuth state nonces.

```ts
interface OAuthState {
  destination_name: string;
  grant_id: string;
  created_at: number;  // Date.now()
  ttl: number;         // 300_000 ms (5 min)
}
const stateStore = new Map<string, OAuthState>();
```

**Rationale**: Simplest approach for initial implementation. Well-documented limitation for multi-instance deployments. Follow-up task will introduce CDS entity persistence.

---

## Flow Diagram

```
[AI Agent / MCP Client]
        │
        │  MCP Initialize
        ▼
[connection-management-service]
        │
        │  useOrFetchDestination("MY_DEST")
        │  → authentication === 'OAuth2AuthorizationCode'
        ▼
  [register init-auth tool]
        │
        │  Agent calls init-auth({ destination_name, redirect_uri })
        ▼
  Build authorization URL from destination.authorizationUrl
  Store state=ULID → stateStore
        │
        │  Return { authorization_url, state, expires_in }
        ▼
  [User clicks authorization_url → logs in at Destination IDP]
        │
        │  IDP redirects → GET /connection/callback?code=...&state=...
        ▼
  [handler.callback.tsx]
        │
        │  Validate state → fetch destination again
        │  POST tokenServiceUrl with code + client credentials
        │  Store access_token in context (keyed by grant_id)
        ▼
  [Subsequent MCP calls via handler.proxy.tsx]
        │
        │  StreamableHTTPClientTransport(destination.url, {
        │    headers: { Authorization: `Bearer ${access_token}` }
        │  })
        ▼
  [Destination MCP Server]
```

---

## Next Steps (see STATUS.md)

1. Scaffold `connection-management-service.cds` and `.tsx`.
2. Implement `handler.mcp.tsx` with `init-auth` tool.
3. Implement `handler.callback.tsx` for code exchange.
4. Implement `handler.proxy.tsx` for token-authenticated MCP proxy.
5. Wire into `srv/index.cds`.
