# MCP Consent Component

A comprehensive consent management system for Model Context Protocol (MCP) agents that provides end-user scope control for tool access permissions.

## Features

- **Scope-based Authorization**: Control access to MCP tools based on user-granted scopes
- **Session-bound Tokens**: Tokens are valid only for specific chat sessions
- **Interactive Consent UI**: Beautiful React-based consent interface for users
- **Automatic Token Expiration**: Configurable token lifetime with automatic cleanup
- **MCP Protocol Integration**: Seamless integration with MCP tool calls
- **Real-time Consent Management**: Handle consent requests and decisions in real-time

## Architecture

The consent component sits between the agent and MCP aggregator, intercepting tool calls and enforcing scope-based permissions:

```
Agent → Consent Component → MCP Aggregator → MCP Servers
```

## Quick Start

### 1. Install Dependencies

```bash
cd components/consent
npm install
```

### 2. Configure Environment Variables

```bash
# Required
export MCP_SERVER_URL=http://localhost:3000/mcp
export CONSENT_BASE_URL=http://localhost:8080

# Optional
export PORT=8080
export CONSENT_TOKEN_LIFETIME_MINUTES=15
export IDP_AUTH_URL=https://idp.example.com/auth
export IDP_CLIENT_ID=mcp-consent-client
export CORS_ORIGIN=*
```

### 3. Start the Server

```bash
npm run dev
```

The consent server will be available at `http://localhost:8080`

## API Endpoints

### Health Check
- `GET /health` - Returns server health and statistics

### Consent Management
- `GET /consent/request/:requestId` - Get consent request details
- `GET /consent/session/:sessionId` - Get pending requests for a session
- `POST /consent/decision` - Process consent decision
- `GET /consent/callback` - Handle IDP authorization callback

### Consent UI
- `GET /consent/:requestId` - Interactive consent interface

### MCP Proxy
- `ALL /mcp` - Proxy MCP requests with consent enforcement

## Tool Scope Mappings

The component includes predefined scope mappings for common MCP tools:

| Tool | Required Scopes |
|------|----------------|
| `ListFiles`, `ReadFile`, `GetFileInfo` | `tools:read` |
| `CreateFile`, `UpdateFile`, `DeleteFile` | `tools:write` |
| `ExportData`, `GenerateReport` | `data:export` |
| `HttpRequest`, `ApiCall` | `network:access` |
| `ConfigureSystem`, `ManageUsers` | `system:admin` |
| `addTask` | `todo:plan` |
| `completeTask` | `todos:worker` |
| `whoami`, `nextTask` | (no scopes required) |

## Usage Examples

### 1. Agent Tool Call with Consent

When an agent calls a scoped tool without proper permissions:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "CreateFile",
    "arguments": { "path": "/tmp/test.txt", "content": "Hello" }
  },
  "id": 1
}
```

The consent component responds with:

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32001,
    "message": "Consent required",
    "data": {
      "sessionId": "session_123",
      "requiredScopes": ["tools:write"],
      "toolName": "CreateFile",
      "authorizationUrl": "http://localhost:8080/consent/request_456",
      "message": "Tool 'CreateFile' requires additional permissions: tools:write"
    }
  },
  "id": 1
}
```

### 2. User Consent Flow

1. User receives consent request URL
2. Opens consent interface in browser
3. Reviews requested permissions
4. Approves or denies specific scopes
5. Agent receives updated permissions for the session

### 3. Session Management

```typescript
// Check if tool is authorized
const authResult = consentManager.isToolAuthorized(sessionId, 'CreateFile');
if (!authResult.authorized) {
  // Handle consent request
  const authUrl = consentManager.generateAuthorizationUrl(
    sessionId, 
    authResult.missingScopes, 
    idpAuthUrl, 
    idpClientId
  );
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `MCP_SERVER_URL` | `http://localhost:3000/mcp` | Target MCP server URL |
| `CONSENT_BASE_URL` | `http://localhost:8080` | Base URL for consent callbacks |
| `CONSENT_TOKEN_LIFETIME_MINUTES` | `15` | Token expiration time |
| `IDP_AUTH_URL` | `https://idp.example.com/auth` | Identity provider auth URL |
| `IDP_CLIENT_ID` | `mcp-consent-client` | OAuth client ID |
| `CORS_ORIGIN` | `*` | CORS allowed origins |

### Custom Tool Scope Mappings

Add custom tool mappings in the configuration:

```typescript
const config: ConsentConfig = {
  toolScopeMappings: {
    'MyCustomTool': ['custom:scope'],
    'AnotherTool': ['read:data', 'write:data']
  }
};
```

## Integration with Aspire

To integrate with .NET Aspire:

1. Add the consent component to your AppHost
2. Configure it as a container resource
3. Update your agent to use the consent component URL
4. Set up proper networking between components

## Security Considerations

- **Session Isolation**: Each session has independent token scope
- **Token Expiration**: Automatic cleanup of expired tokens
- **Scope Validation**: Strict enforcement of tool-scope mappings
- **HTTPS**: Use HTTPS in production for secure consent flows
- **CORS**: Configure appropriate CORS policies

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

## License

MIT License - see LICENSE file for details.
