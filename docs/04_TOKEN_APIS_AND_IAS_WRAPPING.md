# Token APIs and IAS Service Wrapping

**Created**: 2025-11-30
**Last Updated**: 2025-11-30
**Category**: [ARCHITECTURE] [OAUTH] [TOKENS] [IAS]
**Timeline**: 04 of 05 - Token Management Documentation

## Overview

This document covers the **token endpoint implementation** which wraps SAP Identity Authentication Service (IAS) for OAuth 2.0 token issuance.

### Key Concepts:

1. **Token endpoint** - `POST /oauth-server/token` - OAuth 2.0 token exchange
2. **IAS wrapping** - Delegates token issuance to IAS via `@sap/xssec` IdentityService
3. **Grant types** - `authorization_code`, `refresh_token`, `token-exchange`, `user_token`
4. **JWT tokens** - Returns JWT tokens from IAS with `sid` claim containing `grant_id`
5. **Authorization details** - Fetches Rich Authorization Request details from database
6. **Mock mode** - Falls back to mock tokens when IAS not configured

### Architecture:

- **Handler**: `srv/authorization-service/handler.token.tsx`
- **Integration**: Uses `@sap/xssec` IdentityService for mTLS-authenticated IAS calls
- **Token format**: JWT from IAS (not simple ULID strings)
- **Grant ID**: Extracted from JWT's `sid` claim using `jwt-decode`
- **Extensions**: Returns `grant_id` and `authorization_details` per OAuth extensions

---

