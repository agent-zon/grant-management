# NOTES

- Flattening strategy:
  - Arrays → one row per element with singular attribute names (action, location, database, schema, table, url, protocol, root)
  - Maps (`tools`, `permissions`) → one row per key with attribute prefix `tool:` or `permission:` and value is boolean or `essential` flag if present
  - Type captured as `type`
- Keying ensures idempotency: composite key `(grant_id, resource_identifier, attribute, value)`
- Replace strategy: delete all rows for `grant_id` before inserting new ones to avoid stale rows
