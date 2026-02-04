# Agent Agentity Proxy

Standalone MCP (Model Context Protocol) proxy service for agent agentity and grant management integration. This proxy intercepts MCP requests, injects grant management tools, filters available tools based on authorization details, and handles grant-related operations.

## Features

- **MCP Request Proxying**: Forwards MCP JSON-RPC requests to upstream MCP servers
- **Grant Tool Injection**: Automatically injects `grant:query` and `grant:request` tools into tool lists
- **Authorization-Based Filtering**: Filters available tools based on active grant authorization details
- **Grant Management Integration**: Handles grant-related tool calls locally without proxying to upstream
- **JWT Authentication**: Validates bearer tokens and extracts grant context
- **Standalone Deployment**: No dependency on CAP framework, deployable independently

## Prerequisites

- Node.js 20 or higher
- Access to grant management API
- OAuth/JWT token for authentication
- (For deployment) Access to SAP Kyma cluster

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file (or set environment variables):

```bash
# Server configuration
PORT=8080
NODE_ENV=production

# Grant management API
GRANT_MANAGEMENT_HOST=https://grant-management-api.example.com
GRANTS_PATH_PREFIX=/grants-management
GRANT_MANAGEMENT_BASE=https://grant-management-api.example.com/grants-management
OAUTH_SERVER_BASE=https://oauth.example.com
APP_ROUTER_BASE=https://grant-management-approuter.example.com

# Logging
LOG_LEVEL=info
```

### Centralized URL Config

- **`GRANT_MANAGEMENT_HOST`**: Base host for grant services (e.g., https://grant-management-srv-…)
- **`GRANTS_PATH_PREFIX`**: Path prefix for Grants API (default `/grants-management`)
- **`GRANT_MANAGEMENT_BASE`**: Optional override for full Grants API base; if unset, composed from host + prefix
- **`OAUTH_SERVER_BASE`**: Base host for OAuth server (defaults to `GRANT_MANAGEMENT_HOST` if unset)
- **`APP_ROUTER_BASE`**: Approuter base used for the user authorization dialog URL

## Running Locally

### Development Mode (with auto-reload)
```bash
npm run dev
```
### Build & Push Image

Image naming is driven by the chart defaults in agent-indentity-proxy/chart/values.yaml:
- Registry: scai-dev.common.repositories.cloud.sap
- Repository: agent-identity-proxy/service
- Tag: latest

Option A — PowerShell script (recommended on Windows):
```powershell
# Build locally without pushing (uses chart image values by default)
  "status": "ok"
}
```

### `POST /proxy`
MCP proxy endpoint. Forwards MCP JSON-RPC requests to upstream servers with grant management integration.

**Headers**:
- `Authorization: Bearer <jwt-token>` - Required JWT token with grant context
- `Content-Type: application/json`

**Request Body**: MCP JSON-RPC request
```json
{

Option B — Docker CLI:
```powershell
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}

### Deploy with Helm

Prerequisites:
- `kubectl config current-context` points to your target cluster
- Namespace exists (or will be created)
- An image pull secret named `docker-registry` with your registry credentials

1) Vendor chart dependencies (required)
```powershell
```


2) Create namespace and image pull secret
```powershell
**Response**: MCP JSON-RPC response with injected grant tools

## Deployment to SAP Kyma

### Build Docker Image
```bash
docker build -t agent-identity-proxy:latest .
```

### Push to Registry
```bash

3) Install/upgrade the chart
```powershell
docker tag agent-identity-proxy:latest <registry>/agent-identity-proxy:latest
docker push <registry>/agent-identity-proxy:latest
```

To override environment variables, create a simple values file (recommended):
```yaml

### Deploy with Helm
```powershell
# Install/upgrade using the proxy chart (self-contained)
helm upgrade --install agent-identity-proxy .\agent-indentity-proxy\chart \
  --set global.domain=c-127c9ef.stage.kyma.ondemand.com \
  --set global.image.tag=latest \
  --set proxy.env[0].name=NODE_ENV --set proxy.env[0].value=production \
  --set proxy.env[1].name=GRANT_MANAGEMENT_HOST --set proxy.env[1].value=https://grant-management-srv-tomer-dev.c-127c9ef.stage.kyma.ondemand.com \
  --set proxy.env[2].name=GRANTS_PATH_PREFIX --set proxy.env[2].value=/grants-management \
  --set proxy.env[3].name=OAUTH_SERVER_BASE --set proxy.env[3].value=https://grant-management-srv-tomer-dev.c-127c9ef.stage.kyma.ondemand.com \
  --set proxy.env[4].name=APP_ROUTER_BASE --set proxy.env[4].value=https://grant-management-approuter-tomer-dev.c-127c9ef.stage.kyma.ondemand.com

Then deploy with the override:
```powershell
```

## Architecture


4) Verify
```powershell
```
┌─────────────┐
│ MCP Client  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  Agent Agentity Proxy           │
│  ┌───────────────────────────┐  │
│  │ Auth Middleware           │  │
│  │ (JWT Validation)          │  │
│  └────────────┬──────────────┘  │
│               ▼                 │
│  ┌───────────────────────────┐  │
│  │ Proxy Middleware          │  │
│  │ - Tool Injection          │  │
│  │ - Tool Filtering          │  │
│  │ - Grant Handler           │  │
│  └────────────┬──────────────┘  │
└───────────────┼─────────────────┘
                │
       ┌────────┴────────┐
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│ Upstream    │   │ Grant Mgmt  │
│ MCP Server  │   │ API         │
└─────────────┘   └─────────────┘
```

## Integration with Grant Management

The proxy integrates with the grant management system by:

1. **Extracting grant ID from JWT token**: Reads `grantId` claim from bearer token
2. **Fetching grant details**: Queries grant management API for authorization details
3. **Filtering tools**: Filters available tools based on grant's `authorizedTools` list
4. **Handling grant operations**: Processes `grant:query` and `grant:request` tool calls locally

## Development

### Project Structure
```
agent-identity-proxy/
├── src/
│   ├── server.ts              # Main entry point
│   ├── middleware/
│   │   ├── auth-middleware.ts # JWT authentication
│   │   └── proxy-middleware.ts # MCP proxy logic
│   ├── handlers/
│   │   └── grant-handler.ts   # Grant tool handlers
│   ├── transformers/
│   │   └── mcp-response-transformer.ts # Response transformation
│   ├── client/
│   │   └── grant-client.ts    # Grant API client
│   ├── utils/
│   │   ├── filter-tools.ts    # Tool filtering logic
│   │   └── token-utils.ts     # JWT utilities
│   └── constants/
│       └── grant-definitions.ts # Grant tool definitions
├── chart/                      # Helm chart for Kyma
├── types/                      # TypeScript type definitions
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

## Testing

```bash
npm test
```

## License

ISC