## Token Endpoint Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  OAuth Client                                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  POST /oauth-server/token                              │ │
│  │  {                                                     │ │
│  │    "grant_type": "authorization_code",                │ │
│  │    "code": "01HXG...",                                │ │
│  │    "code_verifier": "...",                            │ │
│  │    "redirect_uri": "https://...",                     │ │
│  │    "client_id": "mcp-client"                          │ │
│  │  }                                                     │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Authorization Service                                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  handler.token.tsx                                     │ │
│  │                                                        │ │
│  │  1. Validate grant_type                               │ │
│  │  2. Verify authorization code                         │ │
│  │  3. Fetch grant details                               │ │
│  │  4. Fetch authorization_details                       │ │
│  │  5. Generate access token                             │ │
│  │  6. Return token response with grant_id               │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Token Response                                              │
│  {                                                           │
│    "access_token": "at_01HXG...:grant_01HXG...",           │
│    "token_type": "Bearer",                                  │
│    "expires_in": 3600,                                      │
│    "scope": "filesystem_read filesystem_write",             │
│    "grant_id": "grant_01HXG...",                           │
│    "actor": "urn:agent:finance-v1",                        │
│    "authorization_details": [...]                           │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
```

---

## Token Endpoint Implementation

### Actual Implementation with IAS Integration

**The token endpoint wraps SAP Identity Authentication Service (IAS)** for token issuance

```typescript
// srv/authorization-service/handler.token.tsx
import cds from "@sap/cds";
import { IdentityService } from "@sap/xssec";
import { jwtDecode } from "jwt-decode";
import { ulid } from "ulid";

export default async function token(
  this: AuthorizationService,
  req: cds.Request<{
    grant_type: string;
    code?: string;
    refresh_token?: string;
    subject_token?: string;
  }>
) {
  const { grant_type, code, refresh_token, subject_token } = req.data;

  // Get tokens from IAS or mock
  const { access_token, ...tokens } = await getTokens();

  if (!access_token) {
    return tokens;
  }

  // Extract grant_id from JWT's sid claim
  const { sid: grant_id } = jwtDecode<{ sid: string }>(access_token);

  // Fetch authorization details from DB
  const authorization_details = await cds.run(
    cds.ql.SELECT.from(AuthorizationDetails).where({
      consent_grant_id: grant_id,
    })
  );

  console.log("[token] response", {
    access_token: access_token?.slice(0, 5),
    grant_id,
    authorization_details,
    ...tokens,
  });

  // Return OAuth token response with extensions
  return {
    access_token, // JWT from IAS
    ...tokens, // refresh_token, etc.
    token_type: "Bearer",
    expires_in: 3600,
    grant_id, // Grant Management extension (from JWT sid)
    authorization_details, // Rich Authorization Requests
  };
}
```

**Key Implementation Details**:

1. **IAS Integration** - Uses `@sap/xssec` IdentityService for token operations
2. **JWT Tokens** - Returns JWT tokens from IAS, not simple ULID strings
3. **Grant ID Extraction** - Extracts `grant_id` from JWT's `sid` claim
4. **Multiple Grant Types** - Supports `authorization_code`, `refresh_token`, `token-exchange`, and custom `user_token`
5. **Mock Mode** - Falls back to mock tokens when IAS credentials not configured

---

### Token Response Structure

#### Standard OAuth 2.0 Fields

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "rt_01HXG..."
}
```

**Note**: `access_token` is a JWT from IAS, not a simple ULID string

#### Extensions

**Grant Management** (OAuth 2.0 Grant Management):

```json
{
  "grant_id": "gnt_01HXG456..."
}
```

The `grant_id` is extracted from the JWT's `sid` (session ID) claim.

**Rich Authorization Requests** (RFC 9396):

```json
{
  "authorization_details": [
    {
      "type_code": "fs",
      "type": "fs",
      "locations": ["/workspace"],
      "permissions": { "read": true, "write": true }
    }
  ]
}
```

**Note**: Fetched from database by `consent_grant_id`, not embedded in JWT

---

### Access Token Format

**Production: JWT from IAS**

The token endpoint returns JWT tokens from SAP Identity Authentication Service:

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyQGV4YW1wbGUuY29tIiwic2lkIjoiZ250XzAxSFhHMTIzIiwiZXhwIjoxNzMyOTgyNDAwfQ...
│                                      │                                                                      │
│                                      └─ Payload contains sid (session ID = grant_id)                        │
└─ JWT Header                                                                                                  └─ Signature
```

**JWT Payload Structure**:

```json
{
  "sub": "user@example.com",
  "sid": "gnt_01HXG123...", // ← Grant ID stored here
  "exp": 1732982400,
  "iss": "https://ias.example.com",
  "aud": "your-client-id"
}
```

**Design Decisions**:

1. **IAS JWT** - Production-ready tokens with cryptographic signatures
2. **Grant ID in `sid` claim** - Session ID maps to grant ID for introspection
3. **Standard JWT claims** - `sub`, `exp`, `iss`, `aud` for interoperability
4. **Automatic expiration** - IAS handles token lifecycle

**Mock Mode (no IAS configured)**:

```typescript
// Fallback for local development
if (!cds.requires.auth.credentials) {
  return {
    access_token: req.user?.authInfo?.token?.jwt || `mk_${ulid()}`,
    expires_in: 3600,
    refresh_token: ulid(),
    grant_id: request.grant_id,
  };
}
```

---

## Pushed Authorization Request (PAR) Handler

**Purpose**: Creates authorization request with grant linkage before user consent

**Handler**: `srv/authorization-service/handler.requests.tsx`

```typescript
export default async function push(
  this: AuthorizationService,
  req: cds.Request<{
    grant_id?: string;
    subject?: string;
    authorization_details?: string;
    client_id?: string;
    scope?: string;
  }>
) {
  // Generate or use existing grant ID
  const grantId = req.data.grant_id || `gnt_${ulid()}`;
  console.log("🔑 Grant ID for request:", grantId);

  // Create authorization request linked to grant
  const { ID } = await this.insert({
    grant_id: grantId,
    ...req.data,
    access: req.data.authorization_details
      ? parseAuthorizationDetails(req.data.authorization_details)
      : [],
  }).into(AuthorizationRequests);

  console.log("Request created", ID);

  return {
    request_uri: `urn:ietf:params:oauth:request_uri:${ID}`,
    expires_in: 90,
  };
}
```

**Flow Integration**:

1. **Client** → PAR endpoint: Create authorization request with `authorization_details`
2. **PAR** → Response: Returns `request_uri` containing authorization request ID
3. **Client** → `/authorize?request_uri=...`: User views consent page
4. **User** → Grants consent
5. **Client** → `/token`: Exchanges code for token (authorization request ID = code)

---

## Grant Types Supported

### 1. Authorization Code (Implemented)

**Use case**: User authorizes application to access resources

**Implementation**: Exchanges authorization code for IAS JWT token

```typescript
// From handler.token.tsx
if (grant_type === "authorization_code") {
  const request = await cds.read(AuthorizationRequests, code);

  if (request.subject_token) {
    // Exchange subject token for IAS access token
    const tokenUrl = await authService.getTokenUrl(
      "urn:ietf:params:oauth:grant-type:token-exchange"
    );

    const { access_token, ...tokens } = await fetch(tokenUrl.href, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        subject_token: request.subject_token,
        subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
        client_id: authService.credentials.clientid,
      }),
      agent: new Agent({
        key: authService.credentials.key,
        cert: authService.credentials.certificate,
      }),
    }).then((e) => e.json());

    const { sid } = jwtDecode<{ sid: string }>(access_token);

    return {
      access_token,
      ...tokens,
      grant_id: request.grant_id || sid,
    };
  }

  // Fallback: return current user session token
  return {
    access_token: req.user?.authInfo?.token?.jwt || `mk_${ulid()}`,
    expires_in: 3600,
    grant_id: request.grant_id,
  };
}
```

**Request**:

```http
POST /oauth-server/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=01HXG...
&client_id=mcp-client
```

---

### 2. Refresh Token (Implemented)

**Use case**: Obtain new access token without user interaction

**Implementation**: Exchanges refresh token with IAS

```typescript
// From handler.token.tsx
if (refresh_token != null) {
  const tokenUrl = await authService.getTokenUrl("refresh_token");

  const { access_token, ...tokens } = await fetch(tokenUrl.href, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
    }),
    agent: new Agent({
      key: authService.credentials.key,
      cert: authService.credentials.certificate,
    }),
  }).then((e) => e.json());

  const { sid: grant_id } = jwtDecode<{ sid: string }>(access_token);

  return {
    access_token,
    ...tokens,
    grant_id,
  };
}
```

**Request**:

```http
POST /oauth-server/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=rt_01HXG...
```

---

### 3. Token Exchange (Implemented)

**Use case**: Exchange external token (e.g., user session JWT) for application token

**Implementation**: Uses RFC 8693 token exchange with IAS

```typescript
// From handler.token.tsx
if (grant_type === "urn:ietf:params:oauth:grant-type:token-exchange") {
  const tokenUrl = await authService.getTokenUrl(
    "urn:ietf:params:oauth:grant-type:token-exchange"
  );

  const { access_token, ...tokens } = await fetch(tokenUrl.href, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: subject_token || req.user?.authInfo?.token.jwt || "",
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      client_id: authService.credentials.clientid,
    }),
    agent: new Agent({
      key: authService.credentials.key,
      cert: authService.credentials.certificate,
    }),
  }).then((e) => e.json());

  const { sid: grant_id } = jwtDecode<{ sid: string }>(access_token) || {};

  return {
    access_token,
    ...tokens,
    grant_id,
  };
}
```

**Request**:

```http
POST /oauth-server/token
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
&subject_token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
&subject_token_type=urn:ietf:params:oauth:token-type:jwt
&client_id=mcp-client
```

---

### 4. User Token (Custom - Implemented)

**Use case**: Exchange current user session for application token with JWT Bearer

**Implementation**: Uses IAS JWT Bearer token flow

```typescript
// From handler.token.tsx
if (grant_type === "user_token") {
  console.log("user_token request", req.data);

  // Use JWT bearer token exchange with IAS
  if (req.user?.authInfo?.token.jwt && cds.requires.auth.credentials) {
    const authService = new IdentityService(cds.requires.auth.credentials);

    const { access_token, ...tokens } = await authService.fetchJwtBearerToken(
      req.user.authInfo?.getAppToken()
    );

    const { sid: grant_id } =
      (access_token && jwtDecode<{ sid: string }>(access_token)) || {};

    return {
      access_token,
      ...tokens,
      grant_id,
    };
  }
}
```

**Request**:

```http
POST /oauth-server/token
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer <current-session-jwt>

