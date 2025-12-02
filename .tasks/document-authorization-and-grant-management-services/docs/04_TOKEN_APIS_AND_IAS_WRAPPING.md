# Token APIs and IAS Service Wrapping

**Created**: 2025-11-30
**Last Updated**: 2025-11-30
**Category**: [ARCHITECTURE] [OAUTH] [TOKENS] [IAS]
**Timeline**: 04 of 05 - Token Management Documentation

## Overview

This document covers:

1. **Token endpoint implementation** - OAuth 2.0 token exchange
2. **Grant types supported** - authorization_code, client_credentials, etc.
3. **IAS (Identity Authentication Service) wrapping** - Token exchange with external identity provider
4. **Destination Service integration** - Token exchange for service-to-service communication
5. **Debugging and logging** - Observability patterns

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
│  Authorization Service (handler.token.tsx)                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  1. Determine grant_type                              │ │
│  │  2. Check if IAS is configured                        │ │
│  │  3. Call IAS token endpoint OR use mock               │ │
│  │  4. Extract grant_id from JWT (sid claim)             │ │
│  │  5. Fetch authorization_details from DB               │ │
│  │  6. Return token response with grant_id               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  IAS Integration (when configured)                    │ │
│  │  • Uses @sap/xssec IdentityService                    │ │
│  │  • mTLS with certificates                             │ │
│  │  • Supports multiple grant types                      │ │
│  │  • Returns JWT tokens                                 │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Token Response                                              │
│  {                                                           │
│    "access_token": "eyJhbGciOiJSUzI1NiIs...", // JWT       │
│    "token_type": "Bearer",                                  │
│    "expires_in": 3600,                                      │
│    "refresh_token": "rt_...", // (if requested)            │
│    "grant_id": "grant_01HXG...", // from JWT sid claim     │
│    "authorization_details": [...]                           │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
```

---

## Token Endpoint Implementation

### Core Token Handler Structure

**Actual implementation** - Wraps IAS (Identity Authentication Service) with fallback

```typescript
// srv/authorization-service/handler.token.tsx
import cds from "@sap/cds";
import { IdentityService } from "@sap/xssec";
import { jwtDecode } from "jwt-decode";
import { ulid } from "ulid";
import fetch from "node-fetch";
import { Agent } from "https";

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
  
  // 1. Get tokens from IAS or mock implementation
  const { access_token, ...tokens } = await getTokens();
  
  if (!access_token) {
    return tokens;
  }
  
  // 2. Extract grant_id from JWT sid claim
  const { sid: grant_id } = jwtDecode<{ sid: string }>(access_token);
  
  // 3. Fetch authorization details from DB by consent foreign key
  const authorization_details = await cds.run(
    cds.ql.SELECT.from(AuthorizationDetails).where({
      consent_grant_id: grant_id,
    })
  );
  
  console.log("[token] response", {
    access_token: access_token?.slice(0, 5),
    grant_id,
    authorization_details: authorization_details.length,
    ...tokens,
  });
  
  // 4. Return OAuth token response with Grant Management extension
  return {
    access_token,
    ...tokens,
    token_type: "Bearer",
    expires_in: 3600,
    grant_id,              // Grant Management extension
    authorization_details, // Rich Authorization Requests
  };
}
```

**Key Implementation Details:**

1. **IAS Integration** - Uses `@sap/xssec` `IdentityService` when credentials available
2. **JWT Tokens** - Returns actual JWT tokens from IAS, not simple strings
3. **Grant ID Extraction** - Uses `jwt-decode` to extract `sid` claim as `grant_id`
4. **Fallback** - Mock implementation when `cds.requires.auth.credentials` not configured
5. **Authorization Details** - Always fetched from local DB after token issuance

---

### Token Response Structure

#### Standard OAuth 2.0 Fields

```json
{
  "access_token": "at_01HXG123...:grant_01HXG456...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "filesystem_read filesystem_write",
  "refresh_token": "rt_01HXG..." // (future)
}
```

#### Extensions

**Grant Management** (OAuth 2.0 Grant Management):

```json
{
  "grant_id": "grant_01HXG456..."
}
```

**Rich Authorization Requests** (RFC 9396):

```json
{
  "authorization_details": [
    {
      "type": "fs",
      "locations": ["/workspace"],
      "permissions": { "read": true, "write": true }
    }
  ]
}
```

**On-Behalf-Of** (Actor Token):

```json
{
  "actor": "urn:agent:finance-v1"
}
```

---

### Access Token Format

**JWT Tokens from IAS (Production)**

When IAS is configured, tokens are standard JWT format:

```
eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMyIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyQGV4YW1wbGUuY29tIiwic2lkIjoiZ3JhbnRfMDFIWEciLCJleHAiOjE3MzI5ODY0MDAsImlzcyI6Imh0dHBzOi8vaWFzLmV4YW1wbGUuY29tIn0.signature
│                                                      │                                                                                                │
└─ Header (algorithm, key ID, type)                   └─ Payload (sub, sid=grant_id, exp, iss, ...)                                                    └─ Signature
```

**JWT Payload Structure:**

```json
{
  "sub": "user@example.com",
  "sid": "grant_01HXG456789ABCDEF012",  // ← grant_id
  "exp": 1732986400,
  "iss": "https://ias.example.com",
  "aud": "client-id",
  "iat": 1732982800,
  "jti": "unique-token-id"
}
```

**Mock Tokens (Development)**

When IAS is not configured, mock tokens are generated:

```
mk_01HXG123456789ABCDEF
│   │
│   └─ ULID (unique identifier)
└─ Mock prefix
```

**Implementation Details:**

```typescript
// Extract grant_id from JWT using jwt-decode
const { sid: grant_id } = jwtDecode<{ sid: string }>(access_token);

