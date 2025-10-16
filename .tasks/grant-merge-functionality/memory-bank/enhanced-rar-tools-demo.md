# Enhanced Rich Authorization Requests with Tools Demo

This demonstrates the enhanced RAR implementation using tools with essential/optional flags and Mustache templates.

## Key Features

1. **Tools-based Permissions**: Similar to OpenID Connect claims but for tools
2. **Essential vs Optional**: Tools marked as `"essential": true` vs `null` (optional)
3. **Mustache Templates**: Each authorization detail type has its own template
4. **Dynamic UI**: Template-driven consent screen rendering
5. **Structured Storage**: Authorization details stored as typed arrays in database

## Example Authorization Details Request

### Grant Management with Tools
```json
[
  {
    "type": "grant_management",
    "locations": ["https://localhost:4004/grants"],
    "actions": ["create", "read", "update", "delete"],
    "tools": {
      "create_grant": { "essential": true },
      "read_grant": { "essential": true },
      "update_grant": null,
      "delete_grant": null,
      "list_grants": { "essential": true },
      "grant_analytics": null
    }
  }
]
```

### File Access with Tools
```json
[
  {
    "type": "file_access",
    "locations": ["https://localhost:4004/files"],
    "datatypes": ["documents", "images"],
    "identifier": "/workspace/project1",
    "tools": {
      "read_file": { "essential": true },
      "write_file": null,
      "delete_file": null,
      "list_directory": { "essential": true },
      "create_directory": null,
      "file_metadata": null,
      "file_search": null
    }
  }
]
```

### Data Access with Tools
```json
[
  {
    "type": "data_access",
    "datatypes": ["customer_data", "analytics"],
    "locations": ["https://localhost:4004/api/data"],
    "tools": {
      "query_data": { "essential": true },
      "aggregate_data": null,
      "export_data": null,
      "data_analytics": null,
      "create_report": null,
      "data_visualization": null
    }
  }
]
```

### Network Access with Tools
```json
[
  {
    "type": "network_access",
    "locations": ["https://api.external.com", "https://webhook.service.com"],
    "actions": ["connect", "send_data"],
    "tools": {
      "http_request": { "essential": true },
      "webhook_send": null,
      "api_call": null,
      "websocket_connect": null,
      "ftp_access": null,
      "ssh_connect": null
    }
  }
]
```

## PAR Request Example

```bash
curl -X POST http://localhost:4004/oauth-server/par \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "response_type=code" \
  -d "client_id=demo-client" \
  -d "redirect_uri=http://localhost:3000/callback" \
  -d "scope=grant_management file_access" \
  -d "code_challenge=K2-ltc83acc4h0c9w6ESC_rEMTJ3bwc-uCHaoeK1t8U" \
  -d "code_challenge_method=S256" \
  -d 'authorization_details=[{"type":"grant_management","locations":["https://localhost:4004/grants"],"actions":["create","read","update","delete"],"tools":{"create_grant":{"essential":true},"read_grant":{"essential":true},"update_grant":null,"delete_grant":null,"list_grants":{"essential":true},"grant_analytics":null}},{"type":"file_access","locations":["https://localhost:4004/files"],"datatypes":["documents","images"],"tools":{"read_file":{"essential":true},"write_file":null,"delete_file":null,"list_directory":{"essential":true},"create_directory":null,"file_metadata":null}}]'
```

## Consent Screen Features

### Template-Driven Rendering
Each authorization detail type uses its own Mustache template:

1. **Grant Management Template**: Shows system admin interface with grant tools
2. **File Access Template**: Shows file system interface with file operation tools  
3. **Data Access Template**: Shows data analytics interface with query tools
4. **Network Access Template**: Shows network connectivity interface with protocol tools

### User Experience
- **Fixed Properties**: Locations, actions, datatypes shown as read-only badges
- **Essential Tools**: Pre-checked and disabled (cannot be unchecked)
- **Optional Tools**: User can check/uncheck based on their preference
- **Risk Indicators**: Color-coded risk levels (High/Medium/Low)
- **Category Tags**: Visual categorization of permission types

