# Field Naming Conventions

This document defines the naming conventions for field names (attributes) used in ODRL policy constraints and evaluation contexts.

## YAML File Path Structure

The field naming conventions are derived from the MCP server YAML file structure:

```
srv/grant-policies/
  └── {agentId}/                          # Agent unique identifier
      ├── agent_manifest.yaml             # Agent metadata and MCP references
      ├── policies.json                   # ODRL policies
      └── mcps/                            # MCP server definitions
          ├── {mcp-name}.yaml             # MCP server card (serverInfo.name)
          ├── {mcp-name}.yml
          └── ...
```

**Example:**
```
srv/grant-policies/f4a45b73-ce34-4e9f-b340-591b72a51084/
  ├── agent_manifest.yaml
  ├── policies.json
  └── mcps/
      ├── ariba-mcp.yaml        → serverInfo.name: "ariba-mcp"
      ├── commerce-mcp.yml      → serverInfo.name: "commerce-mcp"  
      └── concur-mcp.yml        → serverInfo.name: "concur-mcp"
```

### Path-to-Attribute Mapping

| YAML Path | Field in YAML | Becomes Attribute | Example Value |
|-----------|---------------|-------------------|---------------|
| `mcps/{filename}.yaml` | `serverInfo.name` | `sap:mcpName` | `"ariba-mcp"` |
| `mcps/{filename}.yaml` | `serverInfo.title` | `sap:mcpTitle` | `"SAP Ariba Procurement MCP Server"` |
| `mcps/{filename}.yaml` | `version` | `sap:version` | `"1.0"` |
| `mcps/{filename}.yaml` | `serverInfo.version` | `sap:serverVersion` | `"1.0.0"` |
| `mcps/{filename}.yaml` | `tools[].name` | `sap:toolName` | `"ariba-mcp:po.search"` |
| `mcps/{filename}.yaml` | `tools[].title` | `sap:toolTitle` | `"Search Purchase Orders"` |
| `mcps/{filename}.yaml` | `_meta/sap/*` | `sap:{key}` | `sap:category: "procurement"` |
| `agent_manifest.yaml` | `metadata.name` | `sap:agentName` | `"procurement-po-helper-agent"` |
| `agent_manifest.yaml` | `metadata.namespace` | `sap:agentNamespace` | `"procurement"` |

**Important:** Tool names are always fully qualified as `{mcpName}:{toolName}` format.

## Namespace Prefixes

All attribute names MUST use a namespace prefix to avoid conflicts and clearly indicate the attribute source.

| Prefix | Description | Example |
|--------|-------------|---------|
| `sap:` | SAP-specific attributes for business logic, MCP metadata, and custom constraints | `sap:toolName`, `sap:role`, `sap:version` |
| `jwt:` | Standard JWT claims (iat, exp, nbf, iss, aud) | `jwt:iat`, `jwt:exp`, `jwt:iss` |
| `sap:jwt/` | Custom JWT claims from authentication token | `sap:jwt/department`, `sap:jwt/region` |

## Standard Attribute Categories

### 1. Identity Attributes (Subjects)

Used in `assignee` field of ODRL policies. Format: `{type}:{value}`

```yaml
# User identity
assignee: "user:alice@example.com"
assignee: "user:f4a45b73-ce34-4e9f-b340-591b72a51084"

# Tenant/organization
assignee: "tenant:acme-corp"
assignee: "tenant:8e7f6d5c-4b3a-2910-8765-fedcba098765"

# Role/scope
assignee: "scope:admin"
assignee: "scope:developer"

# Wildcard
assignee: "*"
```

### 2. Tool Attributes

Attributes related to MCP tools being executed. Tool names are **fully qualified** with MCP server prefix.

