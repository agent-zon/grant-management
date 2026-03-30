# Connection Management / Interpolation Feature

**Created**: 2026-03-08  
**Last Updated**: 2026-03-08  
**Category**: [FEATURE] [OAUTH2] [MCP] [FEDERATED-DESTINATION]  
**Branch**: `task/connection-management-interpolation`  
**Based on**: `feature/interpolation`

---

## Overview

Enable the system to connect to MCP servers that sit behind SAP BTP Destinations configured with `OAuth2AuthorizationCode` auth type. Because this auth type requires an interactive user login at a **destination-owned IDP**, the SAP Cloud SDK cannot resolve a token automatically.

The solution is **grant-native**: a new `authorization_details` type — `federated_destination` — is introduced into the existing grant data model. The agent's `init-auth` MCP tool creates a standard PAR/grant request carrying this new type. The existing grant consent UI is extended with a new card that lets the user trigger the destination IDP login directly from the grant UI. Once the user authenticates, the destination `access_token` (AT) is stored **inside the grant itself**. The destination proxy handler then reads this stored AT when forwarding MCP calls.

No new standalone OAuth callback service is needed for the core flow — the federated callback is a lightweight endpoint in a new **`federated-destination-service`** that saves the AT into the grant and hands control back to the grant UI.

---

## User Story

> **As an** AI agent connected to an MCP server backed by a SAP BTP Destination with `OAuth2AuthorizationCode` auth,  
> **I want** the system to guide me and the end user through an IDP login flow that is surfaced as part of the existing grant consent UI,  
> **So that** the resulting destination access token is captured in the grant, I can proxy MCP tool calls without additional prompting, and the user retains full visibility and control via the grant dashboard.

---

## Problem Statement

### Current State

```
MCP Client → grant-tools-service → handler.destination.tsx
                                        ↓
                              useOrFetchDestination()
                              (authentication = OAuth2AuthorizationCode)
                                        ↓
                    ❌ authTokens = [] — Cloud SDK cannot get a token
                       transport creation fails silently
```

### Target State

```
Phase 1 — init-auth (agent triggers grant request):
──────────────────────────────────────────────────
MCP Client calls init-auth tool
  → handler.destination.tsx detects OAuth2AuthorizationCode destination
  → registers init-auth MCP tool (if not already present)
  → agent calls init-auth({ destination_name })
      → PAR to authorization-service with authorization_details:
          [{ type: "federated_destination",
             destination_id: "<dest-name>",
             authorization_url: "<dest-idp-url>" }]
      → returns grant management authorization URL (same as existing flow)

Phase 2 — user consents via grant UI:
──────────────────────────────────────
User opens /oauth-server/authorize_dialog?request_uri=...
  → sees new "Federated Destination" card in consent UI
  → card shows destination name + "Connect to <Destination>" button
  → user clicks button → popup/redirect to destination IDP authorization_url
  → user authenticates at destination IDP
  → IDP redirects back to /federated/callback?code=...&state=...

Phase 3 — AT stored in grant:
──────────────────────────────
federated-destination-service/handler.callback.tsx
  → validates state → fetches destination → exchanges code for AT
  → UPDATEs the AuthorizationDetails record:
      access_token, token_expires_at, refresh_token
  → redirects user back to grant UI with "Connected ✓" status

Phase 4 — proxy uses stored AT:
────────────────────────────────
MCP Client → grant-tools-service → handler.destination.tsx
  → useOrFetchDestination() → OAuth2AuthorizationCode detected
  → reads grant's authorization_details for type=federated_destination,
    destination_id matching current destination
  → finds stored access_token (not expired)
  → StreamableHTTPClientTransport(destination.url, {
      headers: { Authorization: `Bearer ${access_token}` }
    })
  → proxies MCP calls ✓
```

---

## Acceptance Criteria

### AC-1: New `federated_destination` authorization detail type
- [ ] `db/grants.cds` — new `aspect AuthorizationDetailFederatedDestination` with fields:
  - `destination_id: String` — BTP destination name
  - `authorization_url: String` — pre-built destination IDP auth URL
  - `access_token: String` — stored destination AT (populated post-callback)
  - `token_expires_at: DateTime` — AT expiry timestamp
  - `refresh_token: String` — optional, for later renewal
- [ ] `AuthorizationDetailType` enum extended with `federated_destination` code.
- [ ] `AuthorizationDetails` entity includes the new aspect.

