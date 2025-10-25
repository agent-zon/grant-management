# Permissions Table Architecture

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Authorization Request                            │
│  (OAuth 2.0 with Rich Authorization Requests - RFC 9396)            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Authorization Details (JSON)                       │
│  [                                                                   │
│    {                                                                 │
│      "type": "mcp",                                                  │
│      "server": "github-mcp",                                         │
│      "tools": { "search": true, "create": true },                   │
│      "locations": ["github.com"],                                   │
│      "actions": ["read", "write"]                                   │
│    }                                                                 │
│  ]                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│              flattenAuthorizationDetails()                           │
│              (permissions-utils.tsx)                                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌───────────────────────────────┐  ┌───────────────────────────────┐
│   Permissions Table           │  │  AuthorizationDetail          │
│   (New - Flattened)           │  │  (Legacy - Nested)            │
│                               │  │                               │
│ • resource_identifier         │  │ • id                          │
│ • grant_id                    │  │ • grant_ID                    │
│ • attribute                   │  │ • type                        │
│ • value                       │  │ • actions[]                   │
│                               │  │ • locations[]                 │
│ Multiple rows per detail      │  │ • tools{}                     │
│ Highly queryable              │  │                               │
│ Indexed                       │  │ One row per detail            │
└───────────────────────────────┘  └───────────────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│              reconstructAuthorizationDetails()                       │
│              (Used for API responses)                                │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    OAuth Token Response                              │
│  {                                                                   │
│    "access_token": "...",                                            │
│    "grant_id": "gnt_xyz",                                            │
│    "authorization_details": [ ... ]                                  │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Old Structure (Complex, Nested)

```
AuthorizationDetail
├── id: String (key)
├── identifier: String
├── type: String enum { fs, mcp, api, database, other }
├── tools: Map
├── locations: array of String
├── actions: array of String
├── roots: array of String        (filesystem)
├── databases: array of String    (database)
├── schemas: array of String      (database)
├── tables: array of String       (database)
├── urls: array of String         (api)
├── protocols: array of String    (api)
├── permissions: {                (filesystem)
│   ├── read: Boolean
│   ├── write: Boolean
│   ├── execute: Boolean
│   ├── delete: Boolean
│   ├── list: Boolean
│   └── create: Boolean
│   }
└── grant: Association to Grants
```

### New Structure (Flat, Queryable)

```
Permissions
├── id: UUID (key)
├── resource_identifier: String   (e.g., "gnt_xyz:mcp-server-1")
├── grant_id: String
├── attribute: String             (e.g., "actions", "tool:search", "permission:write")
├── value: String                 (e.g., "read", "true", "github.com")
└── grant: Association to Grants
```

## Attribute Naming Conventions

| Attribute Pattern | Example | Description |
|------------------|---------|-------------|
| `type` | `mcp` | The type of authorization detail |
| `actions` | `read` | Action permission |
| `locations` | `github.com` | Location/URL |
| `tool:<name>` | `tool:search_repositories` | MCP tool permission |
| `permission:<type>` | `permission:write` | Filesystem permission |
| `server` | `github-mcp` | Server identifier |
| `transport` | `stdio` | Transport protocol |
| `databases` | `mydb` | Database name |
| `schemas` | `public` | Database schema |
| `tables` | `users` | Database table |
| `urls` | `https://api.example.com` | API endpoint |
| `protocols` | `https` | Protocol type |
| `roots` | `/workspace` | Filesystem root |

## Query Patterns

### Pattern 1: Get All Permissions for a Grant
```sql
SELECT * FROM Permissions WHERE grant_id = ?
```
**Use Case:** Display all permissions for a grant in UI

### Pattern 2: Check Specific Permission
```sql
SELECT * FROM Permissions 
WHERE grant_id = ? AND attribute = ? AND value = ?
```
**Use Case:** Authorization check before executing operation

### Pattern 3: Get Permissions by Type
```sql
SELECT * FROM Permissions 
WHERE grant_id = ? AND attribute LIKE 'tool:%'
```
**Use Case:** List all MCP tools available to a grant

### Pattern 4: Aggregate Permissions
```sql
SELECT grant_id, COUNT(*) as permission_count
FROM Permissions
GROUP BY grant_id
```
**Use Case:** Analytics dashboard showing permission distribution

### Pattern 5: Resource-Based Query
```sql
SELECT * FROM Permissions 
WHERE resource_identifier = ?
```
**Use Case:** Get all permissions for a specific resource

## Transformation Examples

### Example 1: MCP Tool Authorization

**Input (JSON):**
```json
{
  "type": "mcp",
  "identifier": "mcp-server-1",
  "server": "github-mcp",
  "transport": "stdio",
  "tools": {
    "search_repositories": true,
    "create_issue": true,
    "list_pulls": false
  },
  "locations": ["github.com", "github.enterprise.com"],
  "actions": ["read", "write"]
}
```

**Output (Permissions Table):**
| id | resource_identifier | grant_id | attribute | value |
|----|---------------------|----------|-----------|-------|
| uuid1 | gnt_xyz:mcp-server-1 | gnt_xyz | type | mcp |
| uuid2 | gnt_xyz:mcp-server-1 | gnt_xyz | server | github-mcp |
| uuid3 | gnt_xyz:mcp-server-1 | gnt_xyz | transport | stdio |
| uuid4 | gnt_xyz:mcp-server-1 | gnt_xyz | tool:search_repositories | true |
| uuid5 | gnt_xyz:mcp-server-1 | gnt_xyz | tool:create_issue | true |
| uuid6 | gnt_xyz:mcp-server-1 | gnt_xyz | tool:list_pulls | false |
| uuid7 | gnt_xyz:mcp-server-1 | gnt_xyz | locations | github.com |
| uuid8 | gnt_xyz:mcp-server-1 | gnt_xyz | locations | github.enterprise.com |
| uuid9 | gnt_xyz:mcp-server-1 | gnt_xyz | actions | read |
| uuid10 | gnt_xyz:mcp-server-1 | gnt_xyz | actions | write |

### Example 2: Filesystem Authorization

**Input (JSON):**
```json
{
  "type": "fs",
  "identifier": "fs-workspace",
  "roots": ["/workspace", "/tmp"],
  "permissions": {
    "read": true,
    "write": true,
    "execute": false,
    "delete": false
  },
  "actions": ["read", "write"]
}
```

**Output (Permissions Table):**
| id | resource_identifier | grant_id | attribute | value |
|----|---------------------|----------|-----------|-------|
| uuid1 | gnt_xyz:fs-workspace | gnt_xyz | type | fs |
| uuid2 | gnt_xyz:fs-workspace | gnt_xyz | roots | /workspace |
| uuid3 | gnt_xyz:fs-workspace | gnt_xyz | roots | /tmp |
| uuid4 | gnt_xyz:fs-workspace | gnt_xyz | permission:read | true |
| uuid5 | gnt_xyz:fs-workspace | gnt_xyz | permission:write | true |
| uuid6 | gnt_xyz:fs-workspace | gnt_xyz | permission:execute | false |
| uuid7 | gnt_xyz:fs-workspace | gnt_xyz | permission:delete | false |
| uuid8 | gnt_xyz:fs-workspace | gnt_xyz | actions | read |
| uuid9 | gnt_xyz:fs-workspace | gnt_xyz | actions | write |

### Example 3: Database Authorization

**Input (JSON):**
```json
{
  "type": "database",
  "identifier": "db-analytics",
  "databases": ["analytics", "reporting"],
  "schemas": ["public", "staging"],
  "tables": ["users", "orders"],
  "actions": ["read"]
}
```

**Output (Permissions Table):**
| id | resource_identifier | grant_id | attribute | value |
|----|---------------------|----------|-----------|-------|
| uuid1 | gnt_xyz:db-analytics | gnt_xyz | type | database |
| uuid2 | gnt_xyz:db-analytics | gnt_xyz | databases | analytics |
| uuid3 | gnt_xyz:db-analytics | gnt_xyz | databases | reporting |
| uuid4 | gnt_xyz:db-analytics | gnt_xyz | schemas | public |
| uuid5 | gnt_xyz:db-analytics | gnt_xyz | schemas | staging |
| uuid6 | gnt_xyz:db-analytics | gnt_xyz | tables | users |
| uuid7 | gnt_xyz:db-analytics | gnt_xyz | tables | orders |
| uuid8 | gnt_xyz:db-analytics | gnt_xyz | actions | read |

## Performance Characteristics

### Writes
- **Old**: 1 row per authorization detail
- **New**: 5-20 rows per authorization detail (depending on complexity)
- **Impact**: More writes, but better organized

### Reads
- **Old**: Parse JSON/arrays for filtering
- **New**: Direct SQL filtering
- **Impact**: Significantly faster for specific queries

### Indexes
Recommended indexes for optimal performance:
```sql
CREATE INDEX idx_permissions_grant ON Permissions(grant_id);
CREATE INDEX idx_permissions_attr ON Permissions(attribute);
CREATE INDEX idx_permissions_resource ON Permissions(resource_identifier);
CREATE INDEX idx_permissions_value ON Permissions(value);
CREATE INDEX idx_permissions_grant_attr ON Permissions(grant_id, attribute);
```

## Migration Strategy

### Phase 1: Dual Write (Current)
- Write to both Permissions and AuthorizationDetail
- Read from AuthorizationDetail (existing code)
- Validate data consistency

### Phase 2: Gradual Read Migration
- Update read operations to use Permissions
- Keep AuthorizationDetail as backup
- Monitor performance

### Phase 3: Full Migration
- All operations use Permissions
- AuthorizationDetail becomes view or deprecated
- Remove old code paths

### Phase 4: Cleanup
- Remove AuthorizationDetail table
- Optimize Permissions table
- Archive migration code