| Attribute Name | Type | Description | YAML Source | Example |
|----------------|------|-------------|-------------|---------|
| `sap:toolName` | string | Fully qualified: `{mcpName}:{toolName}` | `mcps/{mcp}.yaml` → `tools[].name` | `"ariba-mcp:po.search"`, `"commerce-mcp:fraud.detect"` |
| `sap:toolTitle` | string | Human-readable tool title | `mcps/{mcp}.yaml` → `tools[].title` | `"Search Purchase Orders"` |
| `sap:toolDescription` | string | Tool description | `mcps/{mcp}.yaml` → `tools[].description` | `"Search for purchase orders in Ariba"` |
| `sap:category` | string | Tool/Server category | `mcps/{mcp}.yaml` → `_meta/sap/category` | `"procurement"`, `"commerce"`, `"travel-expense"` |
| `sap:riskLevel` | string | Risk classification | `mcps/{mcp}.yaml` → `tools[]._meta/sap/riskLevel` | `"low"`, `"medium"`, `"high"`, `"sensitive"` |
| `sap:accessLevel` | string | Access level requirement | `mcps/{mcp}.yaml` → `tools[]._meta/sap/accessLevel` | `"authenticated-user"`, `"admin"` |

**YAML Source Example** (`srv/grant-policies/.../mcps/commerce-mcp.yml`):
```yaml
serverInfo:
  name: commerce-mcp
  title: SAP Commerce Platform MCP Server
_meta:
  sap/category: commerce
tools:
  - name: fraud.detect
    title: Detect Fraud
    description: Analyze orders for potential fraud
    _meta:
      sap/riskLevel: high
      sap/accessLevel: admin
```

**Becomes Attributes:**
```typescript
{
  "sap:mcpName": "commerce-mcp",
  "sap:toolName": "commerce-mcp:fraud.detect",  // Fully qualified!
  "sap:toolTitle": "Detect Fraud",
  "sap:category": "commerce",
  "sap:riskLevel": "high",
  "sap:accessLevel": "admin"
}
```

**Example from policies.json:**
```json
{
  "comment": "Enable fraud.detect tool",
  "constraint": [
    {
      "leftOperand": "sap:toolName",
      "operator": "isPartOf",
      "rightOperand": ["commerce-mcp:fraud.detect"]
    }
  ],
  "metadata": {
    "yamlItemType": "mcp-tool",
    "yamlItemName": "commerce-mcp:fraud.detect"
  }
}
```

### 3. MCP Server Attributes

Attributes describing MCP server characteristics extracted from server card YAML files.

| Attribute Name | Type | Description | YAML Source | Example |
|----------------|------|-------------|-------------|---------|
| `sap:mcpName` | string | MCP server technical name | `mcps/{filename}.yaml` → `serverInfo.name` | `"ariba-mcp"`, `"commerce-mcp"`, `"concur-mcp"` |
| `sap:mcpTitle` | string | MCP server display title | `mcps/{filename}.yaml` → `serverInfo.title` | `"SAP Ariba Procurement MCP Server"` |
| `sap:version` | string | Card version (top-level) | `mcps/{filename}.yaml` → `version` | `"1.0"` |
| `sap:serverVersion` | string | Server implementation version | `mcps/{filename}.yaml` → `serverInfo.version` | `"1.0.0"` |
| `sap:category` | string | Server category | `mcps/{filename}.yaml` → `_meta/sap/category` | `"procurement"`, `"commerce"`, `"travel-expense"` |
| `sap:description` | string | Server description | `mcps/{filename}.yaml` → `_meta/sap/description` | `"Native MCP server for..."` |
| `sap:protocolVersion` | string | MCP protocol version | `mcps/{filename}.yaml` → `protocolVersions[]` | `"2025-11-25"` |
| `sap:endpoint` | string | Transport endpoint | `mcps/{filename}.yaml` → `transport.endpoint` | `"/mcp/ariba"` |

**YAML Source Example** (`srv/grant-policies/.../mcps/ariba-mcp.yaml`):
```yaml
$schema: https://static.modelcontextprotocol.io/schemas/2025-12-11/server-card.schema.json
version: '1.0'                              # sap:version
protocolVersions:
  - '2025-11-25'                            # sap:protocolVersion
serverInfo:
  name: ariba-mcp                           # sap:mcpName
  title: SAP Ariba Procurement MCP Server   # sap:mcpTitle
  version: 1.0.0                            # sap:serverVersion
  description: MCP server for SAP Ariba...
  websiteUrl: https://www.ariba.com
transport:
  type: streamable-http
  endpoint: /mcp/ariba                      # sap:endpoint
_meta:
  sap/category: procurement                 # sap:category
  sap/description: Native MCP server...     # sap:description
```

