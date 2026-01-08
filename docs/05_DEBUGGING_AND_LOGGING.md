# Debugging, Logging, and Grant Types for Development

**Created**: 2025-11-30
**Last Updated**: 2025-11-30
**Category**: [DEBUGGING] [LOGGING] [DEVELOPMENT]
**Timeline**: 05 of 05 - Debugging and Development Tools

## Overview

This document covers:

1. **Debugging patterns** - How to debug OAuth flows and grant management
2. **Logging infrastructure** - Console logging, structured logging
3. **Grant types for debugging** - Test flows and convenience wrappers
4. **Token exchange debugging** - IAS and Destination Service troubleshooting
5. **Development tools** - Debug endpoints and utilities

---

## Debugging Philosophy

### Core Principles

1. **Visibility over obscurity** - Log everything (except secrets)
2. **Traceability** - Correlation IDs for request tracking
3. **Observability** - Console logs + metrics + traces
4. **Developer-friendly** - Emoji icons for log scanning 🔍
5. **Production-ready** - Structured logs that machines can parse

### Console Logging Strategy

```typescript
// Pattern: [Emoji] [Action] [Context]
console.log("🔐 Token request:", { grant_type, client_id });
console.log("✅ Token issued successfully");
console.error("❌ Failed to fetch grant:", error);
console.warn("⚠️ Grant expiring soon:", grant_id);
```

**Emoji Legend**:

- 🔐 Authentication/Authorization
- 🔑 Grants and permissions
- ✅ Success
- ❌ Error
- ⚠️ Warning
- 🔍 Query/Search
- 🚫 Revocation
- 📋 Metadata
- 🔧 Configuration
- 💾 Database operation

---

## Service-Level Logging

### Authorization Service

```typescript
// srv/authorization-service/authorization-service.tsx
export default class Service extends cds.ApplicationService {
  init() {
    console.log("🔐 Initializing AuthorizationService...");
    
    this.before("READ", AuthorizationRequests, (req) => {
      console.log("🔍 Reading AuthorizationRequest:", req.query);
      req.data["$expand"] = [
        ...(req.data["$expand"]?.split(",") || []),
        "grant($expand=authorization_details)",
      ].filter(unique).join(",");
    });
    
    this.on("token", token);
    this.on("authorize", authorize);
    this.on("par", par);
    
    console.log("✅ AuthorizationService initialized");
    return super.init();
  }
}
```

---

### Grant Management Service

```typescript
// srv/grant-management/grant-management.tsx
export default class Service extends cds.ApplicationService {
  init() {
    console.log("🔑 Initializing GrantsManagementService...");
    
    this.on("DELETE", Grants, DELETE);
    this.on("UPDATE", Grants, POST);
    this.on("GET", Grants, this.Expand);
    
    console.log("✅ GrantsManagementService initialized");
    return super.init();
  }
  
  private async Expand(req, next) {
    req.data["$expand"] = [
      ...(req.data["$expand"]?.split(",") || []),
      "authorization_details",
      "consents",
    ].filter(unique).join(",");
    
    console.log("🔧 Expanding grant details:", {
      query: req.query.SELECT?.from?.ref,
      expand: req.data["$expand"],
    });
    
    return next(req);
  }
}
```

---

## Handler-Level Logging

### PAR (Pushed Authorization Request)

```typescript
// srv/authorization-service/handler.requests.tsx
export default async function par(req) {
  console.log("📋 PAR request received:", {
    client_id: req.data.client_id,
    scope: req.data.scope,
    grant_management_action: req.data.grant_management_action,
    has_authorization_details: !!req.data.authorization_details,
  });
  
  // Parse authorization details
  const authDetails = JSON.parse(req.data.authorization_details || "[]");
  console.log("🔍 Parsed authorization_details:", {
    count: authDetails.length,
    types: authDetails.map(d => d.type),
  });
  
  // Generate request URI
  const request = await this.create(AuthorizationRequests, {
    ...req.data,
    access: authDetails,
    expires_at: Date.now() + 90000,
  });
  
  console.log("✅ PAR request created:", {
    request_uri: `urn:ietf:params:oauth:request_uri:${request.ID}`,
    expires_in: 90,
  });
  
  return {
    request_uri: `urn:ietf:params:oauth:request_uri:${request.ID}`,
    expires_in: 90,
  };
}
```

