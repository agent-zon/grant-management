# Authorization Details Identifier & Relations Update

**Created**: 2025-10-24  
**Last Updated**: 2025-10-24  
**Category**: [DATA-MODEL]  

## Goal
Add `identifier` to authorization details (RAR) and re-model relations so that AuthorizationDetail is keyed per `(grant_id, identifier)` and associated to both `Grants` and `AuthorizationRequests`. Remove dependence on `Consents`.

## Requirements
- AuthorizationDetail has fields: `id` (key), `identifier`, `grant`, `request`, `type`, `actions`, `locations`, and type-specific fields.
- `id` convention: `${grant_id}:${identifier}`.
- Parse `identifier` in requests.
- Upsert details on PAR and on Consent (replacement semantics per identifier+grant).
- Token response returns `authorization_details` for the grant.
- UI collects `identifier` per detail.

## Acceptance Criteria
- Creating a PAR with `authorization_details[*].identifier` persists AuthorizationDetail rows keyed by grant+identifier.
- Granting consent upserts AuthorizationDetail rows for the grant with replacement behavior.
- Token response includes the grant's authorization_details.
- No AuthorizationDetail references `Consents`.
