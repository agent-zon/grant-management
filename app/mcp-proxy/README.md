# MCP Consent Proxy Microservice

Standalone Node.js/Express microservice that enforces tool-level consent for Model Context Protocol (MCP) agents.

## Overview

The MCP Consent Proxy sits between MCP agents and MCP servers, intercepting tool calls and enforcing OAuth 2.0-based consent requirements. It integrates with the Grant Management and Authorization services to provide tool-level authorization.

## Architecture

```
MCP Agent → MCP Consent Proxy (this service) → MCP Server(s)
                ↓
        Authorization API (HTTP)
                ↓
        Grant Management API (HTTP)
```

## Features

- **MCP Protocol Support**: Full JSON-RPC 2.0 implementation
- **Tool-level Authorization**: Enforce consent before tool execution
- **Session Management**: Track agent sessions and grant associations
- **Tool Policy Groups**: Group related tools for batch consent
- **OAuth 2.0 Integration**: PAR, authorization flow, token exchange
- **Grant Queries**: Validate permissions via Grant Management API
- **Health Monitoring**: Health check and statistics endpoints

## Development

### Prerequisites

- Node.js 20+
- npm or yarn

### Install Dependencies

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

The service will start on port 8080 (or `PORT` env var).

### Build

```bash
npm run build
```

Built files will be in `dist/`.

### Run Production Build

```bash
npm start
```

## Configuration

Environment variables:

| Variable               | Default                                   | Description                   |
| ---------------------- | ----------------------------------------- | ----------------------------- |
| `PORT`                 | `8080`                                    | Server port                   |
| `MCP_SERVER_URL`       | `http://localhost:3000/mcp`               | Downstream MCP server         |
| `AUTH_SERVER_URL`      | `http://localhost:4004/oauth-server`      | Authorization server          |
| `GRANT_MANAGEMENT_URL` | `http://localhost:4004/grants-management` | Grant Management API          |
| `MCP_CLIENT_ID`        | `mcp-agent-client`                        | OAuth client ID               |
| `BASE_URL`             | `http://localhost:8080`                   | Public base URL for callbacks |

## API Endpoints

### `POST /proxy`

Main MCP JSON-RPC proxy endpoint. Accepts MCP requests and enforces consent.

**Headers:**

- `mcp-session-id` (optional): Session identifier
- `mcp-agent-id` (optional): Agent identifier
- `mcp-user-id` (optional): User identifier

### `GET /callback`

OAuth callback handler after user grants consent.

**Query params:**

- `code`: Authorization code
- `state`: OAuth state
- `session_id`: MCP session ID

### `GET /session?sessionId=xxx`

Get session information and authorization status.

### `GET /health`

Health check and service statistics.

### `POST /revoke?sessionId=xxx`

Revoke session authorization.

## Docker

### Build Image

```bash
docker build -t mcp-proxy .
```

### Run Container

```bash
docker run -p 8080:8080 \
  -e MCP_SERVER_URL=http://mcp-server:3000/mcp \
  -e AUTH_SERVER_URL=http://auth-server:4004/oauth-server \
  -e GRANT_MANAGEMENT_URL=http://grant-mgmt:4004/grants-management \
  mcp-proxy
```

### Docker Compose

```bash
docker-compose up
```

## Kubernetes Deployment

The service is deployed as part of the Helm chart. See `chart/values.yaml`:

```yaml
mcp-proxy:
  image:
    repository: grant-management/mcp-proxy
  resources:
    limits:
      memory: 256M
    requests:
      cpu: 100m
      memory: 128M
  env:
    - name: AUTH_SERVER_URL
      value: "http://srv:4004/oauth-server"
    - name: GRANT_MANAGEMENT_URL
      value: "http://srv:4004/grants-management"
```

Deploy with:

```bash
helm upgrade --install agent-grants ./chart \
  --namespace grant-management \
  --values chart/values.yaml
```

## Usage Example

```bash
# MCP tool call
curl -X POST http://localhost:8080/proxy \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: my-session-123" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "ReadFile",
      "arguments": {"path": "/data/file.txt"}
    },
    "id": 1
  }'

# If consent required, response includes authorization URL:
# {
#   "jsonrpc": "2.0",
#   "error": {
#     "code": -32001,
#     "message": "Consent required",
#     "data": {
#       "authorizationUrl": "http://localhost:4004/oauth-server/authorize?...",
#       "sessionId": "my-session-123"
#     }
#   },
#   "id": 1
# }

# User visits authorizationUrl, grants consent, callback attaches grant

# Subsequent calls succeed:
curl -X POST http://localhost:8080/proxy \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: my-session-123" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"ReadFile","arguments":{"path":"/data/file.txt"}},"id":1}'
```

## Tool Policy Groups

Predefined groups for common tool patterns:

- `file-read`: ReadFile, ListFiles, GetFileInfo (low risk)
- `file-write`: CreateFile, UpdateFile, WriteFile (medium risk)
- `file-delete`: DeleteFile, RemoveFile (high risk)
- `database-read`, `database-write`
- `api-access`, `system-admin`
- `data-export`, `code-execution`

When a tool is requested, all tools in its group are suggested for consent.

## Project Structure

```
app/mcp-proxy/
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── Dockerfile             # Container image definition
├── docker-compose.yml     # Local testing setup
├── src/
│   ├── server.ts          # Express app entry point
│   ├── config.ts          # Environment configuration
│   ├── types.ts           # TypeScript type definitions
│   ├── routes/            # HTTP route handlers
│   │   ├── proxy.ts       # MCP JSON-RPC proxy
│   │   ├── callback.ts    # OAuth callback
│   │   ├── session.ts     # Session info
│   │   ├── health.ts      # Health check
│   │   └── revoke.ts      # Revoke authorization
│   ├── services/          # Business logic
│   │   ├── session-manager.ts           # Session tracking
│   │   ├── mcp-proxy-handler.ts         # MCP protocol
│   │   ├── tool-policy-integration.ts   # Tool policies
│   │   ├── authorization-client.ts      # Auth API client
│   │   └── grant-management-client.ts   # Grant API client
│   └── middleware/        # Express middleware
│       ├── error-handler.ts
│       └── session-extractor.ts
└── README.md
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
# Start local services
docker-compose up -d

# Run integration tests
npm run test:integration
```

### Manual Testing

```bash
# Health check
curl http://localhost:8080/health

# Session info
curl http://localhost:8080/session?sessionId=test-session

# MCP tool call (requires MCP server running)
curl -X POST http://localhost:8080/proxy \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"1.0","clientInfo":{"name":"test","version":"1.0"}},"id":1}'
```

## Monitoring

Health endpoint returns:

```json
{
  "status": "healthy",
  "service": "MCP Consent Proxy",
  "version": "1.0.0",
  "config": {
    "mcpServerUrl": "...",
    "authServerUrl": "...",
    "grantManagementUrl": "..."
  },
  "sessions": {
    "total": 5,
    "withGrants": 3,
    "withoutGrants": 2
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Troubleshooting

### Tool call returns "Consent required" after authorization

- Check session ID is consistent between tool call and callback
- Verify grant status via Grant Management API
- Check tool name matches exactly (case-sensitive)

### Authorization URL not returned

- Verify Authorization Service is accessible
- Check PAR endpoint responds correctly
- Ensure `MCP_CLIENT_ID` is configured

### Session not found

- Session may have expired (24-hour limit)
- Session ID must match between requests
- Check session ID is sent in headers

## License

ISC