---

### Authorization (Consent Display)

```typescript
// srv/authorization-service/handler.authorize.tsx
export default async function authorize(req) {
  const { request_uri } = req.data;
  const id = request_uri.split(":").pop();
  
  console.log("🔐 Authorize action:", {
    request_uri,
    request_id: id,
  });
  
  // Read authorization request
  console.log("🔧 Reading authorization request:", id);
  const request = await this.read(AuthorizationRequests, id);
  
  if (!request) {
    console.error("❌ Authorization request not found:", id);
    return cds.context?.http?.res.status(404).send("Request not found");
  }
  
  console.log("📋 Authorization request loaded:", {
    grant_id: request.grant_id,
    client_id: request.client_id,
    scope: request.scope,
    grant_management_action: request.grant_management_action,
  });
  
  // Upsert grant
  console.log("🔧 Upserting grant:", request.grant_id);
  const grant = await grantManagement.upsert({
    id: request.grant_id,
    client_id: request.client_id,
    risk_level: request.risk_level,
  }).into(Grants);
  
  console.log("📋 Grant loaded for authorization:", grant.id);
  
  // Render consent page
  req.http?.res.send(htmlTemplate(renderToString(<ConsentPage />)));
}
```

---

### Token Exchange

```typescript
// srv/authorization-service/handler.token.tsx
export default async function token(req) {
  console.log("🔐 Token request:", {
    grant_type: req.data.grant_type,
    code: req.data.code?.substring(0, 8) + "...",
    client_id: req.data.client_id,
    timestamp: new Date().toISOString(),
  });
  
  const { grant_type, code } = req.data;
  
  if (grant_type !== "authorization_code") {
    console.error("❌ Unsupported grant type:", grant_type);
    return req.error(400, "unsupported_grant_type");
  }
  
  // Fetch grant
  console.log("🔍 Fetching grant for code:", code);
  const { grant_id } = await this.read(AuthorizationRequests, code);
  
  if (!grant_id) {
    console.error("❌ Invalid grant:", code);
    return req.error(400, "invalid_grant");
  }
  
  // Read grant record
  console.log("💾 Reading grant record:", grant_id);
  const grantRecord = await cds.run(
    cds.ql.SELECT.one.from(Grants).where({ id: grant_id })
  );
  
  // Fetch authorization details
  console.log("💾 Fetching authorization details for grant:", grant_id);
  const authorization_details = await cds.run(
    cds.ql.SELECT.from(AuthorizationDetails)
      .where({ consent_grant_id: grant_id })
  );
  
  console.log("✅ Token issued successfully:", {
    grant_id,
    scope: grantRecord.scope,
    authorization_details_count: authorization_details.length,
    actor: grantRecord.actor ? "present" : "none",
  });
  
  return {
    access_token: `at_${ulid()}:${grant_id}`,
    token_type: "Bearer",
    expires_in: 3600,
    scope: grantRecord.scope,
    grant_id,
    authorization_details,
    actor: grantRecord.actor,
  };
}
```

---

### Grant Revocation