**Becomes Attributes:**
```typescript
{
  "sap:mcpName": "ariba-mcp",
  "sap:mcpTitle": "SAP Ariba Procurement MCP Server",
  "sap:version": "1.0",
  "sap:serverVersion": "1.0.0",
  "sap:category": "procurement",
  "sap:protocolVersion": "2025-11-25",
  "sap:endpoint": "/mcp/ariba"
}
```

**Example from policies.json:**
```json
{
  "comment": "Require consent for concur-mcp MCP server",
  "constraint": [
    {
      "leftOperand": "sap:mcpTitle",
      "operator": "isPartOf",
      "rightOperand": ["SAP Concur Travel & Expense MCP Server"]
    }
  ],
  "duty": [
    {
      "action": "sap:obtainConsent"
    }
  ],
  "metadata": {
    "yamlItemType": "mcp-server",
    "yamlItemName": "concur-mcp",
    "source": "yaml-selection"
  }
}
```

### 4. Business Context Attributes

Attributes representing business rules and context.

| Attribute Name | Type | Description | Example |
|----------------|------|-------------|---------|
| `sap:role` | string | Business role in workflow | `"SUCCESSOR"`, `"APPROVER"`, `"VIEWER"` |
| `sap:department` | string | User's department | `"finance"`, `"hr"`, `"procurement"` |
| `sap:region` | string | Geographic region | `"EMEA"`, `"APAC"`, `"AMERICAS"` |
| `sap:costCenter` | string | Cost center code | `"CC-1000"`, `"CC-2500"` |
| `sap:isMain` | boolean | Primary entity flag | `"true"`, `"false"` |
| `sap:isMandatory` | boolean | Mandatory field indicator | `"true"`, `"false"` |

**Example from policies.json:**
```json
{
  "comment": "Enable fraud.detect tool",
  "constraint": [
    {
      "leftOperand": "sap:role",
      "operator": "isPartOf",
      "rightOperand": ["SUCCESSOR"]
    },
    {
      "leftOperand": "sap:toolName",
      "operator": "isPartOf",
      "rightOperand": ["fraud.detect"]
    }
  ]
}
```

**Example from context-builder.ts:**
```typescript
// Context attributes from evaluation request
if (context.role) attributes['sap:role'] = context.role;
if (context.version) attributes['sap:version'] = context.version;
if (context.mcpTitle) attributes['sap:mcpTitle'] = context.mcpTitle;
if (context.isMain !== undefined) attributes['sap:isMain'] = String(context.isMain);
if (context.isMandatory !== undefined) attributes['sap:isMandatory'] = String(context.isMandatory);
```

### 5. Authentication Attributes

Attributes from JWT tokens and authentication context.s at server or tool level.

| Attribute Name | Type | Description | YAML Source | Example |
|----------------|------|-------------|-------------|---------|
| `sap:{metaKey}` | any | Server-level metadata | `mcps/{mcp}.yaml` → `_meta/sap/{key}` | `sap:category`, `sap:description` |
| `sap:{metaKey}` | any | Tool-level metadata | `mcps/{mcp}.yaml` → `tools[]._meta/sap/{key}` | `sap:riskLevel`, `sap:accessLevel` |

**YAML Source - Server Level** (`srv/grant-policies/.../mcps/concur-mcp.yml`):
```yaml
serverInfo:
  name: concur-mcp
_meta:
  sap/category: travel-expense              # becomes sap:category
  sap/description: Native MCP server...     # becomes sap:description
  sap/dataClassification: confidential      # becomes sap:dataClassification
```

**YAML Source - Tool Level** (`srv/grant-policies/.../mcps/concur-mcp.yml`):
```yaml
tools:
  - name: trips.read
    title: Read Trips
    _meta:
      sap/accessLevel: authenticated-user    # becomes sap:accessLevel
      sap/riskLevel: sensitive               # becomes sap:riskLevel
      createdBy: sap:concur
```

**Context Builder Logic** ([context-builder.ts](context-builder.ts)):
```typescript
// Tool metadata attributes (dynamically loaded from MCP server card)
if (toolDefinition?.metadata) {
  for (const [key, value] of Object.entries(toolDefinition.metadata)) {
    // Add as sap:* attributes for ODRL constraint matching
    attributes[`sap:${key}`] = value;
  }
}
```

