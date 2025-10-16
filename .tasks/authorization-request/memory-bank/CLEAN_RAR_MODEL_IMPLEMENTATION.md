# Clean Rich Authorization Requests Model Implementation

## ✅ Clean, Type-Specific Model Complete!

This implementation provides a clean, type-specific authorization details model where each type has its own schema and properties, removing backward compatibility concerns.

## 🏗️ **Clean Database Schema**

### Authorization Detail Type
```cds
type AuthorizationDetail {
  type: String; // Determines which properties are used
  
  // Common properties for all types
  locations: array of String; // Resource locations/endpoints
  actions: array of String;   // Allowed actions
  
  // Type-specific properties (only relevant ones used based on type)
  
  // For mcp-tools type
  server: String;           // MCP server URL
  transport: String;        // Transport protocol
  tools: Map;              // tool_name -> boolean (granted/denied)
  
  // For api type  
  urls: array of String;    // API endpoint URLs
  protocols: array of String; // HTTP, HTTPS, WebSocket, gRPC, etc.
  
  // For fs type
  roots: array of String;   // File system root paths
  permissions: array of String; // read, write, execute, delete, etc.
  
  // For database type
  databases: array of String; // Database names
  schemas: array of String;   // Schema names
  tables: array of String;    // Table names
  
  // For other types (grant_management, data_access, network_access)
  resources: array of String;  // Generic resources
  datatypes: array of String;  // Data types
  identifier: String;         // Resource identifier
  privileges: array of String; // Privilege levels
}
```

## 🎯 **Type-Specific Schemas**

### 1. **MCP Tools** (`mcp-tools`)
```json
{
  "type": "mcp-tools",
  "server": "https://admin.mcp.example.net",
  "transport": "stdio",
  "locations": ["global"],
  "actions": ["run"],
  "tools": {
    "system.monitor": { "essential": true },
    "user.manage": { "essential": true },
    "config.read": { "essential": true },
    "logs.analyze": null
  }
}
```
**Properties:**
- `server`: MCP server URL
- `transport`: Communication protocol
- `tools`: Map of tool_name → essential/optional

### 2. **API Access** (`api`)
```json
{
  "type": "api",
  "urls": ["https://admin.api.example.com", "https://users.api.example.com"],
  "protocols": ["HTTPS", "gRPC"],
  "actions": ["read", "write"]
}
```
**Properties:**
- `urls`: API endpoint URLs
- `protocols`: Supported protocols (HTTP, HTTPS, WebSocket, gRPC)
- No tools - URLs and protocols define the access

### 3. **File System** (`fs`)
```json
{
  "type": "fs",
  "roots": ["/workspace", "/home/user"],
  "actions": ["read", "write", "execute"],
  "permissions": {
    "read": { "essential": true },
    "write": { "essential": true },
    "delete": null,
    "execute": null
  }
}
```
**Properties:**
- `roots`: File system root paths
- `permissions`: Map of permission_name → essential/optional

### 4. **Database Access** (`database`)
```json
{
  "type": "database",
  "databases": ["user_management", "system_config"],
  "schemas": ["public", "admin"],
  "tables": ["*"],
  "actions": ["read", "write", "backup"]
}
```
**Properties:**
- `databases`: Database names
- `schemas`: Schema names  
- `tables`: Table names
- No user-configurable permissions - scope defined by databases/schemas/tables

## 🔧 **Processing Logic**

### 1. **Form Field Preprocessing**
```typescript
this.before('POST', Grants, async (req) => {
  const userConsent = {};
  const cleanedData = {};
  
  Object.entries(req.data).forEach(([key, value]) => {
    if (key.startsWith('tool_') || key.startsWith('perm_')) {
      userConsent[key] = value; // Extract for processing
    } else {
      cleanedData[key] = value; // Keep for CDS validation
    }
  });
  
  req.userConsent = userConsent;
  req.data = cleanedData;
});
```