```typescript
// srv/grant-management/handler.revoke.tsx
export async function DELETE(req, next) {
  const grant_id = req.params[0];
  
  console.log("🚫 Revoking grant:", {
    grant_id,
    user: cds.context.user.id,
    timestamp: new Date().toISOString(),
  });
  
  // Update grant status
  const result = await cds.run(
    cds.ql.UPDATE(Grants)
      .set({
        status: "revoked",
        revoked_at: new Date().toISOString(),
        revoked_by: cds.context.user.id,
      })
      .where({ id: grant_id })
  );
  
  if (result === 0) {
    console.error("❌ Grant not found:", grant_id);
    return req.error(404, "Grant not found");
  }
  
  console.log("✅ Grant revoked successfully:", grant_id);
  
  // TODO: Emit Security Event Token (SET)
  // TODO: Invalidate refresh tokens
  
  // Redirect to grants list
  if (req?.http?.req.accepts("html")) {
    return render(req, <GrantsListWithSuccessMessage />);
  }
  
  return { status: "revoked" };
}
```

---

## Structured Logging

### Log Format

```typescript
interface LogEntry {
  level: "info" | "warn" | "error";
  timestamp: string;
  service: string;
  handler: string;
  message: string;
  context: Record<string, any>;
  correlationId?: string;
}
```

### Implementation

```typescript
// srv/utils/logger.tsx
export class Logger {
  constructor(
    private service: string,
    private correlationId?: string
  ) {}
  
  info(message: string, context?: Record<string, any>) {
    console.log(JSON.stringify({
      level: "info",
      timestamp: new Date().toISOString(),
      service: this.service,
      message,
      context,
      correlationId: this.correlationId,
    }));
  }
  
  error(message: string, error?: Error, context?: Record<string, any>) {
    console.error(JSON.stringify({
      level: "error",
      timestamp: new Date().toISOString(),
      service: this.service,
      message,
      error: {
        message: error?.message,
        stack: error?.stack,
      },
      context,
      correlationId: this.correlationId,
    }));
  }
}

// Usage
const logger = new Logger("AuthorizationService", ulid());
logger.info("Token request received", { grant_type, client_id });
logger.error("Failed to fetch grant", error, { grant_id });
```

---

## Debug Endpoints

### 1. Auth Info (`/auth/me`)

**Purpose**: Inspect current user's authentication

```typescript
// srv/debug-service/auth-service.tsx
export default class AuthService extends cds.ApplicationService {
  public me(req) {
    const user = cds.context?.user;
    
    return {
      // Identity
      user: user?.id,
      roles: user?.roles,
      
      // Token (redacted)
      token: {
        payload: user?.authInfo?.token?.payload,
        consumedApis: user?.authInfo?.token?.consumedApis,
      },
      
      // Authorization
      is: {
        anonymous: user?.is("anonymous"),
        authenticated: user?.is("authenticated"),
        admin: user?.is("admin"),
      },
      
      // Request
      request: {
        method: req?.method,
        url: req?.url,
        headers: {
          authorization: req?.headers?.authorization 
            ? "Bearer [REDACTED]" 
            : null,
        },
      },
    };
  }
}
```

