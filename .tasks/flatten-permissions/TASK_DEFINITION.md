# Flatten authorization_details to Permissions table

**Created**: 2025-10-25  
**Last Updated**: 2025-10-25  
**Category**: [FEATURE]  

## Goals
- Create a flat `Permissions` table with keys: `grant_id`, `resource_identifier`, `attribute`, `value`.
- Populate `Permissions` whenever `AuthorizationDetail` is created or updated via PAR/consent handlers.
- Expose `Permissions` via `GrantsManagementService` for querying.

## Acceptance Criteria
- [x] CDS model includes `Permissions` entity with composite key.
- [x] Upserts on `AuthorizationDetail` also replace rows in `Permissions` for that `grant_id`.
- [x] `Permissions` is readable at `/grants-management/Permissions`.
- [ ] Optional backfill script to populate `Permissions` from existing `AuthorizationDetail`.