// Mock token generation (no IAS)
const access_token = req.user?.authInfo?.token?.jwt || `mk_${ulid()}`;
```

**Key Differences:**

| Aspect | IAS (Production) | Mock (Development) |
|--------|------------------|-------------------|
| Format | JWT (signed) | Simple string |
| Grant ID | In `sid` claim | From DB lookup |
| Expiration | IAS manages | Fixed or from session |
| Validation | JWT signature | Not validated |
| Refresh | Via IAS | Not supported |

---

## Grant Types Supported

### 1. Authorization Code (Primary Flow)

**Use case**: User authorizes application to access resources

**Implementation**:

```typescript
if (grant_type === "authorization_code") {
  const request = await cds.read(AuthorizationRequests, code);
  
  // If request has subject_token, exchange it via IAS
  if (request.subject_token && authService) {
    const tokenUrl = await authService.getTokenUrl(
      "urn:ietf:params:oauth:grant-type:token-exchange"
    );
    
    const response = await fetch(tokenUrl.href, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
        subject_token: request.subject_token,
        subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
        client_id: authService.credentials.clientid!,
      }),
      agent: new Agent({
        key: authService.credentials.key,
        cert: authService.credentials.certificate,
      }),
    });
    
    const { access_token, ...tokens } = await response.json();
    const { sid } = jwtDecode<{ sid: string }>(access_token);
    
    return {
      access_token,
      ...tokens,
      grant_id: request.grant_id || sid,
    };
  }
  
  // Fallback: use current session token
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
&redirect_uri=https://client.app/callback
&client_id=mcp-client
```

**Note**: PKCE (`code_verifier`) is validated at the PAR stage, not in token endpoint.

---

### 2. Refresh Token (IAS Integration)

**Use case**: Obtain new access token without user interaction

**Implementation**:

```typescript
if (refresh_token != null) {
  const authService = new IdentityService(cds.requires.auth.credentials);
  const tokenUrl = await authService.getTokenUrl("refresh_token");
  
  const response = await fetch(tokenUrl.href, {
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
  });
  
  const { access_token, ...tokens } = await response.json();
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
&client_id=mcp-client
```

**Key Points**:

- Delegates to IAS token endpoint
- Uses mTLS with client certificates
- Extracts grant_id from JWT `sid` claim
- Only works when IAS is configured

---

### 3. Token Exchange (IAS Integration)

**Use case**: Exchange one token for another (RFC 8693)

**Implementation**:

```typescript
if (grant_type === "urn:ietf:params:oauth:grant-type:token-exchange") {
  const authService = new IdentityService(cds.requires.auth.credentials);
  const tokenUrl = await authService.getTokenUrl(
    "urn:ietf:params:oauth:grant-type:token-exchange"
  );
  
  const response = await fetch(tokenUrl.href, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: subject_token || req.user?.authInfo?.token.jwt || "",
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      client_id: authService.credentials.clientid!,
    }),
    agent: new Agent({
      key: authService.credentials.key,
      cert: authService.credentials.certificate,
    }),
  });
  
  const { access_token, ...tokens } = await response.json();
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

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
&subject_token=eyJhbGciOiJSUzI1NiIs...
&subject_token_type=urn:ietf:params:oauth:token-type:jwt
&client_id=mcp-client
```

**Use Cases**:

- Convert IAS token to application-specific token
- Downscope tokens for least privilege
- Cross-service authentication

---

### 4. User Token (Custom Grant Type)

**Use case**: Exchange user's JWT token for application token with grant_id

**Implementation**:

```typescript
if (grant_type === "user_token") {
  console.log("user_token request", {
    jwt: req.user?.authInfo?.token.jwt?.slice(0, 10),
    header: req.http?.req?.headers.authorization?.slice(0, 20),
  });
  
  // Use JWT bearer token exchange via IAS
  if (req.user?.authInfo?.token.jwt && cds.requires.auth.credentials) {
    const authService = new IdentityService(cds.requires.auth.credentials);
    
    const { access_token, ...tokens } = 
      await authService.fetchJwtBearerToken(
        req.user.authInfo?.getAppToken()
      );
    
    const { sid: grant_id } = 
      jwtDecode<{ sid: string }>(access_token) || {};
    
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
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...

grant_type=user_token
```

**Key Points**:

- Custom grant type (not OAuth 2.0 standard)
- Uses `IdentityService.fetchJwtBearerToken()` method
- Extracts user token from request authorization header
- Returns IAS-issued JWT with grant_id from `sid` claim

### 5. Fallback (No Grant Type)

**Use case**: Development/testing - return current session token

**Implementation**:

```typescript
// No specific grant_type - return current session
console.log("no grant type return current session");

return {
  access_token: req.user?.authInfo?.token?.jwt || `mk_${ulid()}`,
  expires_in: 
    (req.user?.authInfo?.token.expirationDate?.getUTCDate() || 
     new Date(Date.now() + 36000).getUTCDate()) - 
    new Date(Date.now()).getUTCDate(),
  grant_id: req.user?.authInfo?.token?.payload["sid"],
};
```

**Use Cases**:

- Local development without OAuth flow
- Testing with mock authentication
- Quick prototyping

---

## IAS (Identity Authentication Service) Wrapping

### What is IAS?

**SAP Identity Authentication Service (IAS)** is SAP's cloud-based identity provider (IdP) supporting:

- SAML 2.0
- OpenID Connect (OIDC)
- OAuth 2.0
- User management
- Multi-factor authentication (MFA)
- mTLS client authentication

### How We Use IAS

Our Authorization Service **wraps** IAS token endpoints using `@sap/xssec`:

```
┌─────────────┐       ┌──────────────────────────────┐       ┌─────────┐
│  MCP Client │ ←────→ │ Auth Service                 │ ←────→ │   IAS   │
│             │  (1)   │ (handler.token.tsx)          │  (2)   │  (IdP)  │
│             │        │                              │        │         │
│             │        │ • @sap/xssec IdentityService │        │         │
│             │        │ • mTLS authentication        │        │         │
│             │        │ • Token extraction           │        │         │
│             │        │ • Grant ID from JWT sid      │        │         │
└─────────────┘       └──────────────────────────────┘       └─────────┘
     OAuth 2.0              OAuth 2.0 → IAS               OIDC + mTLS
  + RAR + Grant Mgmt     + Authorization Details       Standard IdP + JWT
```

**Benefits**:

1. **JWT Tokens** - Production-ready signed tokens from IAS
2. **Grant Management** - Add grant_id from JWT `sid` claim
3. **Authorization Details** - Attach RAR details from local DB
4. **mTLS Security** - Certificate-based authentication to IAS
5. **Refresh Tokens** - Delegate to IAS for refresh flow
6. **Token Exchange** - Support RFC 8693 token exchange
7. **Fallback** - Mock implementation for local development

### IAS Configuration

**Required in `cds.requires.auth.credentials`:**

```json
{
  "clientid": "your-client-id",
  "clientsecret": "your-client-secret",
  "url": "https://ias.cfapps.eu12.hana.ondemand.com",
  "key": "-----BEGIN PRIVATE KEY-----\n...",
  "certificate": "-----BEGIN CERTIFICATE-----\n..."
}
```

**Implementation Check:**

```typescript
// Check if IAS is configured
if (!cds.requires.auth.credentials) {
  // Use mock implementation
  return {
    access_token: `mk_${ulid()}`,
    expires_in: 3600,
    grant_id: request.grant_id,
  };
}

// IAS is configured - use IdentityService
const authService = new IdentityService(cds.requires.auth.credentials);
```

---

### IAS Token Endpoint Integration

**Using @sap/xssec IdentityService:**

```typescript
import { IdentityService } from "@sap/xssec";
import { Agent } from "https";
import fetch from "node-fetch";

// 1. Initialize IdentityService with credentials
const authService = new IdentityService(cds.requires.auth.credentials);

// 2. Get IAS token endpoint URL for specific grant type
const tokenUrl = await authService.getTokenUrl("refresh_token");
// Returns: https://ias.example.com/oauth2/token

// 3. Call IAS token endpoint with mTLS
const response = await fetch(tokenUrl.href, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: "rt_...",
  }),
  agent: new Agent({
    key: authService.credentials.key,         // Private key
    cert: authService.credentials.certificate, // Certificate
  }),
});