**Mapping Rules:**
1. `_meta/sap/{key}` → `sap:{key}` (strip `sap/` prefix from YAML)
2. Other `_meta/{key}` → keep as-is or add `sap:` prefix
3. Tool-level `_meta` overrides server-level for same key }
  }
}
```

### 6. Dynamic MCP Metadata Attributes

Attributes dynamically extracted from MCP server card `_meta` section.

| Attribute Name | Type | Description | Example |
|----------------|------|-------------|---------|
| `sap:{metaKey}` | any | Any field from tool/server metadata | `sap:category`, `sap:description` |

**Example from context-builder.ts:**
```typescript
// Tool metadata attributes (dynamically loaded from MCP server card)
if (toolDefinition?.metadata) {
  for (const [key, value] of Object.entries(toolDefinition.metadata)) {
    // Add as sap:* attributes for ODRL constraint matching
    attributes[`sap:${key}`] = value;
  }
}
```

**Example from YAML metadata:**
```yaml
_meta:
  sap/category: procurement        # becomes sap:category
  sap/description: Server desc     # becomes sap:description
  sap/dataClassification: confidential  # becomes sap:dataClassification
```

## Naming Rules

### 1. Attribute Name Format

```
{namespace}:{camelCaseFieldName}
```

**Rules:**
- **MUST** use namespace prefix (`sap:`, `jwt:`, `sap:jwt/`)
- Use **camelCase** for field names (first letter lowercase)
- Use descriptive, self-documenting names
- Avoid abbreviations unless widely understood

**Good:**
- `sap:toolName`
- `sap:mcpTitle`
- `sap:costCenter`
- `sap:isMain`

**Bad:**
- `toolName` (missing namespace)
- `sap:tool_name` (snake_case)
- `sap:ToolName` (PascalCase)
- `sap:tn` (unclear abbreviation)

### 2. Boolean Attributes

Prefix boolean attributes with `is`, `has`, or `can`:

```typescript
sap:isMain: "true"
sap:isMandatory: "false"
sap:hasConsent: "true"
sap:canApprove: "false"
```

**Note:** Boolean values MUST be strings (`"true"`, `"false"`) in ODRL constraints.

### 3. Collection Attributes

For array/list values, use with YAML Sources

### Agent Structure
```
srv/grant-policies/f4a45b73-ce34-4e9f-b340-591b72a51084/
  ├── agent_manifest.yaml
  ├── policies.json
  └── mcps/
      ├── ariba-mcp.yaml       # Procurement tools
      ├── commerce-mcp.yml     # Commerce operations
      └── concur-mcp.yml       # Travel & expense
```

### YAML Source Files

**agent_manifest.yaml:**
```yaml
apiVersion: solution.sap/v1
kind: Solution
metadata:
  name: procurement-po-helper-agent
  namespace: procurement
  version: 1.0.0
requires:
  - name: ariba-mcp
    kind: mcp
    ref:
      file: ./mcps/ariba-mcp.yaml
  - name: commerce-mcp
    kind: mcp
    ref:
      file: ./mcps/commerce-mcp.yml
```

**mcps/ariba-mcp.yaml:**
```yaml
version: '1.0'
serverInfo:
  name: ariba-mcp
  title: SAP Ariba Procurement MCP Server
  version: 1.0.0
_meta:
  sap/category: procurement
tools:
  - name: po.search
    title: Search Purchase Orders
    _meta:
      sap/accessLevel: authenticated-user
```

**mcps/commerce-mcp.yml:**
```yaml
version: '1.0'
serverInfo:
  name: commerce-mcp
  title: SAP Commerce Platform MCP Server
_meta:
  sap/category: commerce
tools:
  - name: fraud.detect
    title: Detect Fraud
    _meta:
      sap/riskLevel: high
``` with YAML Mapping

### Input: EvaluationContext

```typescript
const context: EvaluationContext = {
  // Identity
  agent_id: "f4a45b73-ce34-4e9f-b340-591b72a51084",
  user_id: "alice@example.com",
  tenant_id: "acme-corp",
  scopes: ["scope:procurement-manager"],
  
  // JWT payload
  jwt_payload: {
    iat: 1737475200,
    exp: 1737561600,
    iss: "https://auth.example.com",
    sub: "alice@example.com",
    department: "procurement",
    region: "EMEA"
  },
  
  // Business context (matches YAML structure)
  role: "APPROVER",
  version: "1.0",
  mcpTitle: "SAP Ariba Procurement MCP Server",
  isMain: true,
  isMandatory: false,
  
  // Custom attributes
  attributes: {
    costCenter: "CC-1000",
    approvalLimit: 50000
  }
};

