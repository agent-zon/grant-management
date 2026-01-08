# Authorization Service - Service Actions and CAP Entities

**Created**: 2025-11-30  
**Last Updated**: 2025-11-30  
**Category**: [ARCHITECTURE]  
**Timeline**: 00 of 04 - Service Architecture Overview

## Overview

The Authorization Service (`srv/authorization-service/`) implements an OAuth 2.0 Authorization Server with Rich Authorization Requests (RAR) support following RFC 9396. It provides endpoints for authorization, token exchange, and consent management, with server-side rendered UI for the authorization flow.

## Service Definition (CDS)

```cds
@path: '/oauth-server'
@impl: './authorization-service.tsx'
@protocol: 'rest'
service AuthorizationService {
    // Entities
    entity AuthorizationRequests
    entity Consents
    
    // Actions/Functions
    action authorize(request_uri: String, client_id: String)
    function authorize_dialog(request_uri: String, client_id: String)
    function callback(grant_id: String)
    action par(...) // Pushed Authorization Request
    action token(...) // Token exchange endpoint
    action metadata() // OAuth server metadata
}
```

## CAP Entities

### 1. AuthorizationRequests
**Purpose**: Stores OAuth authorization requests created via PAR endpoint

**Key Fields**:
- `ID` - Unique request identifier
- `grant_id` - Associated grant identifier
- `client_id` - OAuth client identifier
- `redirect_uri` - Callback URL after authorization
- `scope` - Requested OAuth scopes
- `state` - OAuth state parameter
- `code_challenge` / `code_challenge_method` - PKCE parameters
- `grant_management_action` - Grant lifecycle action (create/merge/update/replace)
- `authorization_details` - RAR authorization details (RFC 9396)
- `requested_actor` - Actor URN for on-behalf-of scenarios
- `subject` - Subject identifier
- `subject_token` / `subject_token_type` - Token exchange parameters
- `status` - Request status (pending/approved/rejected)
- `risk_level` - Risk assessment (low/medium/high)

**Associations**:
- `grant` → Grants entity (via grant_id)
- `access` → AuthorizationDetailRequest (composition)

### 2. Consents
**Purpose**: Records user consent decisions for authorization requests

**Key Fields**:
- `grant_id` - Grant this consent belongs to
- `request_ID` - Authorization request being consented
- `subject` - User who granted consent
- `scope` - Approved scopes
- `previous_consent` - Link to previous consent (for audit trail)
- `createdAt` - Timestamp of consent

**Associations**:
- `request` → AuthorizationRequests (via request_ID)
- `grant` → Grants (via grant_id)

## Service Actions

### 1. PAR (Pushed Authorization Request) - `/oauth-server/par`

**Handler**: `handler.requests.tsx`  
**Method**: POST  
**Purpose**: Creates authorization request with RAR support

**Flow**:
```typescript
POST /oauth-server/par
{
  "client_id": "agent-app",
  "scope": "mcp.tools",
  "authorization_details": "[{...}]",  // RAR details
  "grant_management_action": "merge",
  "grant_id": "gnt_xxx"  // Optional, for merge/update
}

→ Returns:
{
  "request_uri": "urn:ietf:params:oauth:request_uri:${ID}",
  "expires_in": 90
}
```

**Key Logic**:
- Generates or reuses grant_id
- Parses authorization_details JSON into structured format
- Creates AuthorizationRequest record with all parameters
- Returns request_uri for authorization endpoint

### 2. Authorize - `/oauth-server/authorize`

**Handler**: `handler.authorize.tsx`  
**Method**: GET/POST  
**Purpose**: Renders SSR consent UI for authorization

**Flow**:
```typescript
GET /oauth-server/authorize?request_uri=urn:...&client_id=...

→ Server-Side Renders:
- Authorization request details
- Client information
- RAR authorization details (tools, actions, locations)
- Risk level indicators
- Grant merge indicators (if applicable)
- HTMX-powered consent form
```

**Key Features**:
- **SSR with React TSX**: Uses `renderToString()` for initial HTML
- **HTMX Integration**: Form submits via HTMX to `/AuthorizationRequests/${id}/consent`
- **Grant Upsert**: Creates or updates grant record via GrantsManagementService
- **Merge Support**: Shows existing permissions when merging grants
- **Authorization Details Component**: Renders tool permissions from RAR

**UI Elements**:
- Client ID and scope display
- Actor/subject information (on-behalf-of)
- Authorization details breakdown (type, actions, locations)
- Risk warnings for high-risk permissions
- Grant/Deny buttons with HTMX POST

### 3. Consent POST - `/oauth-server/AuthorizationRequests/${id}/consent`

**Handler**: `handler.consent.tsx`  
**Method**: POST  
**Purpose**: Processes user consent decision

**Flow**:
```typescript
POST /oauth-server/AuthorizationRequests/${id}/consent
{
  "grant_id": "gnt_xxx",
  "subject": "user@example.com",
  "scope": "mcp.tools"
}

→ Creates Consent record
→ Redirects to callback or client redirect_uri with code
```

