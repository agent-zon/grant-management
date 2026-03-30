# Changelog — Connection Management / Interpolation Feature

**Created**: 2026-03-08  
**Category**: [CHANGELOG]

---

> **Rule**: Never modify historical entries. Append only.

---

## 2026-03-08 — Design Pivot: Grant-Native Federated Destination

**Decision**: The initial design (separate `connection-management-service` owning an independent OAuth callback + in-memory token store + HTTP forwarding to grant-tools) was replaced with a **grant-native** approach.

**Reason**: The user clarified that the destination access token should live **inside the grant itself**, the authorization URL presented to the user should be the **same existing grant consent URL**, and a new UI card type should handle the federated IDP login inline — not via a separate callback flow decoupled from grants.

**Key changes from v1 design:**
- **Removed**: Standalone `connection-management-service` as primary component.
- **Removed**: Separate `/connection/callback` endpoint; separate in-memory state store.
- **Removed**: HTTP forwarding from connection service to grant-tools proxy.
- **Added**: New `authorization_details` type `federated_destination` in `db/grants.cds`.
- **Added**: New CDS aspect `AuthorizationDetailFederatedDestination` (fields: `destination_id`, `authorization_url`, `access_token`, `token_expires_at`, `refresh_token`).
- **Added**: Slim `federated-destination-service` with single callback handler (`GET /federated/callback`) that exchanges the destination code for an AT and writes it into the grant's `AuthorizationDetails` record.
- **Added**: New `federated_destination` UI card in the existing grant consent UI (authorization-service) and grant detail UI (grant-management).
- **Modified**: `handler.destination.tsx` reads stored AT from grant before proxying; registers `init-auth` tool only when AT is absent or expired.

**Preserved from v1:**
- `init-auth` MCP tool concept (now issues a PAR to the existing authorization-service).
- Destination detection logic (`destination.authentication === 'OAuth2AuthorizationCode'`).
- Cloud SDK integration for destination metadata.

---

## 2026-03-08 — Task Initialisation

- Created branch `task/connection-management-interpolation` from `feature/interpolation`.
- Analysed existing `handler.destination.tsx` in `grant-tools-service`:
  - Currently resolves destinations via SAP Cloud SDK `useOrFetchDestination`.
  - Merges auth tokens from `destination.authTokens` into request headers.
  - Does **not** handle `OAuth2AuthorizationCode` destinations (no user-interactive flow).
- Analysed `handler.tools.tsx` for MCP tool registration pattern (`push-authorization-request` tool).
- Analysed `handler.callback.tsx` for OAuth callback + token exchange pattern.
- Analysed `handler.token.tsx` in `authorization-service` for token exchange mechanics.
- Decided:
  - New service goes in `srv/connection-management-service/` — **separate domain folder, separate CAP service**.
  - `grant-tools-service` remains untouched as the MCP proxy target.
  - New `init-auth` MCP tool guides the agent through the destination IDP OAuth2 flow.
  - Callback endpoint exchanges the code using destination credentials.
  - Token injected into proxy call forwarded to `grant-tools-service`.
- Created task definition files: `TASK_DEFINITION.md`, `STATUS.md`, `CHANGELOG.md`, `NOTES.md`.
- Created initial memory bank file: `00_discovery-and-architecture.md`.