**Usage**:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://host/auth/me | jq
```

**Response**:

```json
{
  "user": "user@example.com",
  "roles": ["authenticated-user"],
  "token": {
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

### 2. Destination Info (`/debug/destinations/destination`)

**Purpose**: Test destination connectivity

```typescript
// srv/debug-service/destination-service.tsx
export default class DestinationService extends cds.ApplicationService {
  async destination(req) {
    const { name } = req.data;
    const auth = req.user?.authInfo;
    
    console.log("🔧 Fetching destination:", name);
    
    try {
      const dest = await getDestination(name, auth);
      
      console.log("✅ Destination resolved:", {
        name,
        url: dest.url,
        authentication: dest.authentication,
      });
      
      return {
        name,
        url: dest.url,
        authentication: dest.authentication,
        status: "success",
        tokens: dest.authTokens?.map(t => ({
          type: t.type,
          expiresIn: t.expiresIn,
          value: "[REDACTED]",
        })),
      };
    } catch (error) {
      console.error("❌ Destination resolution failed:", {
        name,
        error: error.message,
      });
      
      return {
        name,
        status: "error",
        error: error.message,
      };
    }
  }
}
```

**Usage**:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://host/debug/destinations/destination?name=my-api" | jq
```

---

### 3. Grant Inspector (Future)

**Purpose**: Debug grant state and history

```typescript
// srv/grant-management/handler.inspect.tsx
export async function INSPECT(req) {
  const grant_id = req.params[0];
  
  // Fetch all related data
  const grant = await cds.run(
    cds.ql.SELECT.one.from(Grants).where({ id: grant_id })
  );
  
  const consents = await cds.run(
    cds.ql.SELECT.from(Consents).where({ grant_id })
  );
  
  const authDetails = await cds.run(
    cds.ql.SELECT.from(AuthorizationDetails)
      .where({ consent_grant_id: grant_id })
  );
  
  const requests = await cds.run(
    cds.ql.SELECT.from(AuthorizationRequests).where({ grant_id })
  );
  
  return {
    grant,
    consents,
    authorization_details: authDetails,
    authorization_requests: requests,
    lifecycle: {
      created: grant.createdAt,
      modified: grant.modifiedAt,
      revoked: grant.revoked_at,
      consent_count: consents.length,
      merge_count: consents.length - 1,
    },
  };
}
```

---

## Grant Types for Development

### 1. Standard Authorization Code Flow

**Production flow** - Full user consent

```bash
# 1. PAR
curl -X POST https://host/oauth-server/par \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "response_type=code" \
  -d "client_id=mcp-client" \
  -d "scope=filesystem_read" \
  -d "code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM" \
  -d "code_challenge_method=S256"

# 2. Authorize (user approves in browser)
open "https://host/oauth-server/authorize?request_uri=urn:..."

# 3. Token exchange
curl -X POST https://host/oauth-server/token \
  -d "grant_type=authorization_code" \
  -d "code=01HXG..." \
  -d "code_verifier=dBjftJeZ4CVP..." \
  -d "client_id=mcp-client"
```

---

### 2. Simplified Test Flow (No PKCE)

**Development convenience** - Skip PKCE for testing

```typescript
// srv/authorization-service/handler.token.tsx (dev mode)
if (process.env.NODE_ENV === "development") {
  // Skip PKCE verification
  console.warn("⚠️ PKCE verification skipped (dev mode)");
} else {
  // Verify PKCE in production
  const challenge = base64url(sha256(req.data.code_verifier));
  if (challenge !== request.code_challenge) {
    return req.error(400, "invalid_request");
  }
}
```

---

### 3. Client Credentials (Service-to-Service)

**Future enhancement** - No user interaction

```typescript
// srv/authorization-service/handler.token.tsx
if (grant_type === "client_credentials") {
  console.log("🔐 Client credentials flow:", {
    client_id: req.data.client_id,
    scope: req.data.scope,
  });
  
  // Verify client credentials
  await verifyClientSecret(req.headers.authorization);
  
  // Issue token (no grant_id)
  return {
    access_token: `at_${ulid()}`,
    token_type: "Bearer",
    expires_in: 3600,
    scope: req.data.scope,
  };
}
```

---

### 4. Password Grant (Testing Only)

**For automated tests** - Avoid in production

```typescript
// srv/authorization-service/handler.token.tsx (test mode)
if (grant_type === "password" && process.env.NODE_ENV === "test") {
  console.warn("⚠️ Password grant (test mode only)");
  
  const { username, password, scope } = req.data;
  
  // Verify credentials (test users only)
  if (username !== "test@example.com" || password !== "test123") {
    return req.error(401, "invalid_grant");
  }
  
  // Create grant
  const grant_id = `grant_${ulid()}`;
  await cds.run(
    cds.ql.INSERT.into(Grants).entries({
      id: grant_id,
      subject: username,
      scope: scope,
      status: "active",
    })
  );
  
  return {
    access_token: `at_${ulid()}:${grant_id}`,
    token_type: "Bearer",
    expires_in: 3600,
    scope,
    grant_id,
  };
}
```

---

## Token Exchange Debugging

### IAS Token Exchange

**Debug IAS token verification**:

```typescript
// srv/authorization-service/ias-integration.tsx
async function verifyIASToken(token: string) {
  console.log("🔐 Verifying IAS token:", {
    token_prefix: token.substring(0, 20) + "...",
  });
  
  // Decode without verification (for debugging)
  const decoded = jwt.decode(token, { complete: true });
  console.log("📋 IAS token decoded:", {
    header: decoded?.header,
    payload: {
      iss: decoded?.payload?.iss,
      sub: decoded?.payload?.sub,
      exp: decoded?.payload?.exp,
      aud: decoded?.payload?.aud,
    },
  });
  
  try {
    // Fetch JWKS
    console.log("🔍 Fetching IAS JWKS...");
    const jwks = await fetch(
      "https://ias.cfapps.eu12.hana.ondemand.com/.well-known/jwks.json"
    ).then(res => res.json());
    
    console.log("✅ JWKS fetched:", {
      keys_count: jwks.keys.length,
    });
    
    // Verify signature
    console.log("🔐 Verifying JWT signature...");
    const { payload } = await JWT.verify(token, jwks, {
      issuer: "https://ias.cfapps.eu12.hana.ondemand.com",
    });
    
    console.log("✅ IAS token verified:", {
      sub: payload.sub,
      exp: payload.exp,
    });
    
    return payload;
  } catch (error) {
    console.error("❌ IAS token verification failed:", {
      error: error.message,
      token_prefix: token.substring(0, 20) + "...",
    });
    throw error;
  }
}
```

---

### Destination Token Exchange

**Debug destination service calls**:

```typescript
// srv/mcp-service/utils/destination.tsx
export async function getDestination(
  destinationName: string,
  auth?: SecurityContext
): Promise<HttpDestination> {
  console.log("🔧 Fetching destination:", {
    name: destinationName,
    has_auth: !!auth,
  });
  
  try {
    const jwt = auth?.getAppToken();
    console.log("🔑 JWT token present:", !!jwt);
    
    // Fetch destination
    console.log("🔍 Calling Destination Service...");
    const dest = await getDestinationFromServiceBinding({
      destinationName,
      jwt: jwt,
    });
    
    console.log("✅ Destination resolved:", {
      url: dest.url,
      authentication: dest.authentication,
      tokens_count: dest.authTokens?.length || 0,
    });
    
    // Log token info (redacted)
    if (dest.authTokens) {
      dest.authTokens.forEach((token, i) => {
        console.log(`🔑 Token ${i}:`, {
          type: token.type,
          expiresIn: token.expiresIn,
          hasValue: !!token.value,
        });
      });
    }
    
    return dest;
  } catch (error) {
    console.error("❌ Destination resolution failed:", {
      name: destinationName,
      error: error.message,
      stack: error.stack,
    });
    
    // Fallback for development
    console.warn("⚠️ Using default destination (dev mode)");
    return defaultDestination();
  }
}
```

---

## Common Debugging Scenarios

### Scenario 1: "Authorization request not found"

**Symptoms**: 404 error in authorize endpoint

**Debug steps**:

```typescript
// 1. Check PAR was successful
console.log("🔍 Checking PAR request...");
const parResponse = await POST("/oauth-server/par", { ... });
console.log("PAR response:", parResponse);

// 2. Verify request_uri format
const request_uri = parResponse.request_uri;
console.log("Request URI:", request_uri);
// Expected: urn:ietf:params:oauth:request_uri:01HXG...

// 3. Extract ID
const id = request_uri.split(":").pop();
console.log("Request ID:", id);

// 4. Query database directly
const request = await cds.run(
  cds.ql.SELECT.one.from(AuthorizationRequests).where({ ID: id })
);
console.log("Request record:", request);
```

**Common causes**:

- PAR request expired (90 seconds)
- Wrong request_uri format
- Database connection issue

---

### Scenario 2: "Invalid grant" on token exchange

**Symptoms**: 400 error when exchanging code for token

**Debug steps**:

```typescript
// 1. Check authorization code
console.log("🔍 Checking authorization code:", code);

// 2. Query authorization request
const authRequest = await cds.run(
  cds.ql.SELECT.one.from(AuthorizationRequests).where({ ID: code })
);
console.log("Authorization request:", authRequest);

// 3. Check grant_id present
if (!authRequest?.grant_id) {
  console.error("❌ No grant_id in authorization request");
  // Consent was never created
}

// 4. Query grant record
const grant = await cds.run(
  cds.ql.SELECT.one.from(Grants).where({ id: authRequest.grant_id })
);
console.log("Grant record:", grant);

// 5. Check grant status
if (grant.status !== "active") {
  console.error("❌ Grant not active:", grant.status);
}
```

**Common causes**:

- Consent not approved
- Grant revoked between authorize and token
- Wrong authorization code

---

### Scenario 3: Missing authorization_details

**Symptoms**: Token response has empty authorization_details array

**Debug steps**:

```typescript
// 1. Check PAR request included authorization_details
console.log("🔍 PAR authorization_details:", 
  req.data.authorization_details);

// 2. Check parsing succeeded
const parsed = JSON.parse(req.data.authorization_details || "[]");
console.log("Parsed authorization_details:", parsed);

// 3. Check storage in AuthorizationRequest
const request = await this.read(AuthorizationRequests, id);
console.log("Stored authorization_details:", request.authorization_details);
console.log("Parsed access:", request.access);

// 4. Check consent created authorization details
const details = await cds.run(
  cds.ql.SELECT.from(AuthorizationDetails)
    .where({ consent_grant_id: grant_id })
);
console.log("Stored AuthorizationDetails:", details);
```

**Common causes**:

- Malformed JSON in PAR
- Consent handler not creating authorization details
- Wrong foreign key in authorization_details table

---

## Performance Monitoring

### Log Timings

```typescript
// srv/authorization-service/handler.token.tsx
export default async function token(req) {
  const start = Date.now();
  
  // ... token logic ...
  
  const duration = Date.now() - start;
  console.log("⏱️ Token exchange duration:", {
    duration_ms: duration,
    grant_id,
  });
  
  // Alert on slow requests
  if (duration > 1000) {
    console.warn("⚠️ Slow token exchange:", {
      duration_ms: duration,
      grant_id,
    });
  }
  
  return { access_token, ... };
}
```

---

### Database Query Logging

```typescript
// Enable CDS query logging
cds.env.log.levels = {
  "cds.ql": "debug",
  "db": "debug",
};

// Logs will show:
// [cds.ql] - SELECT * FROM Grants WHERE id = ?
// [db] - Execution time: 15ms
```

---

## Testing Utilities

### Mock Grant Creation

```typescript
// test/utils/mock-grant.ts
export async function createMockGrant(
  srv: cds.Service,
  overrides?: Partial<Grant>
) {
  const grant_id = `grant_test_${ulid()}`;
  
  await srv.run(
    cds.ql.INSERT.into(Grants).entries({
      id: grant_id,
      subject: "test@example.com",
      scope: "read write",
      status: "active",
      ...overrides,
    })
  );
  
  console.log("✅ Mock grant created:", grant_id);
  return grant_id;
}
```

---

### Mock Authorization Flow

```typescript
// test/utils/mock-oauth-flow.ts
export async function completeAuthFlow(
  options: {
    scope?: string;
    authorization_details?: any[];
    grant_management_action?: string;
  } = {}
) {
  // 1. PAR
  const { request_uri } = await POST("/oauth-server/par", {
    response_type: "code",
    client_id: "test-client",
    scope: options.scope || "read",
    authorization_details: JSON.stringify(options.authorization_details || []),
    grant_management_action: options.grant_management_action,
  });
  
  // 2. Extract ID
  const id = request_uri.split(":").pop();
  
  // 3. Consent
  const consent = await POST(
    `/oauth-server/AuthorizationRequests/${id}/consent`,
    {
      grant_id: `grant_test_${ulid()}`,
      subject: "test@example.com",
    }
  );
  
  // 4. Token
  const token = await POST("/oauth-server/token", {
    grant_type: "authorization_code",
    code: id,
    client_id: "test-client",
  });
  
  console.log("✅ Mock OAuth flow completed:", {
    grant_id: token.grant_id,
    scope: token.scope,
  });
  
  return token;
}
```

---

## Production Logging

### Log Levels

```typescript
// srv/utils/logger.tsx
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel;
  
  constructor() {
    // Production: INFO or higher
    // Development: DEBUG
    this.level = process.env.NODE_ENV === "production" 
      ? LogLevel.INFO 
      : LogLevel.DEBUG;
  }
  
  debug(message: string, context?: any) {
    if (this.level <= LogLevel.DEBUG) {
      console.log("🔍 [DEBUG]", message, context);
    }
  }
  
  info(message: string, context?: any) {
    if (this.level <= LogLevel.INFO) {
      console.log("ℹ️ [INFO]", message, context);
    }
  }
  
  warn(message: string, context?: any) {
    if (this.level <= LogLevel.WARN) {
      console.warn("⚠️ [WARN]", message, context);
    }
  }
  
  error(message: string, error?: Error, context?: any) {
    if (this.level <= LogLevel.ERROR) {
      console.error("❌ [ERROR]", message, error, context);
    }
  }
}
```

---

### Sensitive Data Redaction

```typescript
function redactToken(token: string): string {
  return token.substring(0, 10) + "..." + token.substring(token.length - 4);
}

function redactEmail(email: string): string {
  const [user, domain] = email.split("@");
  return `${user[0]}***@${domain}`;
}

// Usage
console.log("Token issued:", {
  access_token: redactToken(access_token),
  subject: redactEmail(grant.subject),
});
```

---

## Related Documentation

- [01_AUTHORIZATION_SERVICE.md](./01_AUTHORIZATION_SERVICE.md) - OAuth flows
- [02_GRANT_MANAGEMENT_SERVICE.md](./02_GRANT_MANAGEMENT_SERVICE.md) - Grant APIs
- [03_SSR_AND_HTMX.md](./03_SSR_AND_HTMX.md) - UI debugging
- [04_TOKEN_APIS_AND_IAS_WRAPPING.md](./04_TOKEN_APIS_AND_IAS_WRAPPING.md) - Token debugging

---

## Summary

### Key Takeaways

1. **Log everything** (except secrets) - Visibility is critical for OAuth debugging
2. **Use emojis** - Fast visual scanning of logs
3. **Structured logging** - Machine-readable for production monitoring
4. **Debug endpoints** - `/auth/me`, `/debug/destinations` for troubleshooting
5. **Mock utilities** - Speed up testing with helper functions
6. **Redact sensitive data** - Never log full tokens or passwords

### Quick Debug Checklist

- [ ] Check console for error logs with ❌
- [ ] Verify PAR request succeeded (look for ✅)
- [ ] Confirm authorization request exists in database
- [ ] Verify consent was created
- [ ] Check grant status is "active"
- [ ] Validate authorization_details were stored
- [ ] Use `/auth/me` to inspect user token
- [ ] Check destination service with `/debug/destinations`
- [ ] Review CDS query logs for slow queries
- [ ] Test with mock utilities first

---

## References

- **Structured Logging** - 12factor.net/logs
- **Application Monitoring** - Prometheus, Grafana
- **Distributed Tracing** - OpenTelemetry
- **Log Aggregation** - ELK Stack, Splunk
