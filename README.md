# Agent Grants - OAuth 2.0 Grant Management

A comprehensive grant management system that implements the OAuth 2.0 Grant
Management API specification with Rich Authorization Requests (RAR), enabling
fine-grained permission management for AI agents, MCP servers, and API gateways.

## 🚀 Deployment

- **API Docs**: https://agents-approuter-grant-management.c-127c9ef.stage.kyma.ondemand.com/api-docs
- **Grant Management Dashboard**: https://agents-approuter-grant-management.c-127c9ef.stage.kyma.ondemand.com/grants-management/Grants
- **OAuth Flow Step-by-Step Demo**: https://agents-approuter-grant-management.c-127c9ef.stage.kyma.ondemand.com/demo/index

## ✨ Features

- **OAuth 2.0 Grant Management API**: Full implementation of the Grant Management specification using SAP CAP framework
- **Rich Authorization Requests (RAR)**: Fine-grained authorization_details for tools, MCP servers, APIs, filesystems, and databases
- **Progressive Permission Elevation**: Support for merging/updating grants as agents request additional permissions
- **CDS Service**: Core Data Services implementation with proper entity modeling
- **Web-based UI**: User-friendly interface for managing consent grants with real-time updates
- **RESTful API**: Programmatic access for OAuth clients with OData v4 support
- **Real-time Monitoring**: Live tracking of grant usage and status
- **Security Event Tokens (SET)**: OAuth event types for token lifecycle management
- **MCP Server Integration**: Built-in support for Model Context Protocol authorization

## 📁 Project Structure

| File or Folder               | Purpose                                   |
| ---------------------------- | ----------------------------------------- |
| `app/portal`                 | React Router SPA with grant management UI |
| `app/router`                 | Approuter configuration & API docs        |
| `db/`                        | CDS entities, schema, and initial data    |
| `srv/`                       | CDS service definitions and handlers      |
| `srv/authorization-service/` | OAuth authorization & token endpoints     |
| `srv/grant-management/`      | Grant query and revoke handlers           |
| `srv/demo-service/`          | Step-by-step authorization flow demo      |
| `chart/`                     | Kubernetes deployment configuration       |
| `docs/`                      | Documentation and consent scenarios       |

## 📚 API Documentation

The application exposes two main OData v4 services:

### 1. Authorization Service (`/oauth-server`)

OAuth 2.0 authorization server with PAR (Pushed Authorization Request) support.

#### Key Operations

**Pushed Authorization Request (PAR)**

```http
POST /oauth-server/par
Content-Type: application/x-www-form-urlencoded

response_type=code&
client_id=demo-client-app&
redirect_uri=https://example.com/callback&
scope=mcp:tools&
grant_management_action=create&
authorization_details=[{
  "type": "mcp",
  "server": "filesystem",
  "transport": "stdio",
  "tools": {
    "read_file": {},
    "write_file": {}
  },
  "locations": ["/workspace"]
}]&
requested_actor=urn:agent:analytics-bot
```

**Response:**

```json
{
  "request_uri": "urn:ietf:params:oauth:request_uri:bwc4JK-ESC0w8acc191e",
  "expires_in": 90
}
```

**Authorization Endpoint**

```http
POST /oauth-server/authorize
Content-Type: application/x-www-form-urlencoded

client_id=demo-client-app&
request_uri=urn:ietf:params:oauth:request_uri:bwc4JK-ESC0w8acc191e
```

Returns consent screen or redirects with authorization code.

**Token Endpoint**

```http
POST /oauth-server/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
client_id=demo-client-app&
code=SplxlOBeZQQYbYS6WxSbIA&
code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk&
redirect_uri=https://example.com/callback
```

**Response:**

```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "grant_id": "grant_abc123",
  "scope": "mcp:tools",
  "actor": "urn:agent:analytics-bot",
  "authorization_details": [
    {
      "type": "mcp",
      "server": "filesystem",
      "transport": "stdio",
      "tools": {
        "read_file": {},
        "write_file": {}
      },
      "locations": ["/workspace"]
    }
  ]
}
```

**Server Metadata**

```http
GET /oauth-server/metadata
```

```json
{
  "issuer": "https://example.com/oauth-server",
  "authorization_endpoint": "https://example.com/oauth-server/authorize",
  "token_endpoint": "https://example.com/oauth-server/token",
  "pushed_authorization_request_endpoint": "https://example.com/oauth-server/par",
  "authorization_details_types_supported": [
    "mcp",
    "fs",
    "database",
    "api",
    "grant_management"
  ],
  "grant_types_supported": ["authorization_code"],
  "response_types_supported": ["code"],
  "code_challenge_methods_supported": ["S256", "plain"]
}
```