const { access_token, ...tokens } = await response.json();

// 4. Extract grant_id from JWT
import { jwtDecode } from "jwt-decode";
const { sid: grant_id } = jwtDecode<{ sid: string }>(access_token);
```

**JWT Bearer Token Method:**

```typescript
// Simpler method for JWT bearer exchange
const authService = new IdentityService(cds.requires.auth.credentials);

const { access_token, ...tokens } = 
  await authService.fetchJwtBearerToken(
    req.user.authInfo?.getAppToken()
  );

const { sid: grant_id } = jwtDecode<{ sid: string }>(access_token);
```

---

### Mock Implementation (Development)

**When IAS is not configured:**

```typescript
// No IAS credentials - return mock data
if (!cds.requires.auth.credentials) {
  const request = code && 
    (await cds.read(AuthorizationRequests, code) as AuthorizationRequest);
  
  if (!request) {
    console.log("missing request for code", grant_type, code);
    throw Error("invalid_grant");
  }
  
  return {
    expires_in: 3600,
    refresh_token: ulid(),
    access_token: req.user?.authInfo?.token?.jwt || `mk_${ulid()}`,
    token_type: "urn:ietf:params:oauth:token-type:jwt",
    grant_id: request.grant_id!,
  };
}
```

**Key Points:**

- Checks `cds.requires.auth.credentials` existence
- Uses current session JWT if available
- Falls back to `mk_${ulid()}` mock token
- Always returns grant_id from authorization request
- Enables local development without IAS setup

### Grant ID Extraction Strategy

**From JWT (Production):**

```typescript
import { jwtDecode } from "jwt-decode";