grant_type=user_token
```

**Note**: This is a custom grant type specific to this implementation for simplifying user session token exchanges.

---

## IAS (Identity Authentication Service) Wrapping

### What is IAS?

**SAP Identity Authentication Service (IAS)** is SAP's cloud-based identity provider (IdP) supporting:

- SAML 2.0
- OpenID Connect (OIDC)
- OAuth 2.0
- User management
- Multi-factor authentication (MFA)

### Why Wrap IAS?

Our Authorization Service acts as a **facade/proxy** between MCP clients and IAS:

```
┌─────────────┐       ┌──────────────────┐       ┌─────────┐
│  MCP Client │ ←────→ │ Auth Service     │ ←────→ │   IAS   │
│             │  (1)   │ (Token Wrapper)  │  (2)   │  (IdP)  │
└─────────────┘       └──────────────────┘       └─────────┘
     OAuth 2.0              OAuth 2.0              OIDC/SAML
  + RAR + Grant Mgmt     Translation Layer      Standard IdP
```

**Benefits**:

1. **Protocol translation** - IAS → OAuth 2.0 with extensions
2. **Grant management** - IAS has no grant management API
3. **Authorization details** - IAS has no RAR support
4. **Logging/monitoring** - Centralized observability
5. **Custom flows** - On-behalf-of, grant merging
6. **Testing** - Mock IAS responses for development

---

### IAS Integration Architecture

**Implementation uses `@sap/xssec` library**:

```typescript
// srv/authorization-service/handler.token.tsx
import { IdentityService } from "@sap/xssec";

