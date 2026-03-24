# Grant Management API

This application implements the OAuth 2.0 Grant Management API specification
using SAP CAP (Cloud Application Programming) framework, allowing clients to
explicitly manage their grants with the authorization server.

## Overview

The Grant Management API provides standardized endpoints for:

- **Query**: Retrieve the current status of a specific grant
- **Revoke**: Request the revocation of a grant
- **Create**: Create new grants during OAuth authorization flow
- **Update**: Update existing grants with additional permissions
- **Replace**: Replace existing grants with new permissions

## Architecture

The implementation uses:

- **SAP CAP Framework**: For service definition and data modeling
- **CDS (Core Data Services)**: For entity definitions and service
  implementation
- **Authorization Details**: Model tools and operations as Rich Authorization
  Request (RAR) authorization details

## CDS Service Structure

### Entities

- **Grants**: Main grant entity with OAuth 2.0 Grant Management fields
- **GrantScopes**: Scopes associated with grants (with resource indicators)
- **GrantClaims**: OpenID Connect claims associated with grants
- **GrantAuthorizationDetails**: Rich Authorization Request details (tools and
  operations)
- **AccessTokens**: Access tokens issued for grants
- **RefreshTokens**: Refresh tokens issued for grants

### Service Functions

- `getMetadata()`: Returns server metadata
- `getGrantStatus(grantId)`: Returns grant status and details
- `revokeGrant(grantId)`: Revokes a grant and associated tokens
- `createGrant(...)`: Creates new grants during OAuth flow
- `updateGrant(...)`: Updates existing grants
- `replaceGrant(...)`: Replaces existing grants
- `getAuthorizationDetailTypes()`: Returns available authorization detail types

## API Endpoints

### 1. Server Metadata

**GET** `/api/grants`

Returns server metadata about grant management capabilities.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
    "grant_management_actions_supported": ["query", "revoke"],
    "grant_management_endpoint": "https://your-domain.com/api/grants",
    "grant_management_action_required": false,
    "server_info": {
        "name": "Agent Grants Authorization Server",
        "version": "1.0.0",
        "supported_scopes": [
            "grant_management_query",
            "grant_management_revoke"
        ]
    }
}
```

### 2. Query Grant Status

**GET** `/api/grants/{grant_id}`

Retrieves the current status and details of a specific grant.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200 OK):**

```json
{
    "scopes": [
        {
            "scope": "tools:read",
            "resources": [
                "https://api.example.com/tools/listfiles",
                "https://api.example.com/tools/readfile"
            ]
        }
    ],
    "claims": ["resource_owner"],
    "authorization_details": [
        {
            "type": "tool_access",
            "actions": ["list_files", "read_file"],
            "locations": [
                "https://api.example.com/tools/listfiles",
                "https://api.example.com/tools/readfile"
            ]
        }
    ],
    "grant_id": "1",
    "status": "active",
    "created_at": "2024-01-15T10:30:00Z",
    "expires_at": "2024-01-16T10:30:00Z",
    "usage_count": 15,
    "last_used": "2024-01-15T14:45:00Z"
}
```

**Error Responses:**

- `401 Unauthorized`: Missing or invalid access token
- `403 Forbidden`: Client not authorized to access this grant
- `404 Not Found`: Grant not found

### 3. Revoke Grant

**DELETE** `/api/grants/{grant_id}`

Revokes a specific grant and all associated tokens.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

- `204 No Content`: Grant successfully revoked

**Error Responses:**

- `401 Unauthorized`: Missing or invalid access token
- `403 Forbidden`: Client not authorized to revoke this grant
- `404 Not Found`: Grant not found

## Authorization

All API endpoints require a valid access token with appropriate scopes:

- **grant_management_query**: Required for querying grant status
- **grant_management_revoke**: Required for revoking grants

## Grant Lifecycle

### Creation

The **client** is responsible for generating and tracking `grant_id` values.
The client provides the `grant_id` in the PAR (Pushed Authorization Request),
typically derived deterministically from known data (e.g. subject, actor).

When a grant is created, the `grant_id` is returned in the token response:

```json
{
    "access_token": "2YotnFZFEjr1zCsicMWpAA",
    "token_type": "Bearer",
    "expires_in": 3600,
    "refresh_token": "tGzv3JOkF0XG5Qx2TlKWIA",
    "grant_id": "TSdqirmAxDa0_-DB_1bASQ"
}
```

### Modification (create_or_merge)

Grants can be modified through the authorization flow using:

- `grant_management_action=merge`: Merge new permissions with existing grant.
  Acts as **create_or_merge** — if no `grant_id` is provided, the server
  generates one and creates a new grant instead.
- `grant_management_action=replace`: Replace existing permissions entirely

When merging, tools in the existing grant are compared against incoming tools:
- Tools with boolean values (`true`/`false`) are considered **decided** and
  filtered out of the consent screen
- Tools with non-boolean values (`null`/other) are considered **undecided** and
  presented to the user for consent

### Deletion

Grants are revoked using the DELETE endpoint, which:

- Revokes the grant
- Revokes all refresh tokens issued based on that grant
- Optionally revokes all access tokens issued based on that grant

## Security Considerations

1. **Grant IDs are public identifiers** - they are not secrets and may leak
   through authorization requests
2. **Grant ID ownership** - the client generates and provides `grant_id` values;
   the server does not auto-resolve grants by (subject, actor) lookup
3. **GET ownership check** - querying a grant by ID requires the caller to be
   the grant's `subject`, `actor`, or hold the `grant_admin` role (403 otherwise)
4. **Access control** - Clients can only access grants they are authorized for
5. **Token management** - The API does not expose tokens to prevent leakage
6. **Privacy** - No user identity data is exposed in grant status responses

## Implementation Notes

- The API follows the OAuth 2.0 Grant Management specification
- All responses include proper HTTP status codes and error messages
- Cache-Control headers are set to prevent caching of sensitive data
- The implementation supports both web UI and programmatic API access

## Example Usage

### Query a Grant

```bash
curl -X GET "https://your-domain.com/api/grants/1" \
  -H "Authorization: Bearer your_access_token"
```

### Revoke a Grant

```bash
curl -X DELETE "https://your-domain.com/api/grants/1" \
  -H "Authorization: Bearer your_access_token"
```

### Get Server Metadata

```bash
curl -X GET "https://your-domain.com/api/grants" \
  -H "Authorization: Bearer your_access_token"
```

## Web UI

The application also provides a web-based user interface for grant management:

- `/grants` - List all grants
- `/grants/{id}` - View grant details
- `/grants/{id}/grant` - Grant consent
- `/grants/{id}/revoke` - Revoke consent

The web UI and API work together to provide both user-friendly interfaces and
programmatic access for OAuth clients.
