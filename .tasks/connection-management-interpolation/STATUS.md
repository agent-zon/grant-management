# Status — Connection Management / Interpolation Feature

**Created**: 2026-03-08  
**Last Updated**: 2026-03-08  
**Category**: [STATUS]

---

## Current Status: 🟡 PLANNING

### Phase
**Phase 0 — Task Definition & Discovery** *(Design pivot completed)*

### Summary
Task definition has been written and then revised after a design pivot. The feature scope, acceptance criteria, data model changes, and technical design are now documented under the **grant-native federated-destination** approach. No implementation has started.

---

## Design Pivot Summary
The original design (separate `connection-management-service`) was replaced with a grant-native model:
- New `authorization_details` type: `federated_destination`
- AT stored inside the grant record
- Existing grant consent UI extended with a new card
- Slim `federated-destination-service` for destination IDP callback only

---

## Progress Tracker

| # | Task | Status | Notes |
|---|---|---|---|
| 0 | Task definition & branch setup | ✅ Done | Branch: `task/connection-management-interpolation` |
| 0b | Design pivot — grant-native approach | ✅ Done | See CHANGELOG.md |
| 1 | `db/grants.cds` — add `AuthorizationDetailFederatedDestination` aspect + enum | ⬜ Pending | |
| 2 | `handler.destination.tsx` — detect OAuth2AuthorizationCode + read stored AT | ⬜ Pending | |
| 3 | `handler.destination.tsx` — register `init-auth` MCP tool (issues PAR) | ⬜ Pending | |
| 4 | `federated-destination-service/handler.callback.tsx` — code exchange + AT write | ⬜ Pending | |
| 5 | Grant consent UI — new `federated_destination` card (auth-service) | ⬜ Pending | |
| 6 | Grant detail UI — `federated_destination` connection status card (grant-management) | ⬜ Pending | |
| 7 | Wire `federated-destination-service` into `srv/index.cds` | ⬜ Pending | |
| 8 | End-to-end test with OAuth2AuthorizationCode destination | ⬜ Pending | |
| 9 | Documentation & memory bank final summary | ⬜ Pending | |

---

## Blockers
None currently.

---

## Open Questions
- Where exactly does the state (ULID → `{ destination_id, grant_id }`) live? Module-level Map in the callback handler, or written into the PAR's `state` field so it can be recovered without a separate store?
- Should `access_token` stored in `AuthorizationDetails` be encrypted at rest? (Follow-up task for now.)
- Which existing file handles the consent UI rendering for `authorization_details` types — `handler.consent.tsx` or `handler.authorize.tsx`?
- Does the "Connect" button open the destination IDP URL in a popup (JS), a new tab, or a full redirect?
