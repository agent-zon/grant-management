# OAuth Flow Tests - Documentation

**Created**: 2025-10-25  
**Last Updated**: 2025-10-25

## Overview

The OAuth flow tests are split into two focused test suites for better organization and targeted testing:

1. **`oauth-basic-flow.test.ts`** - Basic authorization flow and grant management
2. **`oauth-stepup-flow.test.ts`** - Permission elevation and step-up scenarios

## Test Files

### 1. oauth-basic-flow.test.ts

**Purpose**: Tests the complete OAuth 2.0 authorization flow from initial request to token exchange.

**Test Suites**:

- ✅ **PAR → Authorize → Consent → Token**: Complete authorization flow
- ✅ **Grant Management Operations**: Create, query, list, and revoke grants
- ✅ **Server Metadata**: OAuth server discovery
- ✅ **Multiple Consents per Grant**: Adding additional consents to existing grants

**Run with**:

```bash
npm run test:oauth:basic
```

### 2. oauth-stepup-flow.test.ts

**Purpose**: Tests permission elevation scenarios where users start with limited permissions and request additional access during an active session.

**Test Suites**:

- **Update Existing Grant**: Step-up from basic to elevated permissions
- **Replace Grant**: Complete permission reset (downgrade scenario)
- **Dynamic Permission Elevation**: Real-time permission changes mid-session
- **Actor-Based Elevation**: On-behalf-of scenarios with actor context

**Run with**:

```bash
npm run test:oauth:stepup
```

## NPM Scripts

| Command                     | Description                         |
| --------------------------- | ----------------------------------- |
| `npm test`                  | Run all tests in the test directory |
| `npm run test:oauth`        | Run both OAuth test suites          |
| `npm run test:oauth:basic`  | Run only basic flow tests           |
| `npm run test:oauth:stepup` | Run only step-up/elevation tests    |

## Test Architecture

### Flow-Based Testing

Both test files follow the actual OAuth 2.0 authorization flow:

```
┌─────────────────────────────────────────────────────────┐
│ 1. PAR (Pushed Authorization Request)                  │
│    ↓                                                     │
│ 2. Authorize (Get Consent Page)                         │
│    ↓                                                     │
│ 3. Consent (User Grants Permission)                     │
│    ↓                                                     │
│ 4. Token Exchange (Get Access Token)                    │
│    ↓                                                     │
│ 5. Grant Management (Query/Update/Revoke)              │
└─────────────────────────────────────────────────────────┘
```

### Helper Functions

Both test files share common helper functions:

**`submitConsent(data)`**

- Handles consent submission with 301 redirect
- Catches and handles ENOTFOUND errors for `client.example.com`
- Returns silently on success

**`getGrantIdFromRequest(requestId)`**

- Retrieves `grant_id` from an authorization request
- Used to link requests to grants

## Current Status

### Basic Flow Tests

**Status**: 6/12 tests passing (50%)

✅ **Passing**:

- Create PAR
- Get consent page
- Submit consent
- Get server metadata
- List grants
- Basic flow structure

⚠️ **Known Issues**:

- Token exchange failing (grant lookup issue)
- Grant queries fail after token exchange
- Grant revocation returns 401

### Step-Up Flow Tests

**Status**: Not yet fully tested

⚠️ **Expected Issues**:

- Same token exchange issues as basic flow
- Grant update/replace logic needs verification

## Key Implementation Details

### 1. Redirect Handling

Consent submissions return `301` redirects to the client's callback URL:

```typescript
await POST(`/oauth-server/Consents`, data, {
  maxRedirects: 0,
  validateStatus: (status) => status === 301 || status === 201,
});
```

The redirect URL (`https://client.example.com/callback?code=...`) doesn't resolve, so we catch and ignore `ENOTFOUND` errors.

### 2. OData URL Formatting

Grant IDs contain underscores and **must be quoted** in OData URLs:

```typescript
// ✅ Correct
`/Grants('gnt_01K8CV...')`
// ❌ Wrong (will fail with "Invalid value: gnt")
`/Grants(gnt_01K8CV...)`;
```