### 2. Grant Management Service (`/grants-management`)

OAuth 2.0 Grant Management API for querying and revoking grants.

#### Key Endpoints

**List All Grants**

```http
GET /grants-management/Grants
Accept: application/json
```

**Response:**

```json
{
  "@odata.context": "/grants-management/$metadata#Grants",
  "value": [
    {
      "id": "grant_abc123",
      "client_id": "demo-client-app",
      "subject": "user@example.com",
      "actor": "urn:agent:analytics-bot",
      "status": "active",
      "risk_level": "medium",
      "scope": "mcp:tools",
      "createdAt": "2025-01-15T10:30:00Z",
      "modifiedAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

**Query Grant with Authorization Details**

```http
GET /grants-management/Grants('grant_abc123')?$expand=authorization_details
Accept: application/json
```

**Response:**

```json
{
  "id": "grant_abc123",
  "client_id": "demo-client-app",
  "subject": "user@example.com",
  "actor": "urn:agent:analytics-bot",
  "status": "active",
  "risk_level": "medium",
  "scope": "mcp:tools",
  "createdAt": "2025-01-15T10:30:00Z",
  "modifiedAt": "2025-01-15T10:30:00Z",
  "authorization_details": [
    {
      "ID": "detail_123",
      "type": "mcp",
      "server": "filesystem",
      "transport": "stdio",
      "tools": {
        "read_file": {},
        "write_file": {}
      },
      "locations": ["/workspace"],
      "actions": ["read", "write"],
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

**Revoke Grant**

```http
DELETE /grants-management/Grants('grant_abc123')
Accept: application/json
```

**Response:** `204 No Content`

**List Grants with Filtering**

```http
GET /grants-management/Grants?$filter=status eq 'active' and actor eq 'urn:agent:analytics-bot'&$expand=authorization_details
Accept: application/json
```

### Web UI Routes

- **`GET /grants-management/Grants`** - Grant management dashboard (HTML)
- **`GET /grants-management/Grants/{id}`** - Individual grant details
- **`POST /grants-management/Grants/{id}/revoke`** - Revoke consent via UI

## 🔌 Integration Guide

### Grant Authorization Middleware for MCP Servers

This section demonstrates how to implement grant authorization middleware in your MCP server code. The middleware enforces OAuth 2.0 authorization before allowing tool execution, using the **session ID as the grant ID** for simplified grant management.

#### Architecture Overview

```
┌─────────────┐      ┌─────────────────────────┐      ┌──────────────────┐
│   AI Agent  │─────▶│  MCP Server             │─────▶│  Protected Tools │
│             │      │  / Auth Middleware      │      │  & Resources     │
└─────────────┘      └─────────────────────────┘      └──────────────────┘
                                │
                                ▼
                     ┌──────────────────────────┐
                     │ Grant Authorization      │
                     │ Server (This Service)    │
                     └──────────────────────────┘
```

#### Key Concept: Session ID = Grant ID

The middleware uses a **1:1 mapping between session ID and grant ID**, which simplifies grant management:

- Each MCP session gets a unique session ID (provided by the client or generated)
- The session ID is used directly as the `grant_id` in OAuth flows
- All permissions for a session are tracked under one grant
- When the session ends or is revoked, all associated permissions are revoked together

**Benefits:**

- ✅ Simple correlation between sessions and grants
- ✅ Easy permission tracking per session
- ✅ Automatic cleanup when sessions expire
- ✅ Progressive permission elevation within the same session

#### Complete MCP Authorization Middleware

Based on the implementation in `srv/demo-service`, here's how to build grant authorization middleware:

**1. MCP Tool Call Handler with Authorization Middleware**

Track sessions using session ID as grant ID:

```typescript
import { Router, Request, Response } from "express";

const router = Router();
const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || "http://localhost:4004";

// Helper to get or generate session ID
function getSessionId(headers: any): string {
  return headers["mcp-session-id"] || crypto.randomUUID();
}

/**
 * MCP Tool Call Handler with Authorization Middleware
 * POST /mcp
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    // Use session ID directly as grant ID (1:1 mapping)
    const sessionId = getSessionId(req.headers);
    const grant_id = sessionId; // Session ID = Grant ID

    const agentId = req.headers["x-agent-id"] as string | undefined;
    const userId = req.headers["x-user-id"] as string | undefined;

    console.log(`[MCP] Request for session/grant: ${grant_id}`);

    // Parse MCP request
    const mcpRequest = req.body;

    if (!mcpRequest?.method) {
      return res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid request" },
        id: null,
      });
    }

    // Check if tool call requires authorization
    if (mcpRequest.method === "tools/call") {
      const toolName = mcpRequest.params?.name;

      // Check if grant exists and has permission for this tool
      const hasPermission = await checkToolPermission(grant_id, toolName);

      if (!hasPermission) {
        // Request consent for this tool
        const authUrl = await triggerAuthorizationFlow(
          grant_id, // Use session ID as grant ID
          toolName,
          agentId,
          userId,
          req
        );

        return res.json({
          jsonrpc: "2.0",
          error: {
            code: -32001, // Custom error code for consent required
            message: "Authorization required",
            data: {
              toolName,
              grant_id, // Return grant ID (same as session ID)
              authorizationUrl: authUrl,
              instructions: "Visit the authorization URL to grant consent.",
            },
          },
          id: mcpRequest.id,
        });
      }
    }

    // Permission granted - execute the tool
    const result = await executeMcpTool(mcpRequest);

    // Return session/grant ID in headers
    res.setHeader("mcp-session-id", sessionId);
    res.setHeader("x-grant-id", grant_id);
    res.json(result);
  } catch (error) {
    console.error("[MCP] Error:", error);
    res.status(500).json({
      jsonrpc: "2.0",
      error: { code: -32603, message: "Internal server error" },
      id: null,
    });
  }
});
```

**2. Request Tool Consent via OAuth**

When a tool requires authorization, trigger the OAuth flow using session ID as grant ID:

```typescript
/**
 * Request consent for MCP tool using session ID as grant ID
 */
async function requestToolConsent(
  grant_id: string, // Session ID used directly as grant ID
  toolName: string,
  agentId?: string,
  userId?: string,
  req?: Request
): Promise<string | null> {
  try {
    console.log(
      `[Auth] Requesting consent for tool: ${toolName} (grant: ${grant_id})`
    );

    // Create authorization detail for the requested tool
    const authDetail = {
      type: "mcp",
      server: "mcp",
      transport: "http",
      tools: {
        [toolName]: {}, // Request consent for this specific tool only
      },
      locations: ["/workspace"],
    };

    // Build callback URL
    const protocol = req?.protocol || "http";
    const host = req?.get("host") || "localhost:8080";
    const redirectUri = `${protocol}://${host}/mcp/callback`;

    // Build PAR request - use session ID as grant_id
    const parRequest = {
      response_type: "code",
      client_id: "mcp-server",
      redirect_uri: redirectUri,
      grant_management_action: "merge", // Always merge into session grant
      grant_id: grant_id, // Session ID = Grant ID
      authorization_details: JSON.stringify([authDetail]),
      requested_actor: agentId || `urn:mcp:session:${grant_id}`,
      subject: userId || "anonymous",
      scope: "mcp:tools",
    };

    console.log("[Auth] PAR request with session as grant_id:", {
      grant_id,
      tool: toolName,
    });

    // Call PAR endpoint
    const parResponse = await fetch(`${AUTH_SERVER_URL}/oauth-server/par`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(parRequest as any).toString(),
    });

    if (!parResponse.ok) {
      console.error("[Auth] PAR failed");
      return null;
    }

    const { request_uri } = await parResponse.json();

    // Build authorization URL
    const authUrl =
      `${AUTH_SERVER_URL}/oauth-server/authorize?` +
      `client_id=mcp-server&request_uri=${request_uri}`;

    return authUrl;
  } catch (error) {
    console.error("[Auth] Error requesting consent:", error);
    return null;
  }
}
```

**3. Check Tool Permission Against Grant**

Verify if the current session's grant has permission for a tool:

```typescript
/**
 * Check if grant (session) has permission for a tool
 */