// Initialize IAS client
const authService = new IdentityService(cds.requires.auth.credentials);

// Get token endpoint URL for specific grant type
const tokenUrl = await authService.getTokenUrl("refresh_token");

// Make authenticated request to IAS
const response = await fetch(tokenUrl.href, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token,
  }),
  agent: new Agent({
    key: authService.credentials.key, // mTLS certificate
    cert: authService.credentials.certificate,
  }),
});
```

**IAS Credentials Configuration**:

```json
// cds.requires.auth.credentials structure
{
  "clientid": "your-client-id",
  "clientsecret": "your-client-secret",
  "url": "https://ias.example.com",
  "key": "-----BEGIN PRIVATE KEY-----\n...",
  "certificate": "-----BEGIN CERTIFICATE-----\n..."
}
```

---

### Mock Mode (No IAS Configured)

**Fallback behavior for local development**:

```typescript
// srv/authorization-service/handler.token.tsx
async function getTokens() {
  // No IAS service - return mock data
  if (!cds.requires.auth.credentials) {
    const request = code && (await cds.read(AuthorizationRequests, code));

    if (!request) {
      console.log("missing request for code", grant_type, code);
      throw Error("invalid_grant");
    }

    return {
      expires_in: 3600,
      refresh_token: ulid(),
      access_token: req.user?.authInfo?.token?.jwt || `mk_${ulid()}`,
      token_type: "urn:ietf:params:oauth:token-type:jwt",
      grant_id: request.grant_id,
    };
  }

  // ... IAS integration code
}
```

**Mock Token Format**:

- Uses existing user session JWT if available: `req.user?.authInfo?.token?.jwt`
- Falls back to mock token: `mk_${ulid()}` (mock prefix + ULID)
- Returns grant_id directly from authorization request

**Usage**: Enables local development without IAS infrastructure

---

## Destination Service Integration

### What is Destination Service?

**SAP Destination Service** manages connectivity configurations for service-to-service communication:

- API endpoints (URLs)
- Authentication (OAuth, Basic Auth, SAML)
- Token exchange
- Certificate management

### Token Exchange with Destination Service

**Use case**: Application needs to call external service with user context

```mermaid
sequenceDiagram
    Client->>AuthServer: POST /token (code)
    AuthServer-->>Client: access_token
    Client->>Application: API call with access_token
    Application->>Destination: GET /destination/{name}
    Destination->>IAS: Exchange app token for service token
    IAS-->>Destination: Service token
    Destination-->>Application: Service token + endpoint
    Application->>ExternalService: API call with service token
```

---

### Implementation

```typescript
// srv/mcp-service/utils/destination.tsx
import {
  getDestinationFromServiceBinding,
  HttpDestination,
} from "@sap-cloud-sdk/connectivity";
import { SecurityContext } from "@sap/xssec";

/**
 * Get destination with token exchange
 *
 * @param destinationName - Destination name from BTP cockpit
 * @param auth - User security context for token exchange
 */
