# Design Pivot — Grant-Native Federated Destination

**Created**: 2026-03-08  
**Last Updated**: 2026-03-08  
**Category**: [ARCHITECTURE] [OAUTH2] [GRANT-MODEL]  
**Timeline**: 01 of N — Design pivot after initial discovery  
**Previous**: `00_discovery-and-architecture.md`

---

## Overview

The initial design (see `00_discovery-and-architecture.md`) proposed a standalone `connection-management-service`. After user feedback, this was replaced with a **grant-native** design where:

- The destination `access_token` is stored **inside the grant** as a new `authorization_details` type.
- The authorization URL shown to the user is the **existing grant consent UI** URL — no new consent screen.
- The grant consent UI is extended with a new card for `federated_destination` type.
- A thin `federated-destination-service` handles only the destination IDP callback (code → AT exchange).

---

## Core Insight

> The grant IS the session. Storing the destination AT in the grant makes it:
> - User-visible (they see it in their grant dashboard)
> - Revocable (revoking the grant kills the destination connection too)
> - Auditable (AT creation timestamp, expiry, and revocation are all traceable)
> - Zero new infrastructure (reuses PAR, consent, and grant storage)

---

## New `authorization_details` Type: `federated_destination`

### CDS Model (`db/grants.cds`)

```cds
aspect AuthorizationDetailFederatedDestination {
  destination_id    : String;    // BTP destination name (e.g., "MY_MCP_SERVER")
  authorization_url : String;    // Pre-built dest IDP auth URL (stored for UI use)
  access_token      : String;    // AT stored after user completes IDP login
  token_expires_at  : DateTime;  // Expiry — checked before use in proxy
  refresh_token     : String;    // Optional — for later renewal
}
```

Added to `AuthorizationDetails` entity and `AuthorizationDetailType` enum.

---

## Revised Flow

### Step 1 — Agent calls `init-auth` tool

`init-auth` tool (registered in `handler.destination.tsx` when OAuth2AuthorizationCode detected and no valid AT in grant):

```ts
// Inside init-auth tool handler:
const destination = await useOrFetchDestination({ destinationName, jwt })
const authorizationUrl = buildDestAuthorizationUrl(destination, state, redirectUri)

const { request_uri, expires_in } = await authService.par({
  authorization_details: JSON.stringify([{
    type: "federated_destination",
    destination_id: destinationName,
    authorization_url: authorizationUrl,  // stored in the detail record
  }]),
  redirect_uri: `${host}/federated/callback`,
  state: encodeState({ grant_id, destination_id: destinationName }),
  // ... standard PAR fields
})

return {
  authorization_url: `${host}/oauth-server/authorize_dialog?request_uri=${request_uri}`,
  request_uri,
  expires_in,
}
```

### Step 2 — User sees grant consent UI with new card

The existing grant consent UI (`handler.consent.tsx` / `handler.authorize.tsx`) renders authorization_details. A new branch handles `type === "federated_destination"`:

```tsx
{detail.type === "federated_destination" && (
  <FederatedDestinationCard
    destinationId={detail.destination_id}
    authorizationUrl={detail.authorization_url}
    connected={!!detail.access_token}
    expiresAt={detail.token_expires_at}
  />
)}
```

The card shows a "Connect to `<destination_id>`" button that links/redirects to `detail.authorization_url` (the destination IDP URL).

### Step 3 — Destination IDP callback

`GET /federated/callback?code=...&state=...`

```ts
// federated-destination-service/handler.callback.tsx
const { grant_id, destination_id } = decodeState(state)
const destination = await useOrFetchDestination({ destinationName: destination_id, jwt })
const { access_token, refresh_token, expires_in } = await exchangeCode(destination, code)

await srv.run(
  UPDATE(AuthorizationDetails)
    .set({ access_token, refresh_token, token_expires_at: expiryDate })
    .where({ consent_grant_id: grant_id, type: 'federated_destination', destination_id })
)

// Redirect to grant detail page
return redirect(`/grants-management/Grants/${grant_id}?connected=true`)
```

### Step 4 — Proxy uses stored AT

`handler.destination.tsx` (modified):

```ts
// Check for stored AT in grant
const storedDetail = await getStoredFederatedToken(grant_id, destinationName)

if (storedDetail?.access_token && !isExpired(storedDetail.token_expires_at)) {
  const transport = new StreamableHTTPClientTransport(new URL(destination.url), {
    requestInit: {
      headers: { Authorization: `Bearer ${storedDetail.access_token}` }
    }
  })
  // proceed with transport
} else {
  // register init-auth tool — AT missing or expired
  registerInitAuthTool(req.data.server, destinationName, grant_id)
}
```

---

## File Impact Map

```
db/grants.cds                                   ← ADD aspect + enum value
srv/grant-tools-service/handler.destination.tsx ← MODIFY (AT lookup + init-auth tool)
srv/authorization-service/handler.consent.tsx   ← MODIFY (new federated_destination card)
srv/grant-management/handler.edit.tsx           ← MODIFY (new connection status card)
srv/federated-destination-service/              ← NEW (callback handler only)
  ├── federated-destination-service.cds
  ├── federated-destination-service.tsx
  └── handler.callback.tsx
srv/index.cds                                   ← ADD using for new service
```

---

## Key Decisions

| Decision | Rationale |
|---|---|
| AT stored in `AuthorizationDetails` record | Reuses existing persistence; grant-revocable; user-visible |
| State encoded in OAuth `state` param (not Map) | No in-memory store; works across instances |
| Existing grant consent URL returned by `init-auth` | User sees one consistent grant management UI |
| Full redirect (not popup) for Phase 1 | Zero JS complexity; acceptable UX |
| Slim new `federated-destination-service` for callback | Clean domain split; grant-management stays read-oriented |

---

## Next file in sequence
`02_implementation-notes.md` — will be created during implementation phase.