async function checkToolPermission(
  grant_id: string, // Session ID
  toolName: string
): Promise<boolean> {
  try {
    // Query grant details from Grant Management API
    const response = await fetch(
      `${AUTH_SERVER_URL}/grants-management/Grants('${grant_id}')?$expand=authorization_details`,
      {
        headers: { Accept: "application/json" },
      }
    );

    if (!response.ok) {
      // Grant doesn't exist yet - first request for this session
      console.log(`[Auth] No grant found for session ${grant_id}`);
      return false;
    }

    const grant = await response.json();

    // Check if grant is active
    if (grant.status !== "active") {
      console.log(`[Auth] Grant ${grant_id} is ${grant.status}`);
      return false;
    }

    // Check authorization_details for the tool
    const hasToolPermission = grant.authorization_details?.some(
      (detail: any) =>
        detail.type === "mcp" && detail.tools?.[toolName] !== undefined
    );

    console.log(
      `[Auth] Tool ${toolName} in grant ${grant_id}: ${hasToolPermission}`
    );
    return hasToolPermission || false;
  } catch (error) {
    console.error("[Auth] Error checking permission:", error);
    return false;
  }
}
```

**4. OAuth Callback Handler**

Handle the OAuth callback and exchange code for access token:

```typescript
/**
 * OAuth callback endpoint
 * GET /mcp/callback?code=xxx&state=grant_id
 */