export async function getDestination(
  destinationName: string,
  auth?: SecurityContext
): Promise<HttpDestination> {
  try {
    // Get user's JWT token from security context
    const jwt = auth?.getAppToken();

    // Fetch destination with automatic token exchange
    const dest = await getDestinationFromServiceBinding({
      destinationName,
      jwt: jwt, // ← Token exchange happens here
    });

    console.log(`[Destination] Resolved: ${dest.url}`);

    return dest;
  } catch (error) {
    console.error(
      `[Destination] Failed to resolve '${destinationName}':`,
      error
    );

    // Fallback to default (for local development)
    return {
      url: process.env.DEFAULT_SERVER || "https://default.example.com",
    };
  }
}
```

**Usage in service**:

```typescript
// srv/mcp-service/mcp-service.tsx
export default class McpService extends cds.ApplicationService {
  async callExternalService(req) {
    // Get user security context
    const auth = req.user?.authInfo;

    // Fetch destination with token exchange
    const destination = await getDestination("my-external-api", auth);

    // Call external service with exchanged token
    const response = await fetch(`${destination.url}/api/endpoint`, {
      headers: {
        Authorization: `Bearer ${destination.authTokens[0].value}`,
      },
    });

    return response.json();
  }
}
```

---

### Destination Configuration (BTP Cockpit)

```yaml
# Destination: my-external-api
Name: my-external-api
Type: HTTP
URL: https://external-api.example.com
Authentication: OAuth2UserTokenExchange

# OAuth Configuration
Token Service URL: https://ias.example.com/oauth2/token
Client ID: external-api-client
Client Secret: ********
```

**Token exchange flow**:

1. Application sends user's JWT to Destination Service
2. Destination Service exchanges JWT with IAS
3. IAS returns external service token
4. Destination Service returns token + endpoint to application
5. Application calls external service

---

## Debugging and Logging Infrastructure

### Token Endpoint Logging

```typescript
// srv/authorization-service/handler.token.tsx
export default async function token(req) {
  console.log("🔐 Token request:", {
    grant_type: req.data.grant_type,
    client_id: req.data.client_id,
    code: req.data.code?.substring(0, 8) + "...", // Redact
    timestamp: new Date().toISOString(),
  });

  // ... token logic ...

  console.log("✅ Token response", {
    scope,
    grant_id,
    authorization_details_count: authorization_details.length,
    actor: actor ? "present" : "none",
    token_prefix: access_token.substring(0, 10) + "...", // Redact
  });

  return { access_token, ... };
}
```

---

### Debug Service: Auth Info

**Endpoint**: `GET /auth/me`

**Purpose**: Inspect authenticated user's token and claims

```typescript
// srv/debug-service/auth-service.tsx
export default class AuthService extends cds.ApplicationService {
  public me(req) {
    const user = cds.context?.user;

    return {
      // User identity
      user: user?.id,
      roles: user?.roles,

      // Token info (redacted)
      token: {
        jwt: user?.authInfo?.token ? "[REDACTED]" : null,
        payload: user?.authInfo?.token?.payload,
        consumedApis: user?.authInfo?.token?.consumedApis,
      },

      // Authorization checks
      is: {
        anonymous: user?.is("anonymous"),
        authenticated: user?.is("authenticated"),
        admin: user?.is("admin"),
      },

      // Request info
      request: {
        method: req?.method,
        url: req?.url,
        headers: {
          authorization: req?.headers?.authorization
            ? "Bearer [REDACTED]"
            : null,
          "content-type": req?.headers?.["content-type"],
        },
      },
    };
  }
}
```

**Example response**:

```json
{
  "user": "user@example.com",
  "roles": ["authenticated-user"],
  "token": {
    "jwt": "[REDACTED]",
    "payload": {
      "sub": "user@example.com",
      "exp": 1732982400,
      "iss": "https://ias.example.com"
    }
  },
  "is": {
    "anonymous": false,
    "authenticated": true,
    "admin": false
  }
}
```

---

### Debug Service: Destination Introspection

**Endpoint**: `GET /debug/destinations/destination?name={name}`

**Purpose**: Test destination connectivity and token exchange

```typescript
// srv/debug-service/destination-service.tsx
export default class DestinationService extends cds.ApplicationService {
  async destination(req) {
    const { name } = req.data;
    const auth = req.user?.authInfo;

    try {
      const dest = await getDestination(name, auth);

      return {
        name,
        url: dest.url,
        authentication: dest.authentication,
        status: "success",
        tokens: dest.authTokens?.map((t) => ({
          type: t.type,
          expiresIn: t.expiresIn,
          value: t.value ? "[REDACTED]" : null,
        })),
      };
    } catch (error) {
      return {
        name,
        status: "error",
        error: error.message,
      };
    }
  }
}
```

---

### Logging Best Practices

#### 1. Redact Sensitive Data

```typescript
// ❌ Bad
console.log("Token:", access_token);