### AC-2: `q` MCP Tool (in `handler.destination.tsx`)
- [ ] When `destination.authentication === 'OAuth2AuthorizationCode'` is detected and no valid stored AT exists in the grant, the handler registers an `init-auth` MCP tool.
- [ ] Tool input: `destination_name: String`, optional `redirect_uri: String`.
- [ ] Tool action:
  - Fetches destination metadata (`authorizationUrl`, `clientId`, `tokenServiceUrl`) via Cloud SDK.
  - Builds the destination IDP authorization URL with `response_type=code`, `client_id`, `redirect_uri=/federated/callback`, `state=<ulid>`, `scope`.
  - Issues a PAR to `AuthorizationService` with `authorization_details` of type `federated_destination` carrying `destination_id` and `authorization_url`.
  - Returns the grant management `authorization_url` (same UI path as existing tool consent flow).
- [ ] Tool output: `{ authorization_url, request_uri, expires_in }`.

### AC-3: Grant consent UI — new `federated_destination` card
- [ ] `srv/authorization-service/handler.authorize.tsx` (or `handler.consent.tsx`) renders a new card for `type === "federated_destination"` authorization details.
- [ ] Card displays: destination name, connection status (`pending` / `connected`).
- [ ] Card contains a "Connect to `<destination_id>`" button that opens the `authorization_url` from the detail (the destination IDP URL) in a new tab or popup.
- [ ] After the callback completes and the AT is stored, the grant detail page (`grant-management/handler.edit.tsx`) shows `federated_destination` details including connection status and expiry.

### AC-4: New `federated-destination-service` — callback handler
- [ ] Lives in `srv/federated-destination-service/` (separate service, separate CDS file).
- [ ] `GET /federated/callback?code=&state=` endpoint:
  - Validates `state` against a short-lived store (module-level Map keyed by ULID, written by init-auth tool).
  - Fetches the destination using Cloud SDK (reads `clientId`, `clientSecret`, `tokenServiceUrl`).
  - POSTs to destination's token endpoint to exchange `code` for `access_token`.
  - UPDATEs the `AuthorizationDetails` record (keyed by `destination_id` + `grant_id`) with `access_token`, `token_expires_at`, `refresh_token`.
  - Redirects to `/grants-management/Grants/<grant_id>` with a success indicator.
- [ ] Error cases: invalid state → 400; token exchange failure → error UI.

### AC-5: Destination proxy uses stored AT
- [ ] `handler.destination.tsx` — before creating `StreamableHTTPClientTransport`:
  - Queries the grant's `authorization_details` for `type = "federated_destination"` and `destination_id` matching the current destination.
  - If a valid (non-expired) `access_token` is found, uses it directly in the transport `Authorization` header.
  - If not found or expired, falls through to registering the `init-auth` tool.
- [ ] The raw token is never logged (use `.slice(0,5)` pattern for debug).

### AC-6: Grant detail UI shows federated connection
- [ ] `srv/grant-management/handler.edit.tsx` renders a `federated_destination` card within "Access Details":
  - Destination name, connection status badge (`Connected ✓` / `Pending connection`), token expiry.
  - "Reconnect" button if expired.

### AC-7: Error handling
- [ ] Expired/invalid state in callback → 400 response with error UI.
- [ ] Token exchange failure → propagated to MCP tool result as structured error.
- [ ] Destination not found by Cloud SDK → 404 from tool.
- [ ] Stored AT expired at proxy time → `init-auth` tool re-registered, agent prompted.

---

## Data Model Changes (`db/grants.cds`)

### New aspect

```cds
aspect AuthorizationDetailFederatedDestination {
  destination_id    : String;   // BTP destination name
  authorization_url : String;   // Pre-built destination IDP authorize URL
  access_token      : String;   // Stored AT — populated after user connects
  token_expires_at  : DateTime; // AT expiry
  refresh_token     : String;   // Optional refresh token
}
```

### Updated entity

```cds
@cds.autoexpose: true
entity AuthorizationDetails : cuid, managed,
    AuthorizationDetailMcpTools,
    AuthorizationDetailFileSystem,
    AuthorizationDetailDatabase,
    AuthorizationDetailApi,
    AuthorizationDetailFederatedDestination  // ← NEW
{
  consent : Association to Consents;
  type    : String;
  ...
}
```

### Updated enum

```cds
entity AuthorizationDetailType : sap.common.CodeList {
  key code : String(60) enum {
    mcp;  fs;  database;  api;  grant_management;
    file_access;  data_access;  network_access;
    federated_destination;  // ← NEW
  };
}
```

