# Rich Authorization Requests (RAR) Implementation Demo

This document demonstrates the implementation of OAuth 2.0 Rich Authorization Requests (RFC 9396) in the CDS SSR authorization system.

## Overview

The implementation provides:
1. **Authorization Details Validation**: Validates RAR format according to RFC 9396
2. **Consent Screen Rendering**: Dynamic UI with required/optional/prefill properties
3. **User Consent Processing**: Merges user input with requested permissions
4. **Grant Storage**: Stores resolved authorization details as JSON arrays
5. **Token Response**: Returns authorization details in token responses

## Example Usage

### 1. PAR Request with Authorization Details

```bash
curl -X POST http://localhost:4004/oauth-server/par \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "response_type=code" \
  -d "client_id=demo-client" \
  -d "redirect_uri=http://localhost:3000/callback" \
  -d "scope=grant_management" \
  -d "code_challenge=K2-ltc83acc4h0c9w6ESC_rEMTJ3bwc-uCHaoeK1t8U" \
  -d "code_challenge_method=S256" \
  -d "authorization_details=[{\"type\":\"grant_management\",\"actions\":[\"create\",\"read\",\"update\"],\"locations\":[\"https://localhost:4004/grants\"]},{\"type\":\"file_access\",\"actions\":[\"read\"],\"locations\":[\"https://localhost:4004/files\"],\"datatypes\":[\"documents\",\"images\"]}]"
```

### 2. Authorization Details Types Supported

#### Grant Management
```json
{
  "type": "grant_management",
  "actions": ["create", "read", "update", "delete"],
  "locations": ["https://localhost:4004/grants"],
  "duration": "24h",
  "scope": "grant_management_query"
}
```

**Metadata:**
- **Required**: `type`, `actions`
- **Optional**: `locations`, `duration`, `scope`
- **Prefill**: `actions: ["create", "read", "update", "delete"]`, `locations: ["https://localhost:4004/grants"]`
- **Risk Level**: Medium
- **Category**: system-admin

#### File Access
```json
{
  "type": "file_access",
  "actions": ["read", "write"],
  "locations": ["https://localhost:4004/files"],
  "datatypes": ["documents", "images"],
  "identifier": "/path/to/specific/file"
}
```

**Metadata:**
- **Required**: `type`, `locations`, `actions`
- **Optional**: `datatypes`, `identifier`
- **Prefill**: `actions: ["read"]`
- **Risk Level**: High
- **Category**: file-system

#### Data Access
```json
{
  "type": "data_access",
  "datatypes": ["customer_data", "analytics"],
  "actions": ["read", "aggregate"],
  "locations": ["https://localhost:4004/api/data"],
  "identifier": "dataset-123"
}
```

**Metadata:**
- **Required**: `type`, `datatypes`, `actions`
- **Optional**: `locations`, `identifier`
- **Prefill**: `actions: ["read"]`
- **Risk Level**: Medium
- **Category**: data-access

#### Network Access
```json
{
  "type": "network_access",
  "locations": ["https://api.external.com", "https://webhook.service.com"],
  "actions": ["connect", "send_data"],
  "datatypes": ["webhooks", "api_calls"]
}
```

**Metadata:**
- **Required**: `type`, `locations`, `actions`
- **Optional**: `datatypes`
- **Prefill**: `actions: ["connect"]`
- **Risk Level**: High
- **Category**: network

### 3. Consent Screen Features

The consent screen automatically renders:

1. **Client Information**: Shows requesting client and scope
2. **Authorization Details**: Each detail type with:
   - Risk level indicator (High/Medium/Low)
   - Category badge
   - Description text
   - Required fields (read-only, highlighted)
   - Optional fields (editable inputs)
   - Prefilled values
3. **Grant Duration**: Standard duration options
4. **Security Warnings**: Risk-based warnings for high-risk permissions

### 4. User Consent Processing

When user submits consent:
1. Required fields are preserved as-is
2. Optional fields are updated with user input
3. Array fields support comma-separated input
4. Resolved authorization details are stored in grant
5. User is redirected with authorization code

### 5. Token Response with Authorization Details

```json
{
  "access_token": "at_1696234567890_abc123def456",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "grant_management",
  "grant_id": "550e8400-e29b-41d4-a716-446655440000",
  "authorization_details": [
    {
      "type": "grant_management",
      "actions": ["create", "read", "update"],
      "locations": ["https://localhost:4004/grants"],
      "duration": "24h"
    },
    {
      "type": "file_access",
      "actions": ["read"],
      "locations": ["https://localhost:4004/files"],
      "datatypes": ["documents"]
    }
  ]
}
```

## Implementation Details

### Database Schema
- `Grants.authorizationDetails`: JSON string storing array of resolved authorization detail objects
- `AuthorizationRequests.authorizationDetails`: JSON string storing requested authorization details

### Processing Flow
1. **PAR Endpoint**: Validates and stores authorization details
2. **Authorize Endpoint**: Enriches details with metadata and renders consent screen
3. **Grant Creation**: Merges user consent with requested details
4. **Token Endpoint**: Filters and returns relevant authorization details

### Security Considerations
- All authorization details are validated against RFC 9396 schema
- Risk levels are assigned based on detail type
- High-risk permissions show additional warnings
- User can only modify optional fields, required fields are protected
- Authorization details are filtered in token response based on audience

### Error Handling
- `invalid_authorization_details`: Returned for malformed authorization details
- Detailed error messages for validation failures
- Graceful fallback to scope-based permissions if no authorization details

## Testing

### Test Authorization Details Request
```json
[
  {
    "type": "grant_management",
    "actions": ["create", "read"],
    "locations": ["https://localhost:4004/grants"]
  },
  {
    "type": "file_access",
    "actions": ["read"],
    "locations": ["https://localhost:4004/files"],
    "datatypes": ["documents", "images"],
    "identifier": "/workspace/project1"
  }
]
```

### Expected Consent Screen
- Grant Management: Medium risk, system-admin category
  - Required: type, actions
  - Optional: locations (prefilled), duration, scope
- File Access: High risk, file-system category  
  - Required: type, locations, actions
  - Optional: datatypes (user can edit), identifier (user can edit)

### Expected Grant Storage
After user consent (assuming user modified some optional fields):
```json
[
  {
    "type": "grant_management",
    "actions": ["create", "read"],
    "locations": ["https://localhost:4004/grants"],
    "duration": "8h"
  },
  {
    "type": "file_access", 
    "actions": ["read"],
    "locations": ["https://localhost:4004/files"],
    "datatypes": ["documents"],
    "identifier": "/workspace/project1/docs"
  }
]
```

This implementation fully supports the OAuth 2.0 Rich Authorization Requests specification while providing a user-friendly consent experience with proper security considerations.
