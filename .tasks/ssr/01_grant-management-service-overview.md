# Grant Management Service - Service Actions and CAP Entities

**Created**: 2025-11-30  
**Last Updated**: 2025-11-30  
**Category**: [ARCHITECTURE]  
**Timeline**: 01 of 04 - Grant Management Service Architecture

## Overview

The Grant Management Service (`srv/grant-management/`) implements the OAuth 2.0 Grant Management API specification, providing query, revoke, and update operations for granted consents. It serves both as an API and as a user-facing dashboard with server-side rendered UI.

## Service Definition (CDS)

```cds
@path: '/grants-management'
@protocol: 'rest'
@requires: ['authenticated-user', 'system-user']
service GrantsManagementService {
    entity Grants as projection on grants.Grants
    entity AuthorizationDetails as projection on grants.AuthorizationDetails
    entity Consents as projection on grants.Consents
}
```

## CAP Entities

### 1. Grants
**Purpose**: Core grant records representing user consent and permissions

**Key Fields**:
- `id` - Grant identifier (non-secret, globally unique per AS)
- `client_id` - OAuth client(s) associated with grant
- `subject` - User identifier(s) who granted consent
- `actor` - Actor URN(s) for on-behalf-of scenarios
- `scope` - Aggregated OAuth scopes from all consents
- `status` - Grant status (active/revoked/expired)
- `risk_level` - Assessed risk level (low/medium/high)
- `createdAt` - Grant creation timestamp
- `modifiedAt` - Last modification timestamp

**Associations**:
- `authorization_details` → AuthorizationDetails (1:n)
- `consents` → Consents (1:n)

**Special Notes**:
- `client_id`, `actor`, `subject` can be arrays when multiple consents merge
- `scope` is aggregated from all associated consents
- Grant ID is public identifier (not a secret)

### 2. AuthorizationDetails
**Purpose**: Rich Authorization Request (RAR) details for grants

**Key Fields**:
- `type` - Authorization detail type (e.g., "mcp-tools", "api-access")
- `actions` - Array of permitted actions (e.g., ["run", "read"])
- `locations` - Array of resource locations (e.g., ["us-east-1"])
- `consent_grant_id` - Foreign key to grant

**Purpose**: Enables fine-grained permission tracking beyond simple scopes

### 3. Consents
**Purpose**: Individual consent records within a grant

**Key Fields**:
- `grant_id` - Grant this consent belongs to
- `subject` - Specific user who consented
- `scope` - Scopes approved in this consent
- `client_id` - Client for this consent
- `createdAt` - Consent timestamp

## Service Handlers

### 1. LIST - `/grants-management/Grants`

**Handler**: `handler.list.tsx`  
**Method**: GET  
**Purpose**: List all grants for current user with SSR dashboard UI

**Flow**:
```typescript
GET /grants-management/Grants
Accept: text/html

→ Server-Side Renders:
- Grant statistics (active/total/expired/revoked)
- Grant list with details
- Authorization details per grant
- Revoke buttons with HTMX
```

**Key Features**:

#### Data Aggregation
```typescript
// Reads all consents for user
const consentRecords = await srv.read(Consents);

// Aggregates by grant_id
grants = consentRecords.reduce((acc, consent) => {
  // Collect unique client_ids, actors, subjects
  // Merge authorization_details
  // Aggregate scopes
  return acc;
}, {});
```

#### SSR Dashboard Components
- **Statistics Cards**: Active, Total, Expired, Revoked counts
- **Grant Cards**: Individual grant with:
  - Status indicator (🔓 active / 🔒 revoked)
  - Client ID, subject, actor display
  - Risk level badge
  - Scope chips
  - Authorization details breakdown
  - View and Revoke actions

#### HTMX Integration
```tsx
<form
  action={`Grants/${grant.id}`}
  method="POST"
  hx-swap="outerHTML"
  hx-target="body"
>
  <input type="hidden" name="_method" value="DELETE" />
  <button type="submit">Revoke</button>
</form>
```

