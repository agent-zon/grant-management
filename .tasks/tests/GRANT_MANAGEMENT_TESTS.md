# Grant Management Tests - Node.js Test Runner

**Created**: 2025-10-25  
**Last Updated**: 2025-10-25  
**Category**: [TESTING]

## Overview

Created comprehensive grant management tests using Node.js native test runner (`node:test`) with full OAuth 2.0 flow testing including grant elevation and multi-consent scenarios.

## Test File

**Location**: `test/grant-management.test.ts`

**Run with**:

```bash
npm run test:grant-mgmt
```

Or directly:

```bash
node --import tsx --test --test-concurrency=1 --experimental-vm-modules test/grant-management.test.ts
```

## Test Structure

### Test 1: Setup - Create Initial Grant

Creates the baseline grant through complete OAuth flow:

- PAR (Pushed Authorization Request)
- Authorize endpoint
- Consent submission
- Token exchange
- Sets `initialGrantId` for subsequent tests

### Test 2: Query Initial Grant

Verifies the initial grant can be queried via Grants Management API:

- Queries `/grants-management/Grants('{id}')`
- Validates grant_id, client_id, and scope

### Test 3: Grant Elevation (5 subtests)

Tests adding additional consents to an existing grant:

1. **PAR**: Creates elevation request with existing `grant_id`
2. **Authorize**: Gets consent page for elevation
3. **Consent**: Submits elevation consent with new scopes
4. **Token**: Exchanges code for elevated token
5. **Query**: Verifies grant has combined permissions from both consents

**Key Assertions**:

- Reuses same grant_id
- Combines scopes: "openid profile workspace.fs admin"
- Merges authorization_details (MCP + FS)

### Test 4: Create New Grant (5 subtests)

Tests creating a new grant without providing grant_id:

1. **PAR**: Creates request WITHOUT grant_id (server generates new one)
2. **Authorize**: Gets consent page
3. **Consent**: Submits consent with different client_id
4. **Token**: Exchanges code for token
5. **Query**: Verifies new grant exists with correct data

**Key Assertions**:

- Creates new grant_id different from initial
- Uses different client_id ("test-client-new")
- Has separate scope and authorization_details

### Test 5: Query Grant List

Validates grant listing functionality:

- Queries `/grants-management/Grants`
- Verifies both grants are present
- Confirms correct client_id mapping

## Test Results

```
✓ tests 15
✓ suites 1
✓ pass 15
✗ fail 0
✓ duration ~3.2s
```

## Critical Bugs Found & Fixed

### Bug 1: Grant List JSON Response Broken

**File**: `srv/grant-management/handler.list.tsx`

**Issue**: The `getGrants` workaround function (fixing a "last grant overwrite issue") was only applied to HTML responses. JSON API responses returned incomplete/incorrect data.

**Fix**: Applied the workaround to both HTML and JSON responses:

```typescript
if (isGrants(response)) {
  const grants = await getGrants(this, response);

  // For HTML responses, render the UI
  if (cds.context?.http?.req.accepts("html")) {
    return cds.context?.render(/* JSX */);
  }

  // For JSON responses, return the processed grants
  return grants;
}
```

### Bug 2: Single Grant Query Not Processing Consents

**File**: `srv/grant-management/handler.list.tsx`

**Issue**: Single grant queries (SELECT.one) bypassed the workaround, returning grants without aggregated scopes and authorization_details.

**Fix**: Added workaround for single grant queries:

```typescript
if (req.query?.SELECT?.one) {
  const response = await next(req);
  if (isGrant(response)) {
    const processedGrant = await getGrant(this, response);
    return processedGrant;
  }
  return response;
}
```

### Bug 3: Incorrect client_id Fallback

**File**: `srv/grant-management/handler.list.tsx` (getGrants function)

**Issue**: Line 365 had: `client_id: grant?.client_id || consent.grant_id`  
This caused grant_id to be used as client_id when grant record didn't exist.

**Fix**: Query AuthorizationRequests to get proper client_id:

```typescript
const authRequests = await cds.run(
  cds.ql.SELECT.from("sap.scai.grants.AuthorizationRequests").columns(
    "ID",
    "client_id",
    "grant_id"
  )
);
const grantToClientMap = new Map<string, string>();
authRequests.forEach((req: any) => {
  if (req.grant_id && req.client_id) {
    grantToClientMap.set(req.grant_id, req.client_id);
  }
});
```

### Bug 4: Edit Handler Using Wrong Service Context

**File**: `srv/grant-management/handler.edit.tsx`

**Issue**: Used `srv.run()` to query `AuthorizationRequests` which doesn't belong to GrantsManagementService.