// IAS tokens have grant_id in 'sid' claim
const { sid: grant_id } = jwtDecode<{ sid: string }>(access_token);
```

**From Database (Fallback):**

```typescript
// When using authorization_code, get from request
const request = await cds.read(AuthorizationRequests, code);
const grant_id = request.grant_id;
```

**From Session (Mock):**

```typescript
// Extract from current user session
const grant_id = req.user?.authInfo?.token?.payload["sid"];
```

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
        tokens: dest.authTokens?.map(t => ({
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
metrics.counter("oauth_token_issued_total", {
  grant_type: "authorization_code",
  client_id: req.data.client_id,
}).inc();

metrics.histogram("oauth_token_duration_seconds", {
  grant_type: "authorization_code",
}).observe(duration);
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

### 1. mTLS (Mutual TLS)

**IAS communication uses certificate-based authentication:**

```typescript
agent: new Agent({
  key: authService.credentials.key,         // Private key from credentials
  cert: authService.credentials.certificate, // X.509 certificate
})
```

**Benefits:**

- Prevents man-in-the-middle attacks
- Ensures only authorized services can request tokens
- Standard for OAuth 2.0 Mutual-TLS Client Authentication (RFC 8705)

---

### 2. JWT Signature Verification

**IAS tokens are signed JWTs:**

- IAS signs tokens with RSA or ECDSA private key
- Signature verified using IAS public keys (JWKS)
- `@sap/xssec` handles verification automatically
- No manual signature verification needed in application

**JWT Claims Used:**

```json
{
  "sid": "grant_01HXG...",  // Session ID → grant_id
  "exp": 1732986400,        // Expiration timestamp
  "iss": "https://ias...",  // Issuer verification
  "sub": "user@example.com", // Subject (user ID)
  "aud": "client-id"        // Audience validation
}
```

---

### 3. Token Expiration

**Managed by IAS:**

```typescript
// IAS sets expiration in JWT
const { exp } = jwtDecode(access_token);