---

## New Files

```
srv/
└── federated-destination-service/
    ├── federated-destination-service.cds    # @path: '/federated', service definition
    ├── federated-destination-service.tsx    # CAP service class, handler registration
    └── handler.callback.tsx                 # GET /federated/callback — code exchange + AT storage
```

---

## Changed Files

| File | Change |
|---|---|
| `db/grants.cds` | Add `AuthorizationDetailFederatedDestination` aspect; extend enum |
| `srv/grant-tools-service/handler.destination.tsx` | Detect `OAuth2AuthorizationCode`; read stored AT; register `init-auth` tool conditionally |
| `srv/authorization-service/handler.consent.tsx` (or `handler.authorize.tsx`) | Render new `federated_destination` card in consent UI |
| `srv/grant-management/handler.edit.tsx` | Render `federated_destination` card in grant detail UI |
| `srv/index.cds` | Add `using` for new `federated-destination-service` |

---

## `init-auth` Tool Contract

**Input:**
```json
{
  "destination_name": "MY_OAUTH_DESTINATION"
}
```

**Output:**
```json
{
  "authorization_url": "https://<host>/oauth-server/authorize_dialog?request_uri=urn:...",
  "request_uri": "urn:ietf:params:oauth:request_uri:...",
  "expires_in": 90
}
```

The `authorization_url` leads to the **existing grant consent UI** — the same UI the agent already uses for tool authorization — extended with the new `federated_destination` card.

---

## Sequence Diagram (condensed)

```
Agent          init-auth tool    AuthorizationService   User (Browser)    Dest IDP    federated-callback    AuthorizationDetails
  │                │                     │                    │               │                │                     │
  │──callTool─────►│                     │                    │               │                │                     │
  │                │──PAR────────────────►                    │               │                │                     │
  │                │◄──request_uri────────                    │               │                │                     │
  │◄──authz_url────│                     │                    │               │                │                     │
  │                │                     │                    │               │                │                     │
  │ (shows URL to user)                  │                    │               │                │                     │
  │                │                     │                    │               │                │                     │
  │                │                     │  ◄──GET /authorize_dialog──────────                │                     │
  │                │                     │  ──render consent + federated card──►              │                     │
  │                │                     │                    │  ──click Connect──►           │                     │
  │                │                     │                    │               │◄──auth flow───│                     │
  │                │                     │                    │  ◄──redirect /federated/callback?code=&state=       │
  │                │                     │                    │               │  ──exchange code──────────►         │
  │                │                     │                    │               │               │◄──access_token──────│
  │                │                     │                    │               │               │──UPDATE─────────────►
  │                │                     │                    │◄──redirect /grants/id─────────│                     │
  │                │                     │                    │  (shows Connected ✓)           │                     │
  │                │                     │                    │               │                │                     │
  │──callTool─────►│ (next MCP call)     │                    │               │                │                     │
  │                │ reads grant AT ─────────────────────────────────────────────────────────────────────────────────►
  │                │ proxies with AT     │
```

---

## Out of Scope

- PKCE for the destination IDP auth (nice-to-have; can be added in follow-up).
- Refresh token auto-renewal (follow-up task).
- Multi-tenant destination resolution (existing `subscriberFirst` strategy applies).
- Token encryption at rest (follow-up: field-level encryption on `access_token`).

---

## Dependencies

| Dependency | Notes |
|---|---|
| `@sap-cloud-sdk/connectivity` | Already present — `useOrFetchDestination`, destination metadata |
| `@modelcontextprotocol/sdk` | Already present — MCP server/transport |
| `ulid` | Already present — state nonce generation |
| `authorization-service` | Existing — PAR endpoint for grant creation |
| `grant-management` | Existing — UI rendering, AT storage target |
| `grant-tools-service` | Existing — handler.destination.tsx modified to use stored AT |

---

## Related Files

| File | Relevance |
|---|---|
| `db/grants.cds` | Data model — entities, aspects, enums to extend |
| `srv/grant-tools-service/handler.destination.tsx` | Destination proxy — add OAuth2AuthorizationCode detection + AT lookup |
| `srv/grant-tools-service/handler.tools.tsx` | Pattern for MCP tool registration + PAR flow |
| `srv/authorization-service/handler.consent.tsx` | Consent UI — add federated_destination card |
| `srv/grant-management/handler.edit.tsx` | Grant detail UI — add federated connection status card |
| `srv/authorization-service/authorization-service.cds` | PAR endpoint contract |