**Fix**: Changed to `cds.run()` for cross-service queries.

### Bug 5: Edit Handler Not Using Workaround

**File**: `srv/grant-management/handler.edit.tsx`

**Issue**: Edit handler (GET for single grant) didn't apply the same workaround pattern.

**Fix**: Applied consistent `isGrant()` check and `getGrant()` workaround:

```typescript
if (isGrant(grant)) {
  const processedGrant = await getGrant(this, grant);

  if (cds.context?.http?.req.accepts("html")) {
    // Render UI with processedGrant
  }

  // For JSON, return processedGrant
  return processedGrant;
}
```

## Key Patterns Established

### 1. Workaround Pattern

Both handlers now use consistent workaround functions:

- `getGrant()` - Process single grant
- `getGrants()` - Process grant list
- Both aggregate scopes, authorization_details, and fetch correct client_id

### 2. Type Guards

```typescript
function isGrant(grant: Grant | void | Grants | Error): grant is Grant {
  return (
    !!grant &&
    !isNativeError(grant) &&
    grant.hasOwnProperty("id") &&
    !Array.isArray(grant)
  );
}

function isGrants(grant: Grant | void | Grants | Error): grant is Grants {
  return !!grant && !isNativeError(grant) && grant.hasOwnProperty("length");
}
```

### 3. Response Handling

```typescript
if (isGrant(response)) {
  const processed = await getGrant(this, response);

  if (accepts("html")) {
    return render(/* UI */);
  }

  return processed; // JSON response
}
```

## Requirements Met

✅ Global setup creates first grant and sets grant_id  
✅ Test 1: Grant elevation with subtests (PAR → Authorize → Consent → Query)  
✅ Test 2: New grant without grant_id input  
✅ Test 3: Query grant list to verify both grants  
✅ Uses Node.js native assertions (`node:assert`)  
✅ Simple, clear test structure  
✅ No hidden logic - all steps visible  
✅ Each subtest has clear purpose

## Node.js Version Requirement

**Requires Node.js 22.16+** for `--import tsx` support

Set as default:

```bash
nvm install 22.16
nvm alias default 22.16
```

### Bug 6: Single-Value Fields for Multi-Consent Grants

**Files**: Both `handler.list.tsx` and `handler.edit.tsx`

**Issue**: Grants with multiple consents from different clients/actors/subjects only showed a single value, losing important context about cross-client or on-behalf-of scenarios.

**Fix**: Return arrays of unique values for `client_id`, `actor`, and `subject`:

```typescript
// Collect unique values from all consents
const client_ids = consents.map((c: any) => c.client_id).filter(Boolean).filter(unique);
const actors = consents.map((c: any) => c.actor).filter(Boolean).filter(unique);
const subjects = consents.map((c: any) => c.subject).filter(Boolean).filter(unique);

return {
  ...grant,
  client_id: client_ids.length > 0 ? client_ids : [...],
  actor: actors.length > 0 ? actors : undefined,
  subject: subjects.length > 0 ? subjects : undefined,
};
```

**Impact**:

- Properly represents grants that span multiple clients
- Preserves on-behalf-of (actor) context from multiple consent flows
- Shows all subjects involved in the grant
- UI updated to display arrays with comma separation

## API Response Format Changes

### Before (Single Values)

```json
{
  "id": "gnt_123",
  "client_id": "client-1",
  "actor": "urn:agent:tool-1",
  "subject": "alice"
}
```

### After (Array Values)

```json
{
  "id": "gnt_123",
  "client_id": ["client-1", "client-2"],
  "actor": ["urn:agent:tool-1", "urn:agent:tool-2"],
  "subject": ["alice"]
}
```

## Requirements Met

✅ Global setup creates first grant and sets grant_id  
✅ Test 1: Grant elevation with subtests (PAR → Authorize → Consent → Query)  
✅ Test 2: New grant without grant_id input  
✅ Test 3: Query grant list to verify both grants  
✅ Uses Node.js native assertions (`node:assert`)  
✅ Simple, clear test structure  
✅ No hidden logic - all steps visible  
✅ Each subtest has clear purpose  
✅ Multi-client/actor/subject scenarios properly handled

## Node.js Version Requirement

**Requires Node.js 22.16+** for `--import tsx` support

Set as default:

```bash
nvm install 22.16
nvm alias default 22.16
```

## Future Enhancements

- Add grant revocation tests
- Test grant update/replace actions
- Test error scenarios (invalid grant_id, unauthorized access)
- Add performance benchmarks
- Test concurrent consent submissions
- Test multi-actor on-behalf-of scenarios