// Check if token is expired
if (Date.now() / 1000 > exp) {
  throw Error("token_expired");
}
```

**No local token storage** - tokens are short-lived JWTs validated by signature and expiration.

---

### 4. Grant Lifecycle Validation

**Check grant status before attaching authorization_details:**

```typescript
// Fetch authorization details only if grant exists
const authorization_details = await cds.run(
  cds.ql.SELECT.from(AuthorizationDetails).where({
    consent_grant_id: grant_id,
  })
);

// If no grant found, authorization_details will be empty array
```

---

### 5. Error Handling

**Never expose internal errors:**

```typescript
try {
  const tokens = await callIAS();
  return tokens;
} catch (error) {
  console.error("[token] IAS error:", error);
  // Return generic error to client
  throw Error("invalid_grant");
}
```

---

## Complete Implementation Summary

### Supported Grant Types

| Grant Type | Status | IAS Required | Implementation |
|------------|--------|--------------|----------------|
| `authorization_code` | ✅ Implemented | Optional | Exchanges auth code, optionally via IAS |
| `refresh_token` | ✅ Implemented | Required | Delegates to IAS token endpoint |
| `urn:ietf:params:oauth:grant-type:token-exchange` | ✅ Implemented | Required | RFC 8693 token exchange via IAS |
| `user_token` | ✅ Implemented | Required | Custom - JWT bearer via IAS |
| (no grant_type) | ✅ Implemented | Optional | Returns current session token |

### Token Flow Decision Tree

```typescript
async function getTokens() {
  // 1. Check if IAS configured
  if (!cds.requires.auth.credentials) {
    return mockImplementation();
  }
  
  // 2. Initialize IAS service
  const authService = new IdentityService(cds.requires.auth.credentials);
  
  // 3. Route by grant_type
  if (refresh_token) {
    return refreshTokenViaIAS(authService, refresh_token);
  }
  
  if (grant_type === "urn:ietf:params:oauth:grant-type:token-exchange") {
    return tokenExchangeViaIAS(authService, subject_token);
  }
  
  if (grant_type === "user_token") {
    return jwtBearerViaIAS(authService);
  }
  
  if (grant_type === "authorization_code") {
    const request = await cds.read(AuthorizationRequests, code);
    if (request.subject_token) {
      return tokenExchangeViaIAS(authService, request.subject_token);
    }
    return useSessionToken(request);
  }
  
  // 4. Fallback - current session
  return useSessionToken();
}
```

### Key Implementation Patterns

**1. mTLS Authentication:**

```typescript
agent: new Agent({
  key: authService.credentials.key,
  cert: authService.credentials.certificate,
})
```

**2. Grant ID Extraction:**

```typescript
const { sid: grant_id } = jwtDecode<{ sid: string }>(access_token);
```

**3. Authorization Details:**

```typescript
const authorization_details = await cds.run(
  cds.ql.SELECT.from(AuthorizationDetails).where({
    consent_grant_id: grant_id,
  })
);
```

### Error Handling

```typescript
try {
  const { access_token } = await callIAS();
  return { access_token, grant_id: extractGrantId(access_token) };
} catch (error) {
  console.error("IAS token request failed:", error);
  throw Error("invalid_grant");
}
```

---

### Future Enhancements

**1. Token Introspection** (RFC 7662)

Currently not implemented. Would require:

```typescript
// Future: Token introspection endpoint
async function introspect(token: string) {
  // For JWT tokens, decode and verify signature
  const payload = jwtDecode(token);
  const grant_id = payload.sid;
  
  // Check if grant is still active
  const grant = await cds.read(Grants, grant_id);
  
  return {
    active: grant.status === "active",
    grant_id,
    scope: grant.scope,
    exp: payload.exp,
    sub: payload.sub,
  };
}
```

**2. PKCE Validation in Token Endpoint**

Currently PKCE validation happens at PAR stage. Could add:

```typescript
// Future: PKCE validation in token endpoint
if (code_challenge) {
  const computed = base64url(sha256(code_verifier));
  if (computed !== code_challenge) {
    throw Error("invalid_request");
  }
}
```

**3. Client Credentials Grant**

Not currently implemented. Would delegate to IAS:

```typescript
// Future: Client credentials grant
if (grant_type === "client_credentials") {
  return await authService.fetchClientCredentialsToken(scope);
}
```

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
- **Token Introspection** - RFC 7662
- **Token Revocation** - RFC 7009
- **SAP IAS Documentation** - help.sap.com
- **SAP Destination Service** - help.sap.com
- **SAP Cloud SDK** - sap.github.io/cloud-sdk