### Example Consent Screen Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 🛡️ Rich Authorization Request                               │
│ Review and grant permissions for requested tools            │
├─────────────────────────────────────────────────────────────┤
│ Client: demo-client                                         │
│ Scope: grant_management file_access                         │
├─────────────────────────────────────────────────────────────┤
│ ┌─ Grant Management ──────────────────── MEDIUM RISK ─┐    │
│ │ Access to grant management system                    │    │
│ │                                                      │    │
│ │ Fixed Properties:                                    │    │
│ │ 🌐 https://localhost:4004/grants                     │    │
│ │ ⚡ create ⚡ read ⚡ update ⚡ delete                  │    │
│ │                                                      │    │
│ │ Tools & Permissions:                                 │    │
│ │ ☑️ create_grant        [REQUIRED]                    │    │
│ │ ☑️ read_grant          [REQUIRED]                    │    │
│ │ ☐ update_grant        Optional                       │    │
│ │ ☐ delete_grant        Optional                       │    │
│ │ ☑️ list_grants         [REQUIRED]                    │    │
│ │ ☐ grant_analytics     Optional                       │    │
│ └──────────────────────────────────────────────────────┘    │
│                                                             │
│ ┌─ File Access ──────────────────────────── HIGH RISK ─┐    │
│ │ Access to file system resources                      │    │
│ │                                                      │    │
│ │ Fixed Properties:                                    │    │
│ │ 🌐 https://localhost:4004/files                      │    │
│ │ 📊 documents 📊 images                               │    │
│ │                                                      │    │
│ │ Tools & Permissions:                                 │    │
│ │ ☑️ read_file          [REQUIRED]                     │    │
│ │ ☐ write_file         Optional                        │    │
│ │ ☐ delete_file        Optional                        │    │
│ │ ☑️ list_directory     [REQUIRED]                     │    │
│ │ ☐ create_directory   Optional                        │    │
│ │ ☐ file_metadata      Optional                        │    │
│ └──────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│ Grant Duration: ○ 1h ○ 8h ●24h ○ 1w ○ Permanent           │
│ Reason: [Optional text field]                               │
│                                                             │
│ [Cancel] [Grant Consent]                                    │
└─────────────────────────────────────────────────────────────┘
```

## Database Storage

### Authorization Request Storage
```typescript
// AuthorizationRequests.authorizationDetails
[
  {
    type: "grant_management",
    tools: {
      "create_grant": { essential: true },
      "read_grant": { essential: true },
      "update_grant": null,
      "delete_grant": null,
      "list_grants": { essential: true },
      "grant_analytics": null
    },
    locations: ["https://localhost:4004/grants"],
    actions: ["create", "read", "update", "delete"]
  }
]
```

### Grant Storage (After User Consent)
```typescript
// Grants.authorizationDetails
[
  {
    type: "grant_management",
    tools: {
      "create_grant": true,    // Essential - always granted
      "read_grant": true,      // Essential - always granted  
      "update_grant": true,    // Optional - user granted
      "delete_grant": false,   // Optional - user denied
      "list_grants": true,     // Essential - always granted
      "grant_analytics": false // Optional - user denied
    },
    locations: ["https://localhost:4004/grants"],
    actions: ["create", "read", "update", "delete"]
  }
]
```

## Token Response

```json
{
  "access_token": "at_1696234567890_abc123def456",
  "token_type": "Bearer", 
  "expires_in": 3600,
  "scope": "grant_management file_access",
  "grant_id": "550e8400-e29b-41d4-a716-446655440000",
  "authorization_details": [
    {
      "type": "grant_management",
      "tools": {
        "create_grant": true,
        "read_grant": true,
        "update_grant": true,
        "delete_grant": false,
        "list_grants": true,
        "grant_analytics": false
      },
      "locations": ["https://localhost:4004/grants"],
      "actions": ["create", "read", "update", "delete"]
    },
    {
      "type": "file_access", 
      "tools": {
        "read_file": true,
        "write_file": false,
        "delete_file": false,
        "list_directory": true,
        "create_directory": false,
        "file_metadata": false
      },
      "locations": ["https://localhost:4004/files"],
      "datatypes": ["documents", "images"]
    }
  ]
}
```

## Implementation Benefits

### 1. **OpenID Connect Claims Pattern**
- Familiar pattern for developers
- Clear distinction between required and optional permissions
- Fine-grained control over individual tools

### 2. **Template-Driven UI**
- Each authorization type has custom rendering
- Consistent user experience across different permission types
- Easy to add new authorization detail types

### 3. **Type Safety**
- Structured database schema with proper typing
- Compile-time validation of authorization details
- Clear separation between request and grant formats

### 4. **Security**
- Essential tools cannot be disabled by user
- Optional tools give user control
- Risk-based visual indicators
- Audit trail of granted vs requested permissions

### 5. **Extensibility**
- Easy to add new authorization detail types
- Custom Mustache templates for each type
- Flexible tool definitions per type
- API-specific fields supported

This enhanced implementation provides a robust, user-friendly, and secure way to handle fine-grained authorization requests with tools-based permissions.