### 3. Authorization Details Types

Tests use valid authorization detail types defined in the system:

- `api` - API access
- `database` - Database operations
- `mcp` - MCP tools
- `fs` - File system access

Types must match those defined in `srv/authorization-service/details/`

### 4. Grant Management Actions

| Action    | Description                       | Usage                 |
| --------- | --------------------------------- | --------------------- |
| `create`  | Create new grant                  | Initial authorization |
| `update`  | Add permissions to existing grant | Step-up/elevation     |
| `replace` | Replace all permissions           | Downgrade/reset       |
| `query`   | Read grant details                | Monitoring            |
| `revoke`  | Delete grant and tokens           | Logout/cleanup        |

## Step-Up Flow Scenarios

### Scenario 1: Update (Additive Elevation)

User starts with basic permissions and requests additional access:

```
Initial:  openid, profile
   ↓ (UPDATE)
Final:    openid, profile, email, calendar  ← Added
```

**Use Case**: User needs calendar access after already authenticated

### Scenario 2: Replace (Complete Reset)

User replaces all existing permissions with a new set:

```
Initial:  openid, profile, email, calendar, contacts, files
   ↓ (REPLACE)
Final:    openid, profile  ← Only these remain
```

**Use Case**: Security downgrade, permission cleanup

### Scenario 3: Dynamic Mid-Session Elevation

User encounters a protected operation and elevates in real-time:

```
1. Login with data:read
2. Attempt data:write → 403 Forbidden
3. Step-up to data:read + data:write
4. Retry operation → Success
```

**Use Case**: Just-in-time privilege escalation

### Scenario 4: Actor-Based (On-Behalf-Of)

Admin performs actions on behalf of another user:

```
Grant includes:
- Subject: alice (actual user)
- Actor: admin-assistant (performing actions)
- Scope: admin:users
```

**Use Case**: Delegated administration, customer support

## Troubleshooting

### Issue: "Cannot destructure property 'scope'... as it is undefined"

**Location**: `srv/authorization-service/handler.token.tsx:31`

**Cause**: Token handler cannot find the Grant record after consent creation

**Investigation Needed**:

1. Check if Grant is created during consent flow
2. Verify relationship between AuthorizationRequests → Consents → Grants
3. Ensure grant_id is correctly propagated

### Issue: "Invalid value: gnt"

**Cause**: OData parser doesn't handle unquoted grant IDs with underscores

**Solution**: Always use quoted keys:

```typescript
`/Grants('${grantId}')`; // ✅ Correct
```

### Issue: 401 on grant revocation

**Cause**: Missing authorization scopes or token

**Investigation Needed**:

- Check if `grant_management_revoke` scope is required
- Verify authorization header is passed correctly

## Next Steps

1. **Fix Token Handler** - Resolve grant lookup in token exchange
2. **Test Step-Up Flows** - Once basic flow works, validate elevation
3. **Add Error Scenarios** - Test invalid codes, expired requests, etc.
4. **Test Token Refresh** - Add refresh token flow tests
5. **Test SET Events** - Verify Security Event Token emission

## References

- [OAuth 2.0 Grant Management (RFC 9068)](https://www.rfc-editor.org/rfc/rfc9068.html)
- [Pushed Authorization Requests (RFC 9126)](https://www.rfc-editor.org/rfc/rfc9126.html)
- [Rich Authorization Requests (RFC 9396)](https://www.rfc-editor.org/rfc/rfc9396.html)
- [Security Event Tokens (RFC 8417)](https://www.rfc-editor.org/rfc/rfc8417.html)

## Contributing

When adding new tests:

1. **Basic flows** → Add to `oauth-basic-flow.test.ts`
2. **Elevation/step-up** → Add to `oauth-stepup-flow.test.ts`
3. **Use descriptive test names** that explain the scenario
4. **Log progress** with console.log for debugging
5. **Test both success and error cases**