#### JSON API Mode
```typescript
// If Accept: application/json
GET /grants-management/Grants
→ Returns: Grant[]
```

### 2. GET (Single Grant) - `/grants-management/Grants/{id}`

**Handler**: `handler.edit.tsx`  
**Method**: GET  
**Purpose**: Display detailed grant view with SSR UI

**Flow**:
```typescript
GET /grants-management/Grants/gnt_xxx
Accept: text/html

→ Server-Side Renders:
- Grant metadata (client, subject, actor, timestamps)
- Risk level indicators
- Scope management UI
- Authorization details with edit capabilities
- Save/Revoke action buttons
```

**Key Features**:

#### Single Grant Query Workaround
```typescript
// Handles SELECT.one query properly
if (!req.query.SELECT?.one) {
  return await next(req); // Let collection handler process
}

// Aggregate consent data for single grant
const grant = await getGrant(srv, {
  ...req.data,
  ...(await next(req))
});
```

#### Detailed UI Sections

1. **Application Info Card**
   - Client ID display
   - Actor information
   - Risk badge with color coding
   - High-risk warnings

2. **Grant Metadata**
   - Subject identifier
   - Client ID(s)
   - Creation timestamp
   - Grant ID (monospace)

3. **Permissions & Scopes**
   - Scope chips with icons
   - Edit scopes button (future)
   - Remove individual scope capability

4. **Authorization Details**
   - MCP Tools Access section
   - API Access endpoints
   - File System Permissions
   - Interactive checkboxes (UI demo)

5. **Action Buttons**
   - Back to Grants
   - Save Changes (PATCH)
   - Revoke Grant (DELETE)

### 3. DELETE (Revoke) - `/grants-management/Grants/{id}`

**Handler**: `handler.revoke.tsx`  
**Method**: DELETE  
**Purpose**: Revoke grant and associated tokens

**Flow**:
```typescript
DELETE /grants-management/Grants/gnt_xxx

→ Updates grant status to 'revoked'
→ (Future) Cascades revocation to refresh/access tokens
→ Redirects to grant list with success message
```

**OAuth Spec Compliance**:
- HTTP 204 No Content on success
- Cascades to associated tokens
- Idempotent operation

### 4. UPDATE - `/grants-management/Grants/{id}`

**Handler**: `handler.edit.tsx`  
**Method**: POST/PATCH  
**Purpose**: Update grant permissions (placeholder)

**Current Status**: TODO - Planned for future implementation

**Planned Features**:
- Modify scopes
- Add/remove authorization details
- Update risk assessment

## Service Initialization Logic

**File**: `grant-management.tsx`

### Expand Hook
```typescript
this.on("GET", Grants, this.Expand);

private async Expand(...[req, next]) {
  // Auto-expand authorization_details and consents
  req.data["$expand"] = [
    "authorization_details",
    "consents"
  ].join(",");
  
  return next(req);
}
```

### Handler Registration
```typescript
this.on("DELETE", Grants, DELETE);
this.on("UPDATE", Grants, POST);
this.on("GET", Grants, this.Expand);
this.on("GET", Grants, GET);   // Single entity
this.on("GET", Grants, LIST);  // Collection
```

## Data Flow & Workarounds

### Grant Aggregation Problem
**Issue**: Last consent overwrites grant data in CDS projection

**Solution**: Manual aggregation in handlers

```typescript
async function getGrants(srv, data: Grants) {
  const consentRecords = await srv.read(Consents);
  const authorization_details = await srv.run(
    cds.ql.SELECT.from(AuthorizationDetails)
  );
  
  // Aggregate by grant_id
  const grants = consentRecords.reduce((acc, consent) => {
    const existing = acc[consent.grant_id] || {};
    
    // Collect unique values
    const client_ids = [...existing.client_ids, consent.client_id]
      .filter(unique);
    
    // Merge scopes
    const scope = [...existing.scopes, consent.scope]
      .filter(unique)
      .join(" ");
    
    acc[consent.grant_id] = {
      ...existing,
      client_id: client_ids.length > 1 ? client_ids : client_ids[0],
      scope,
      authorization_details: [...],
      consents: [...]
    };
    
    return acc;
  }, {});
  
  return Object.values(grants);
}
```