const toolRequest: ToolRequest = {
  toolName: "ariba-mcp:po.search"  // Fully qualified from YAML
};
```

### YAML Source for Tool
```
srv/grant-policies/f4a45b73-ce34-4e9f-b340-591b72a51084/mcps/ariba-mcp.yaml
```

```yaml
serverInfo:
  name: ariba-mcp                         # → mcpName
  title: SAP Ariba Procurement MCP Server # → mcpTitle
version: '1.0'                            # → version
_meta:
  sap/category: procurement               # → category
tools:
  - name: po.search                       # → becomes ariba-mcp:po.search
    title: Search Purchase Orders         # → toolTitle
```

### Output: Evaluation Attributes

```typescript
// Generated by ContextBuilder.buildAttributes()
{
  // Tool attributes (from request + YAML)
  "sap:toolName": "ariba-mcp:po.search",        // Fully qualified
  "sap:mcpName": "ariba-mcp",                   // From serverInfo.name
  "sap:toolTitle": "Search Purchase Orders",    // From tools[].title
  "sap:category": "procurement",                // From _meta/sap/category
  
  // Business context
  "sap:role": "APPROVER",
  "sap:version": "1.0",
  "sap:mcpTitle": "SAP Ariba Procurement MCP Server",
  "sap:isMain": "true",
  "sap:isMandatory": "false",
  
  // JWT claims
  "jwt:iat": 1737475200,
  "jwt:exp": 1737561600,
  "jwt:iss": "https://auth.example.com",
  "sap:jwt/sub": "alice@example.com",
  "sap:jwt/department": "procurement",
  "sap:jwt/region": "EMEA",
  
  // Custom attributes
  "sap:costCenter": "CC-1000",
  "sap:approvalLimit": 50000
}
```

### Attribute-to-YAML Traceability

| Attribute | Value | YAML Source |
|-----------|-------|-------------|
| `sap:toolName` | `"ariba-mcp:po.search"` | `mcps/ariba-mcp.yaml` → `serverInfo.name` + `tools[].name` |
| `sap:mcpName` | `"ariba-mcp"` | `mcps/ariba-mcp.yaml` → `serverInfo.name` |
| `sap:mcpTitle` | `"SAP Ariba..."` | `mcps/ariba-mcp.yaml` → `serverInfo.title` |
| `sap:version` | `"1.0"` | `mcps/ariba-mcp.yaml` → `version` |
| `sap:category` | `"procurement"` | `mcps/ariba-mcp.yaml` → `_meta/sap/category` |
| `sap:role` | `"APPROVER"` | Runtime context (not from YAML) |
| `sap:jwt/department` | `"procurement"` | JWT token custom claim |       "operator": "isPartOf",
          "rightOperand": ["commerce-mcp:fraud.detect"]
        }
      ], (not snake_case or kebab-case)
3. **Fully qualify tool names** - Always use `{mcpName}:{toolName}` format (e.g., `ariba-mcp:po.search`)
4. **Match YAML paths** - Field names should reflect the YAML structure they come from
5. **Be descriptive** - `sap:purchaseOrderNumber` not `sap:poNum`
6. **Document new attributes** - Update this file when adding new standard attributes
7. **Boolean as strings** - ODRL requires `"true"`/`"false"` strings, not boolean primitives
8. **Consistent operators** - Use `isPartOf` for array membership, `eq` for equality
9. **Version attributes** - Use semantic versioning format: `"1.0.0"`, `"2.1.0"`
10. **Traceability** - Each attribute should be traceable to a YAML file or runtime context

### YAML Metadata Convention

When adding metadata to MCP server YAML files, follow this pattern:

```yaml
# Server-level metadata
_meta:
  sap/category: {value}           # becomes sap:category
  sap/description: {value}        # becomes sap:description
  sap/{customKey}: {value}        # becomes sap:{customKey}

# Tool-level metadata (overrides server-level)
tools:
  - name: tool-name
    _meta:
      sap/riskLevel: {value}      # becomes sap:riskLevel
      sap/accessLevel: {value}    # becomes sap:accessLevel
      sap/{customKey}: {value}    # becomes sap:{customKey}