// ✅ Good
console.log("Token:", access_token.substring(0, 10) + "...");
```

---

#### 2. Structured Logging

```typescript
// ❌ Bad
console.log("Token issued");

// ✅ Good
console.log("✅ Token issued", {
  grant_id,
  scope,
  expires_in: 3600,
  client_id,
  timestamp: new Date().toISOString(),
});
```

---

#### 3. Log Correlation

```typescript
// Generate correlation ID for tracing
const correlationId = ulid();

console.log(`[${correlationId}] Token request received`);
console.log(`[${correlationId}] Fetching grant: ${grant_id}`);
console.log(`[${correlationId}] Token issued successfully`);
```

---

#### 4. Error Logging

```typescript
try {
  const grant = await this.read(Grants, grant_id);
} catch (error) {
  console.error("❌ Failed to fetch grant", {
    grant_id,
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
  throw error;
}
```

---

### Monitoring Metrics

**Track token issuance**:

```typescript
// Prometheus-style metrics
metrics
  .counter("oauth_token_issued_total", {
    grant_type: "authorization_code",
    client_id: req.data.client_id,
  })
  .inc();

metrics
  .histogram("oauth_token_duration_seconds", {
    grant_type: "authorization_code",
  })
  .observe(duration);
```

---

## Testing Token Flows

### Unit Tests

```typescript
// test/oauth-basic-flow.test.ts
describe("Token Endpoint", () => {
  test("should issue token for authorization_code", async () => {
    // 1. Create authorization request
    const { request_uri } = await POST("/oauth-server/par", {
      response_type: "code",
      client_id: "test-client",
      scope: "read write",
    });

    // 2. Approve consent
    const id = request_uri.split(":").pop();
    await POST(`/oauth-server/AuthorizationRequests/${id}/consent`, {
      grant_id: "grant_test123",
      subject: "user@example.com",
    });

    // 3. Exchange code for token
    const token = await POST("/oauth-server/token", {
      grant_type: "authorization_code",
      code: id,
      client_id: "test-client",
    });

    expect(token.access_token).toMatch(/^at_/);
    expect(token.grant_id).toBe("grant_test123");
    expect(token.scope).toBe("read write");
  });
});
```

---

### Integration Tests with IAS

```typescript
describe("IAS Token Exchange", () => {
  test("should exchange IAS token for application token", async () => {
    // 1. Mock IAS authentication
    const iasToken = await mockIASLogin("user@example.com");

    // 2. Exchange for application token
    const token = await POST("/oauth-server/token", {
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: iasToken,
      scope: "filesystem_read",
    });

    expect(token.access_token).toBeDefined();
    expect(token.grant_id).toBeDefined();
  });
});
```

---

## Security Considerations

### 1. PKCE Verification

```typescript
// Verify code_verifier against code_challenge
const challenge = base64url(sha256(req.data.code_verifier));
if (challenge !== request.code_challenge) {
  return req.error(400, "invalid_request", "PKCE verification failed");
}
```

---

### 2. Client Authentication

```typescript
// Verify client credentials
if (req.data.client_id !== request.client_id) {
  return req.error(400, "invalid_client");
}

// For confidential clients, verify client_secret
if (isConfidentialClient(req.data.client_id)) {
  await verifyClientSecret(req.headers.authorization);
}
```

---

### 3. Authorization Code Single Use

```typescript
// Mark code as used
await cds.run(
  cds.ql
    .UPDATE(AuthorizationRequests)
    .set({ status: "used" })
    .where({ ID: code })
);

// Reject if already used
if (request.status === "used") {
  return req.error(400, "invalid_grant", "Code already used");
}
```

---

### 4. Token Expiration

```typescript
// Check if grant still active
if (grant.status !== "active") {
  return req.error(400, "invalid_grant", "Grant revoked or expired");
}

// Check grant expiration
if (grant.expires_at && new Date(grant.expires_at) < new Date()) {
  return req.error(400, "invalid_grant", "Grant expired");
}
```

---

## Future Enhancements

### 1. Refresh Token Support

```typescript
// Store refresh token
await cds.run(
  cds.ql.INSERT.into(RefreshTokens).entries({
    id: `rt_${ulid()}`,
    grant_id: grant_id,
    token_hash: sha256(refresh_token),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  })
);

return {
  access_token,
  refresh_token,
  expires_in: 3600,
};
```

---

### 2. Token Introspection Endpoint

```http
POST /oauth-server/introspect
Content-Type: application/x-www-form-urlencoded

token=at_01HXG...:grant_01HXG...
```

**Response**:

```json
{
  "active": true,
  "scope": "filesystem_read filesystem_write",
  "client_id": "mcp-client",
  "grant_id": "grant_01HXG...",
  "exp": 1732986000,
  "sub": "user@example.com"
}
```

---

### 3. Token Revocation Endpoint

```http
POST /oauth-server/revoke
Content-Type: application/x-www-form-urlencoded

token=at_01HXG...
&token_type_hint=access_token
```

---

---

## OAuth Server Metadata Endpoint

**Implementation** (from `handler.metadata.tsx`):

```typescript
// srv/authorization-service/handler.metadata.tsx
export default function metadata(req: cds.Request) {
  const baseUrl = req.http?.req.baseUrl;

  return {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth-server/authorize`,
    token_endpoint: `${baseUrl}/oauth-server/token`,
    pushed_authorization_request_endpoint: `${baseUrl}/oauth-server/par`,
    authorization_details_types_supported: JSON.stringify([
      "grant_management",
      "file_access",
      "data_access",
      "network_access",
      "mcp-tools",
      "api",
      "database",
      "fs",
    ]),
    grant_types_supported: JSON.stringify([
      "authorization_code",
      "refresh_token",
    ]),
    response_types_supported: JSON.stringify(["code"]),
    code_challenge_methods_supported: JSON.stringify(["S256"]),
  };
}
```

**Example Response**:

```json
{
  "issuer": "https://host/oauth-server",
  "authorization_endpoint": "https://host/oauth-server/authorize",
  "token_endpoint": "https://host/oauth-server/token",
  "pushed_authorization_request_endpoint": "https://host/oauth-server/par",
  "authorization_details_types_supported": "[\"grant_management\",\"file_access\",\"data_access\",\"network_access\",\"mcp-tools\",\"api\",\"database\",\"fs\"]",
  "grant_types_supported": "[\"authorization_code\",\"refresh_token\"]",
  "response_types_supported": "[\"code\"]",
  "code_challenge_methods_supported": "[\"S256\"]"
}
```

**Note**: Additional grant types (`token-exchange`, `user_token`) are implemented but not advertised in metadata.

---

## Related Documentation

- [01_AUTHORIZATION_SERVICE.md](./01_AUTHORIZATION_SERVICE.md) - Authorization flows
- [02_GRANT_MANAGEMENT_SERVICE.md](./02_GRANT_MANAGEMENT_SERVICE.md) - Grant lifecycle
- [03_SSR_AND_HTMX.md](./03_SSR_AND_HTMX.md) - UI patterns
- [05_DEBUGGING_AND_LOGGING.md](./05_DEBUGGING_AND_LOGGING.md) - Debugging techniques

---

## References

- **OAuth 2.0 Core** - RFC 6749
- **PKCE** - RFC 7636
- **JWT Bearer Token Grant** - RFC 7523
- **Token Exchange** - RFC 8693
- **Token Introspection** - RFC 7662
- **Token Revocation** - RFC 7009
- **Rich Authorization Requests** - RFC 9396
- **SAP IAS Documentation** - help.sap.com
- **SAP Destination Service** - help.sap.com
- **SAP Cloud SDK** - sap.github.io/cloud-sdk
- **@sap/xssec** - npm package for IAS/XSUAA integration
- **jwt-decode** - npm package for JWT parsing
