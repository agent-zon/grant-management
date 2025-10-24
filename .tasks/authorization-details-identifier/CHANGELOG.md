# Changelog

## 2025-10-24
- Added `identifier` to AuthorizationDetail; new key `id` computed as `${grant_id}:${identifier}`.
- Linked AuthorizationDetail to `Grants` and `AuthorizationRequests`; removed association to `Consents`.
- PAR handler now upserts details upon request creation.
- Consent handler upserts/overwrites details for grant + identifier.
- Token handler loads details by `grant_ID`.
- Grants listing updated to aggregate details by `grant_ID`.
- UI form now captures `identifier` per detail.