### Client ID Resolution
**Challenge**: Consents may not always have client_id

**Solution**: Fallback chain
```typescript
// 1. Try consents
const client_ids = consents.map(c => c.client_id).filter(Boolean);

// 2. Try grant record
if (!client_ids.length && grant?.client_id) {
  client_ids.push(grant.client_id);
}

// 3. Try AuthorizationRequests mapping
if (!client_ids.length) {
  const clientId = grantToClientMap.get(grant_id);
  if (clientId) client_ids.push(clientId);
}

// 4. Default
const finalClientIds = client_ids.length > 0 
  ? client_ids 
  : ["unknown"];
```

## UI Design System

### Color Coding

**Status Colors**:
- Active: `bg-green-500/20 text-green-400` 🔓
- Revoked: `bg-red-500/20 text-red-400` 🔒
- Expired: `bg-yellow-500/20 text-yellow-400` ⏰

**Risk Level Colors**:
- Low: `bg-green-500/20 text-green-400 border-green-500/30`
- Medium: `bg-yellow-500/20 text-yellow-400 border-yellow-500/30`
- High: `bg-red-500/20 text-red-400 border-red-500/30`

**Theme**:
- Background: `bg-gray-950` (near black)
- Cards: `bg-gray-800/50 backdrop-blur-sm`
- Borders: `border-gray-700`
- Text: `text-white` / `text-gray-400`

### Scope Icons
```typescript
function getScopeIcon(scope: string) {
  if (scope?.includes("tools")) return "🔧";
  if (scope?.includes("data")) return "📊";
  if (scope?.includes("file")) return "📁";
  if (scope?.includes("system")) return "⚙️";
  return "🛡️";
}
```

## OAuth Grant Management Spec Compliance

### Query Grant (RFC 9635 §3.1)
✅ GET `/grants-management/Grants/{grant_id}`
- Returns: grant_id, status, authorization_details, timestamps
- Requires: `grant_management_query` scope (enforced at service level)

### Revoke Grant (RFC 9635 §3.2)
✅ DELETE `/grants-management/Grants/{grant_id}`
- Returns: 204 No Content
- Cascades: Refresh/access token revocation (planned)
- Requires: `grant_management_revoke` scope

### Grant Metadata (RFC 9635 §2.1)
✅ Exposed via AuthorizationService metadata endpoint
- `grant_management_endpoint`: `/grants-management/Grants`
- `grant_management_actions_supported`: ["query", "revoke", "update", "replace", "create"]

### Token Response Integration
✅ Token responses include `grant_id`
- Enables client to discover grant for management
- Format: `at_${ulid}:${grant_id}`

## Security Considerations

1. **Authorization**: All endpoints require authenticated user
2. **Grant Ownership**: Users can only access their own grants
3. **Grant IDs are Public**: Non-secret identifiers (per spec)
4. **No Token Leakage**: API never exposes access/refresh tokens
5. **Audit Trail**: Consent history preserved
6. **Cache Control**: Sensitive responses prevent caching

## Integration Points

### With AuthorizationService
- Receives grant creation during authorization
- Links consents to grants
- Provides grant status for token responses

### With Token Format
- Token embeds grant_id: `at_${ulid}:${grant_id}`
- Enables token-to-grant lookup
- Supports revocation cascades

### With User Portal
- SSR dashboard for end users
- HTMX-powered interactions
- Progressive enhancement

## Related Files
- `grant-management.cds` - Service definition
- `grant-management.tsx` - Service implementation
- `handler.list.tsx` - Grant list with SSR dashboard
- `handler.edit.tsx` - Single grant view with SSR detail page
- `handler.revoke.tsx` - Grant revocation logic




