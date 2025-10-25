# Flattened Permissions Table

## Overview

The permissions table provides a flattened, queryable structure for authorization details. Instead of storing complex nested objects, each attribute-value pair is stored as a separate row.

## Schema

```cds
entity Permissions: managed {
  key id: UUID;
  resource_identifier: String;  // Identifier for the resource (e.g., "gnt_xyz:mcp-server-1")
  grant_id: String;             // Reference to the grant
  attribute: String;            // The attribute name (e.g., "action", "location", "tool")
  value: String;                // The attribute value
  
  grant: Association to Grants on grant.id = grant_id;
  request: Association to AuthorizationRequests;
}
```

## Example Data

Given an authorization detail like:

```json
{
  "type": "mcp",
  "identifier": "mcp-server-1",
  "server": "github-mcp",
  "transport": "stdio",
  "tools": {
    "search_repositories": true,
    "create_issue": true
  },
  "locations": ["github.com"],
  "actions": ["read", "write"]
}
```

This would be flattened into multiple permission rows:

| resource_identifier | grant_id | attribute | value |
|---------------------|----------|-----------|-------|
| gnt_xyz:mcp-server-1 | gnt_xyz | type | mcp |
| gnt_xyz:mcp-server-1 | gnt_xyz | server | github-mcp |
| gnt_xyz:mcp-server-1 | gnt_xyz | transport | stdio |
| gnt_xyz:mcp-server-1 | gnt_xyz | tool:search_repositories | true |
| gnt_xyz:mcp-server-1 | gnt_xyz | tool:create_issue | true |
| gnt_xyz:mcp-server-1 | gnt_xyz | locations | github.com |
| gnt_xyz:mcp-server-1 | gnt_xyz | actions | read |
| gnt_xyz:mcp-server-1 | gnt_xyz | actions | write |

## Query Examples

### Get all permissions for a grant

```sql
SELECT * FROM Permissions WHERE grant_id = 'gnt_xyz';
```

### Get all actions for a grant

```sql
SELECT value FROM Permissions 
WHERE grant_id = 'gnt_xyz' AND attribute = 'actions';
```

### Get all tools for a grant

```sql
SELECT attribute, value FROM Permissions 
WHERE grant_id = 'gnt_xyz' AND attribute LIKE 'tool:%';
```

### Check if a grant has a specific permission

```sql
SELECT * FROM Permissions 
WHERE grant_id = 'gnt_xyz' 
  AND attribute = 'actions' 
  AND value = 'write';
```

### Get all permissions for a specific resource

```sql
SELECT * FROM Permissions 
WHERE resource_identifier = 'gnt_xyz:mcp-server-1';
```

### Get distinct resource identifiers for a grant

```sql
SELECT DISTINCT resource_identifier FROM Permissions 
WHERE grant_id = 'gnt_xyz';
```

## TypeScript API

The `permissions-query.tsx` module provides helper functions:

```typescript
import { 
  getPermissionsByGrantId,
  getActionsByGrantId,
  getToolsByGrantId,
  hasPermission,
  reconstructAuthorizationDetailsFromPermissions
} from './grant-management/permissions-query';

// Get all permissions for a grant
const permissions = await getPermissionsByGrantId(srv, 'gnt_xyz');

// Get all actions
const actions = await getActionsByGrantId(srv, 'gnt_xyz');

// Get all tools (as object)
const tools = await getToolsByGrantId(srv, 'gnt_xyz');
// Returns: { search_repositories: true, create_issue: true }

// Check specific permission
const canWrite = await hasPermission(srv, 'gnt_xyz', 'actions', 'write');

// Reconstruct original authorization details
const authDetails = await reconstructAuthorizationDetailsFromPermissions(srv, 'gnt_xyz');
```

## Utilities

### Flattening Authorization Details

The `permissions-utils.tsx` module provides conversion functions:

```typescript
import { 
  flattenAuthorizationDetail,
  flattenAuthorizationDetails,
  reconstructAuthorizationDetails 
} from './authorization-service/permissions-utils';

// Flatten a single detail
const permRows = flattenAuthorizationDetail(detail, grantId, requestId, 0);

// Flatten an array of details
const allPermRows = flattenAuthorizationDetails(details, grantId, requestId);

// Reconstruct from permission rows
const reconstructed = reconstructAuthorizationDetails(permissionRows);
```

## Benefits

1. **Better Queryability**: Each attribute is directly queryable without JSON parsing
2. **Indexing**: Can create indexes on `grant_id`, `attribute`, `value` for fast lookups
3. **Filtering**: Easy to filter by specific attributes or values
4. **Aggregation**: Can count permissions, group by type, etc.
5. **Compliance**: Easier to audit and report on specific permissions

## Migration

The system maintains both structures during migration:
- New `Permissions` table (flattened)
- Legacy `AuthorizationDetail` entity (nested)

Both are populated when creating/updating grants for backward compatibility.

## API Compliance

The flattened structure is internal. The external API still returns `authorization_details` in the standard OAuth/RAR format by reconstructing from the permissions table.

### Token Response

```json
{
  "access_token": "...",
  "grant_id": "gnt_xyz",
  "authorization_details": [
    {
      "type": "mcp",
      "server": "github-mcp",
      "tools": { "search_repositories": true },
      "locations": ["github.com"],
      "actions": ["read", "write"]
    }
  ]
}
```

### Grant Management API

```bash
# Query grant
GET /api/grants/gnt_xyz

# Response includes authorization_details reconstructed from permissions
{
  "grant_id": "gnt_xyz",
  "status": "active",
  "authorization_details": [...],
  "created_at": "2025-10-25T00:00:00Z"
}
```