```

**Naming Rule:** Strip `sap/` prefix from YAML, becomes `sap:` prefix in attribute.
      "target": "sap:target:McpServerAsset",
      "action": "sap:executeTools",
      "constraint": [
        {
          "leftOperand": "sap:mcpTitle",
          "operator": "isPartOf",
          "rightOperand": ["SAP Ariba Procurement MCP Server"]
        },
        {
          "leftOperand": "sap:role",
          "operator": "isPartOf",
          "rightOperand": ["APPROVER", "SUCCESSOR"]
        },
        {
          "leftOperand": "sap:version",
          "operator": "isPartOf",
          "rightOperand": ["1.0"]
        }
      ]
    },
    {
      "uid": "sap:consent-high-risk",
      "assignee": "*",
      "target": "sap:target:McpServerAsset",
      "action": "sap:executeTools",
      "constraint": [
        {
          "leftOperand": "sap:riskLevel",
          "operator": "eq",
          "rightOperand": "high"
        },
        {
          "leftOperand": "sap:jwt/department",
          "operator": "isPartOf",
          "rightOperand": ["finance", "compliance"]
        }
      ],
      "duty": [
        {
          "action": "sap:obtainConsent"
        }
      ]
    }
  ]
}
```

## EvaluationContext Example

```typescript
const context: EvaluationContext = {
  // Identity
  agent_id: "f4a45b73-ce34-4e9f-b340-591b72a51084",
  user_id: "alice@example.com",
  tenant_id: "acme-corp",
  scopes: ["scope:procurement-manager"],
  
  // JWT payload
  jwt_payload: {
    iat: 1737475200,
    exp: 1737561600,
    iss: "https://auth.example.com",
    sub: "alice@example.com",
    department: "procurement",
    region: "EMEA"
  },
  
  // Business context
  role: "APPROVER",
  version: "1.0",
  mcpTitle: "SAP Ariba Procurement MCP Server",
  isMain: true,
  isMandatory: false,
  
  // Custom attributes
  attributes: {
    costCenter: "CC-1000",
    approvalLimit: 50000
  }
};

// Results in attributes:
{
  "sap:toolName": "po.search",
  "sap:role": "APPROVER",
  "sap:version": "1.0",
  "sap:mcpTitle": "SAP Ariba Procurement MCP Server",
  "sap:isMain": "true",
  "sap:isMandatory": "false",
  "jwt:iat": 1737475200,
  "jwt:exp": 1737561600,
  "jwt:iss": "https://auth.example.com",
  "sap:jwt/sub": "alice@example.com",
  "sap:jwt/department": "procurement",
  "sap:jwt/region": "EMEA",
  "sap:costCenter": "CC-1000",
  "sap:approvalLimit": 50000
}
```

## Adding New Attributes

### 1. For Standard Attributes

Add to [context-builder.ts](context-builder.ts) in the `buildAttributes` method:

```typescript
if (context.yourNewField) {
  attributes['sap:yourNewField'] = context.yourNewField;
}
```

### 2. For Dynamic Metadata

Add to MCP server YAML `_meta` section:

```yaml
_meta:
  sap/yourNewField: "value"
```

This will automatically become `sap:yourNewField` attribute.

### 3. For JWT Claims

Standard claims are automatically prefixed with `jwt:`.
Custom claims are automatically prefixed with `sap:jwt/`.

## Best Practices

1. **Always use namespaces** - Never create attributes without `sap:` or `jwt:` prefix
2. **Use camelCase** - Consistent with TypeScript/JavaScript conventions
3. **Be descriptive** - `sap:purchaseOrderNumber` not `sap:poNum`
4. **Document new attributes** - Update this file when adding new standard attributes
5. **Boolean as strings** - ODRL requires `"true"`/`"false"` strings, not boolean primitives
6. **Consistent operators** - Use `isPartOf` for array membership, `eq` for equality
7. **Version attributes** - Use semantic versioning format: `"1.0.0"`, `"2.1.0"`

## References

- [context-builder.ts](context-builder.ts) - Attribute building logic
- [types.ts](types.ts) - TypeScript type definitions
- [example-odrl-policy.yaml](example-odrl-policy.yaml) - Complete policy examples
- ODRL Specification: https://www.w3.org/TR/odrl-model/
