# CHANGELOG

## 2025-10-25
- Added `Permissions` entity to CDS (`db/grants.cds`).
- Exposed `Permissions` via `srv/grant-management.cds`.
- Implemented flattening logic in `handler.requests.tsx` and `handler.consent.tsx` with replace-per-grant semantics.