**Key Logic**:
- Normalizes consent payload (ensures request association)
- Links to previous consent for audit trail
- Checks redirect_uri:
  - If `urn:scai:grant:callback` → Renders success page
  - Otherwise → 301 redirect with authorization code

### 4. Token Exchange - `/oauth-server/token`

**Handler**: `handler.token.tsx`  
**Method**: POST  
**Purpose**: Exchanges authorization code for access token

**Flow**:
```typescript
POST /oauth-server/token
{
  "grant_type": "authorization_code",
  "code": "${request_ID}",  // Authorization code
  "code_verifier": "..."    // PKCE verifier
}

→ Returns:
{
  "access_token": "at_${ulid}:${grant_id}",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "...",
  "grant_id": "gnt_xxx",
  "authorization_details": [...],  // RAR details
  "actor": "urn:agent:..."         // If on-behalf-of
}
```

**Key Logic**:
- Validates grant_type (only authorization_code supported)
- Looks up authorization request by code
- Fetches grant record directly from DB (avoids UI handler triggers)
- Fetches authorization_details from DB
- Returns token with embedded grant_id (enables Grant Management API)

### 5. Callback - `/oauth-server/callback`

**Handler**: `handler.callback.tsx`  
**Method**: GET  
**Purpose**: Renders success page after authorization

**Flow**:
- SSR success page with grant_id
- Links to view grant or all grants
- "You can close this window" message

### 6. Metadata - `/oauth-server/metadata`

**Handler**: `handler.metadata.tsx`  
**Method**: GET  
**Purpose**: OAuth 2.0 Authorization Server Metadata (RFC 8414)

**Returns**:
```json
{
  "issuer": "https://...",
  "authorization_endpoint": "https://.../oauth-server/authorize",
  "token_endpoint": "https://.../oauth-server/token",
  "pushed_authorization_request_endpoint": "https://.../oauth-server/par",
  "authorization_details_types_supported": ["mcp-tools", "..."],
  "grant_types_supported": ["authorization_code"],
  "response_types_supported": ["code"],
  "code_challenge_methods_supported": ["S256"]
}
```

## Service Initialization Logic

**File**: `authorization-service.tsx`

### Before READ Hook
```typescript
this.before("READ", AuthorizationRequests, (req) => {
  // Auto-expand grant with authorization_details
  req.data["$expand"] = [
    "grant($expand=authorization_details)"
  ].join(",");
});
```

### Before CREATE Hook (Consents)
```typescript
this.before("CREATE", Consents, async (req) => {
  // Normalize grant_id from various formats
  // Resolve grant_id from AuthorizationRequest if not provided
  // Ensure request association is set
});
```

### Action Registration
```typescript
this.on("token", token);
this.on("authorize", authorize);
this.on("authorize_dialog", authorize);
this.on("callback", callback);
this.on("par", par);
this.on("metadata", metadata);
this.on("CREATE", Consents, consent);
```

## Security Considerations

1. **Authentication**: All endpoints require `authenticated-user` or `system-user`
2. **PKCE**: Code challenge/verifier support prevents authorization code interception
3. **Grant Binding**: Access tokens embed grant_id for revocation support
4. **Audit Trail**: Consent records link to previous consent
5. **Risk Assessment**: High-risk permissions show warnings in UI
6. **Actor Validation**: On-behalf-of scenarios tracked via requested_actor

## Integration Points

### With GrantsManagementService
- Creates/updates grants during authorization
- Links consents to grants via grant_id
- Enables grant lifecycle (query/revoke/update)

### With Token Response
- Embeds grant_id in access token format: `at_${ulid}:${grant_id}`
- Returns authorization_details in token response
- Returns actor for on-behalf-of scenarios

### With Client Applications
- PAR endpoint for secure authorization initiation
- Authorization endpoint for user consent
- Token endpoint for code exchange
- Metadata endpoint for discovery

## Design Patterns

1. **Direct DB Queries**: Token handler uses `cds.run(cds.ql.SELECT)` to avoid triggering UI rendering handlers
2. **Request-Consent-Grant Chain**: Authorization request → User consent → Grant persistence
3. **RAR Normalization**: JSON authorization_details parsed into structured entities
4. **Grant ID Propagation**: grant_id flows from PAR → Authorization → Consent → Token
5. **HTMX Progressive Enhancement**: Server renders HTML, HTMX handles interactions

## Related Files
- `authorization-service.cds` - Service definition
- `authorization-service.tsx` - Service implementation
- `handler.authorize.tsx` - Authorization UI (SSR)
- `handler.token.tsx` - Token exchange logic
- `handler.consent.tsx` - Consent processing
- `handler.requests.tsx` - PAR endpoint
- `handler.callback.tsx` - Success page
- `handler.metadata.tsx` - OAuth metadata
- `details/index.tsx` - Authorization details component




