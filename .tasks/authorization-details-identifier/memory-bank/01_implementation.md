# Implementation Notes

**Created**: 2025-10-24  
**Last Updated**: 2025-10-24  
**Category**: [IMPLEMENTATION]
**Timeline**: 01 of N - Implementation

## CDS Changes
- `AuthorizationDetail` now: `key id: String`, `identifier: String`, `grant: Association to Grants`, `request: Association to AuthorizationRequests`.
- Removed `consent: Association to Consents` and compositions from `Consents`.
- `Grants.authorization_details` composition now targets `AuthorizationDetail` via `grant`.
- `AuthorizationDetailRequest` includes `identifier`.

## Handlers
- `handler.requests`: After inserting AuthorizationRequest, upsert AuthorizationDetail rows per parsed details.
- `handler.consent`: Upsert AuthorizationDetail rows from posted payload or request.access as fallback.
- `handler.token`: Fetch details by `grant_ID`.

## UI
- Added `identifier` input in Authorization Details component.