### 2. **Type-Specific Processing**
```typescript
switch (detail.type) {
  case 'mcp-tools':
    // Process tools with dot notation support
    if (detail.tools) {
      granted.tools = {};
      Object.entries(detail.tools).forEach(([toolName, permission]) => {
        const consentKey = `tool_${toolName.replace(/\./g, '_')}`;
        granted.tools[toolName] = permission?.essential || Boolean(userConsent[consentKey]);
      });
    }
    break;
    
  case 'api':
    // Copy fixed API properties (no user input)
    if (detail.urls) granted.urls = detail.urls;
    if (detail.protocols) granted.protocols = detail.protocols;
    break;
    
  case 'fs':
    // Process permissions
    if (detail.permissions) {
      granted.permissions = {};
      Object.entries(detail.permissions).forEach(([permName, permission]) => {
        const consentKey = `perm_${permName}`;
        granted.permissions[permName] = permission?.essential || Boolean(userConsent[consentKey]);
      });
    }
    break;
    
  case 'database':
    // Copy fixed database properties (no user input)
    if (detail.databases) granted.databases = detail.databases;
    if (detail.schemas) granted.schemas = detail.schemas;
    if (detail.tables) granted.tables = detail.tables;
    break;
}
```

## 🎨 **Type-Specific UI Rendering**

### MCP Tools
- **Fixed**: Server URL, transport, locations, actions
- **User Control**: Individual tools (essential vs optional)

### API Access  
- **Fixed**: URLs, protocols, actions
- **User Control**: None (scope defined by URLs/protocols)

### File System
- **Fixed**: Root paths, actions
- **User Control**: Individual permissions (read, write, delete, execute)

### Database
- **Fixed**: Databases, schemas, tables, actions
- **User Control**: None (scope defined by database configuration)

## 🔒 **Security Model**

### Essential vs Optional
- **Essential**: `{ "essential": true }` - Cannot be denied, always granted
- **Optional**: `null` - User can choose to grant or deny

### Type-Specific Security
- **MCP Tools**: Medium risk - tools can be individually controlled
- **API Access**: Medium risk - scope defined by URLs and protocols
- **File System**: High risk - permissions can be individually controlled  
- **Database**: High risk - scope defined by database configuration

## 📊 **Example Flow**

### 1. PAR Request
```json
{
  "authorization_details": "[{
    \"type\": \"mcp-tools\",
    \"server\": \"https://admin.mcp.example.net\",
    \"tools\": {
      \"system.monitor\": { \"essential\": true },
      \"logs.analyze\": null
    },
    \"actions\": [\"run\"]
  }]"
}
```

### 2. Consent Screen
- Shows MCP server URL (fixed)
- Shows "system.monitor" as REQUIRED (checked, disabled)
- Shows "logs.analyze" as optional (user can check/uncheck)

### 3. Form Submission
```json
{
  "_method": "put",
  "tool_system_monitor": "on",  // Essential - always on
  "tool_logs_analyze": "on",    // Optional - user granted
  "clientId": "demo-client-app",
  "duration": "24"
}
```

### 4. Grant Storage
```json
{
  "type": "mcp-tools",
  "server": "https://admin.mcp.example.net",
  "tools": {
    "system.monitor": true,  // Essential - always granted
    "logs.analyze": true     // Optional - user granted
  },
  "actions": ["run"]
}
```

## 🚀 **Benefits of Clean Model**

1. **Type Safety**: Each authorization detail type has its own schema
2. **Clear Semantics**: URLs for API, roots for FS, tools for MCP
3. **No Backward Compatibility**: Clean, modern implementation
4. **CDS Validation**: Proper form field handling prevents validation errors
5. **Extensible**: Easy to add new authorization detail types
6. **User Friendly**: Type-specific UI rendering

## 📋 **Files Updated**

- **`db/grants.cds`**: Clean type-specific authorization detail schema
- **`srv/authorize.tsx`**: Enhanced processing with form preprocessing
- **`example/demo.tsx`**: Updated demo with correct authorization details format

The implementation now provides a clean, type-specific model where:
- **MCP tools** use `tools` map for individual tool permissions
- **API access** uses `urls` and `protocols` for endpoint configuration
- **File system** uses `roots` and `permissions` for path and operation control
- **Database** uses `databases`, `schemas`, `tables` for scope definition

This clean model eliminates the CDS validation issues while providing a more intuitive and type-safe authorization system! 🎉