router.get("/callback", async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    const grant_id = state as string; // Grant ID (= Session ID)

    console.log(`[Callback] Exchanging code for grant: ${grant_id}`);

    // Exchange authorization code for access token
    const tokenResponse = await fetch(`${AUTH_SERVER_URL}/oauth-server/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: "mcp-server",
        code: code as string,
        redirect_uri: `${req.protocol}://${req.get("host")}/mcp/callback`,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    console.log("[Callback] Token response:", {
      grant_id: tokenData.grant_id,
      actor: tokenData.actor,
      scope: tokenData.scope,
      authorized_tools: tokenData.authorization_details?.flatMap((d: any) =>
        Object.keys(d.tools || {})
      ),
    });

    // Verify grant_id matches session (should always match with session=grant pattern)
    if (tokenData.grant_id !== grant_id) {
      console.warn(
        `[Callback] Grant ID mismatch! Expected ${grant_id}, got ${tokenData.grant_id}`
      );
    }

    // Success page
    res.send(`
      <html>
        <head><title>Authorization Successful</title></head>
        <body style="font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto;">
          <h2>✅ Authorization Successful</h2>
          <p><strong>Grant ID:</strong> <code>${tokenData.grant_id}</code></p>
          <p><strong>Session ID:</strong> <code>${grant_id}</code></p>
          <p><strong>Authorized Tools:</strong> ${tokenData.authorization_details
            ?.flatMap((d: any) => Object.keys(d.tools || {}))
            .join(", ")}</p>
          <p>You can close this window and continue working.</p>
          <script>
            // Notify parent window if opened in popup
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'authorization_complete', 
                grant_id: '${tokenData.grant_id}' 
              }, '*');
              setTimeout(() => window.close(), 2000);
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("[Callback] Error:", error);
    res.status(500).send("Authorization failed");
  }
});

export { router as mcpRouter };
```

**5. CAP CDS Service Implementation**

Example from `srv/demo-service/demo-service.tsx` showing server-side authorization flow:

```typescript
import cds from "@sap/cds";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";

export default class DemoService extends cds.ApplicationService {
  /**
   * Step 1: Initiate authorization request with PAR
   */
  public async request() {
    try {
      const authorizationService = await cds.connect.to(AuthorizationService);

      // Build authorization request
      const request = {
        response_type: "code",
        client_id: "demo-client-app",
        redirect_uri: new URL(
          "/demo/callback",
          cds.context?.http?.req.headers.referer
        ).href,
        grant_management_action: "create",
        authorization_details: JSON.stringify([
          {
            type: "mcp",
            server: "filesystem",
            transport: "stdio",
            tools: {
              read_file: {},
              list_directory: {},
            },
            locations: ["/workspace"],
          },
        ]),
        requested_actor: "urn:agent:analytics-bot-v1",
        scope: "mcp:tools",
        subject: cds.context?.user?.id,
        subject_token_type: "urn:ietf:params:oauth:token-type:basic",
      };

      // Call PAR endpoint
      const response = await authorizationService.par(request);

      if (!response?.request_uri) {
        throw new Error("PAR request failed");
      }

      // Return authorization URL to user
      return {
        request_uri: response.request_uri,
        expires_in: response.expires_in,
        authorization_url: `/oauth-server/authorize?client_id=${request.client_id}&request_uri=${response.request_uri}`,
      };
    } catch (error) {
      console.error("Authorization request failed:", error);
      throw error;
    }
  }

  /**
   * Step 2: Handle callback and exchange code for token
   */
  public async callback(code: string, redirect_uri: string) {
    const authorizationService = await cds.connect.to(AuthorizationService);

    const tokenResponse = await authorizationService.token({
      grant_type: "authorization_code",
      client_id: "demo-client-app",
      code: code,
      redirect_uri: redirect_uri,
    });

    const { access_token, grant_id, authorization_details, actor, scope } =
      tokenResponse;

    // Store access token for future requests
    // Now you can use this token to make authorized MCP calls

    return {
      access_token,
      grant_id,
      authorization_details,
      actor,
      scope,
    };
  }

  /**
   * Step 3: Elevate permissions (merge additional permissions into existing grant)
   */
  public async elevate(grant_id: string) {
    const authorizationService = await cds.connect.to(AuthorizationService);

    const request = {
      response_type: "code",
      client_id: "demo-client-app",
      redirect_uri: new URL(
        "/demo/callback",
        cds.context?.http?.req.headers.referer
      ).href,
      grant_management_action: "merge", // Merge into existing grant
      grant_id: grant_id, // Reference existing grant
      authorization_details: JSON.stringify([
        {
          type: "mcp",
          server: "filesystem",
          transport: "stdio",
          tools: {
            write_file: {}, // Request additional permission
            delete_file: {},
          },
          locations: ["/workspace"],
        },
      ]),
      requested_actor: "urn:agent:analytics-bot-v1",
      scope: "mcp:tools",
      subject: cds.context?.user?.id,
    };

    const response = await authorizationService.par(request);

    return {
      request_uri: response.request_uri,
      authorization_url: `/oauth-server/authorize?client_id=${request.client_id}&request_uri=${response.request_uri}`,
    };
  }
}
```

#### Authorization Detail Types

The system supports multiple authorization detail types:

**MCP Server Access:**

```json
{
  "type": "mcp",
  "server": "filesystem",
  "transport": "stdio",
  "tools": {
    "read_file": {},
    "write_file": {}
  },
  "locations": ["/workspace"]
}
```

**API Access:**

```json
{
  "type": "api",
  "urls": [
    "https://api.example.com/v1/users",
    "https://api.example.com/v1/data"
  ],
  "protocols": ["https"],
  "actions": ["read", "write"]
}
```

**Filesystem Access:**

```json
{
  "type": "fs",
  "roots": ["/home/user/workspace"],
  "permissions": {
    "read": { "essential": true },
    "write": { "essential": true },
    "list": { "essential": true }
  }
}
```

**Database Access:**

```json
{
  "type": "database",
  "server": "postgresql://localhost:5432",
  "databases": ["app_db"],
  "schemas": ["public"],
  "tables": ["users", "orders"],
  "actions": ["select", "insert", "update"]
}
```

#### Progressive Permission Flow

The demo service demonstrates a three-step progressive authorization:

1. **Initial Request** (`create`) - Request basic permissions
2. **Permission Elevation** (`merge`) - Request additional permissions without revoking existing ones
3. **Grant Management** - User can view and revoke permissions at any time

See the live demo at: https://agents-approuter-grant-management.c-127c9ef.stage.kyma.ondemand.com/demo/index

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- SQLite (for local development) or PostgreSQL/HANA (for production)
- (Optional) Kubernetes cluster for deployment

### Local Development

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start the CDS development server:**

   ```bash
   npm run dev
   ```

3. **Open your browser to `http://localhost:4004`**

The CDS server will automatically:

- Deploy the database schema with grant management entities
- Load initial data for authorization detail types
- Start the Authorization Service (`/oauth-server`)
- Start the Grant Management Service (`/grants-management`)
- Serve the React-based grant management UI
- Launch the interactive demo (`/demo`)

### Available Services

Once running, you can access:

- **Authorization Server**: http://localhost:4004/oauth-server
- **Grant Management API**: http://localhost:4004/grants-management
- **Grant UI Dashboard**: http://localhost:4004/grants-management/Grants
- **Interactive Demo**: http://localhost:4004/demo/index
- **API Documentation**: http://localhost:4004/api-docs

### Testing the Flow

**Quick Start - Using curl:**

```bash
# 1. Create a PAR (Pushed Authorization Request)
curl -X POST http://localhost:4004/oauth-server/par \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'response_type=code' \
  -d 'client_id=demo-client-app' \
  -d 'redirect_uri=http://localhost:3000/callback' \
  -d 'scope=mcp:tools' \
  -d 'grant_management_action=create' \
  -d 'authorization_details=[{"type":"mcp","server":"filesystem","transport":"stdio","tools":{"read_file":{}}}]' \
  -d 'requested_actor=urn:agent:test-bot'

# Response: {"request_uri":"urn:ietf:params:oauth:request_uri:xxx","expires_in":90}

# 2. Visit authorization endpoint (in browser)
# http://localhost:4004/oauth-server/authorize?client_id=demo-client-app&request_uri=urn:ietf:params:oauth:request_uri:xxx

# 3. After consent, exchange code for token
curl -X POST http://localhost:4004/oauth-server/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'grant_type=authorization_code' \
  -d 'client_id=demo-client-app' \
  -d 'code=YOUR_AUTH_CODE' \
  -d 'redirect_uri=http://localhost:3000/callback'

# 4. Query grant details
curl http://localhost:4004/grants-management/Grants('grant_xxx')?$expand=authorization_details \
  -H "Accept: application/json"

# 5. Revoke grant
curl -X DELETE http://localhost:4004/grants-management/Grants('grant_xxx')
```

### Production Deployment

Deploy to SAP BTP Kyma environment:

```bash
# Set your namespace
export NAMESPACE=grant-management

# Deploy using Helm
helm upgrade --install agent-grants ./chart \
  --namespace $NAMESPACE \
  --create-namespace \
  --values ./chart/values.yaml
```

Or use the containerization workflow:

```bash
# Build and push container image
npm run build
docker build -t your-registry/agent-grants:latest .
docker push your-registry/agent-grants:latest

# Deploy to Kubernetes
kubectl apply -f chart/templates/ -n $NAMESPACE
```

### Hybrid Development

Run the CDS server locally while connecting to remote services in your Kyma environment:

```bash
# Change default namespace to your namespace
kubectl config set-context --current --namespace=grant-management

# Bind to remote auth service
cds bind auth --to agent-grants-srv-auth --on k8s

# Start local server with hybrid profile
cds watch --profile hybrid

# View resolved bindings
npx cds env requires.auth --profile hybrid --resolve-bindings
```

## 🛠️ Implementation Details

### Data Model

The system uses the following core entities:

- **`Grants`** - Main grant records with `grant_id`, status, subject, actor, and timestamps
- **`Consents`** - User consent records linked to grants
- **`AuthorizationRequests`** - OAuth authorization requests with PAR support
- **`AuthorizationDetail`** - Fine-grained permission details (RAR)
- **`AuthorizationDetailType`** - Template definitions for authorization detail types

### Grant Lifecycle

1. **Creation** - Grant created during authorization flow with `grant_management_action=create`
2. **Active** - Grant is active and tokens can be issued
3. **Merge/Update** - Additional permissions merged with `grant_management_action=merge`
4. **Revoked** - Grant revoked via DELETE endpoint or user action

### Security Features

- **PKCE Support** - Code challenge/verifier for public clients
- **PAR (Pushed Authorization Request)** - Secure authorization request transmission
- **Grant IDs are public identifiers** - Non-secret, suitable for client-side storage
- **Scoped Access** - `grant_management_query` and `grant_management_revoke` scopes
- **Audit Trail** - Full timestamp tracking (`createdAt`, `modifiedAt`, `revoked_at`)
- **Actor Tracking** - Track both subject (user) and actor (agent/bot)

## 📖 Learn More

- **Specifications:**
  - [OAuth 2.0 Grant Management](https://tools.ietf.org/html/draft-ietf-oauth-grant-management)
  - [Rich Authorization Requests](https://datatracker.ietf.org/doc/html/rfc9396)
  - [Pushed Authorization Requests](https://datatracker.ietf.org/doc/html/rfc9126)
  - [Security Event Tokens](https://datatracker.ietf.org/doc/html/rfc8417)
  - [OAuth Event Types](https://datatracker.ietf.org/doc/html/draft-ietf-secevent-oauth-event-types)
- **Frameworks:**
  - [SAP CAP Documentation](https://cap.cloud.sap/docs/)
- [React Router Documentation](https://reactrouter.com/)
  - [Model Context Protocol](https://modelcontextprotocol.io/)

- **Project Documentation:**
  - [Grant Management API Spec](GRANT_MANAGEMENT_API.md)
  - [Consent Scenarios](docs/CONSENT_SCENARIOS.md)
  - [Development Guide](DEV-GUIDE.md)

## 🤝 Contributing

See the [Development Guide](DEV-GUIDE.md) for information on:

- Code structure and conventions
- Testing procedures
- Deployment workflows
- Debugging tips
