# PAR Grant Creation Flow - Clean Separation of Concerns

**Created**: 2025-10-04  
**Last Updated**: 2025-10-04  
**Category**: [ARCHITECTURE]  
**Timeline**: 07 of XX - Moved grant creation to PAR handler for cleaner flow

## Overview

Moved grant creation logic to the PAR (Pushed Authorization Request) handler where grant IDs are generated. This creates a much cleaner separation of concerns and follows OAuth 2.0 flow more naturally.

## Improved Flow Architecture

### Before: Grant Creation in Authorization Handler
```
PAR → Request Created
Authorization → Grant Created (complex logic)
Consent → Grant Updated
```

### After: Grant Creation in PAR Handler
```
PAR → Grant Created (basic) + Request Created
Authorization → Grant Loaded (simple)
Consent → Grant Activated (final)
```

## Implementation Details

### 1. **PAR Handler - Grant Creation** (`srv/authorization/handlers.requests.tsx`)

```tsx
srv.on("par", async (req) => {
  // Generate or use existing grant ID
  const grantId = req.data.grant_id || `gnt_${ulid()}`;
  
  // Create or update grant using upsert (only basic info, no scopes/auth details yet)
  await srv.upsert(Grants, {
    ID: grantId,
    client_id: req.data.client_id,
    risk_level: req.data.risk_level || 'low',
    subject: req.data.subject || 'anonymous', // Will be updated during authorization
    actor: req.data.requested_actor,
    status: 'pending', // Not active until consent is granted
  });
  
  // Create authorization request linked to grant
  const {ID} = await srv.insert({
    grant_ID: grantId, // Associate with grant
    grant_id: req.data.grant_id, // Store original grant_id for merge operations
    ...req.data,
    access: req.data.authorization_details ? parseAuthorizationDetails(req.data.authorization_details) : undefined,
  }).into(AuthorizationRequests);
  
  req.reply({
    request_uri: `urn:ietf:params:oauth:request_uri:${ID}`,
    expires_in: 90,
  });
});
```

**Key Features:**
- ✅ **srv.upsert()**: Handles both create and merge scenarios elegantly
- ✅ **Basic Grant**: Only creates grant with ID and basic metadata
- ✅ **Pending Status**: Grant starts as 'pending', becomes 'active' after consent
- ✅ **Clean Association**: Request is immediately linked to grant

### 2. **Authorization Handler - Simplified** (`srv/authorization/handlers.authorize.tsx`)

```tsx
// Load the grant associated with this request
const { Grants } = srv.entities;
const grant = await srv.read(Grants, request.grant_ID);

if (!grant) {
  return req.error(400, "invalid_grant", "Grant not found for this request");
}

console.log("📋 Grant loaded for authorization:", grant.ID);
```

**Simplified Logic:**
- ❌ **Removed**: Complex grant creation/merge logic
- ✅ **Simple**: Just load the grant that was created in PAR
- ✅ **Clean**: Focus on authorization UI, not grant management

### 3. **Consent Handler - Grant Activation** (`srv/authorization/handlers.consent.tsx`)

```tsx
srv.after("POST", Consents, async (consent, req) => {
  // Update the grant with the consented scope and authorization details
  if (consent.grant_ID) {
    await srv.update(Grants, consent.grant_ID, {
      scope: consent.scope,
      authorization_details: consent.authorization_details,
      status: 'active', // Grant becomes active after consent
      subject: consent.subject // Update with actual consenting user
    });
    console.log("🔄 Grant activated with consent data:", consent.grant_ID);
  }
});
```

**Grant Activation:**
- ✅ **Status Change**: 'pending' → 'active'
- ✅ **Scope Assignment**: Final merged scopes
- ✅ **Authorization Details**: Complete permissions
- ✅ **Subject Update**: Real consenting user (not anonymous)

## Grant Lifecycle States

### 1. **Created (PAR)**
```json
{
  "ID": "gnt_01234567890",
  "client_id": "my-client",
  "risk_level": "low",
  "subject": "anonymous",
  "actor": "urn:agent:finance-v1",
  "status": "pending",
  "scope": null,
  "authorization_details": []
}
```

### 2. **Activated (Consent)**
```json
{
  "ID": "gnt_01234567890",
  "client_id": "my-client", 
  "risk_level": "low",
  "subject": "user123",
  "actor": "urn:agent:finance-v1",
  "status": "active",
  "scope": "read write admin",
  "authorization_details": [
    {"type": "fs", "roots": ["/home"], "actions": ["read", "write"]},
    {"type": "api", "urls": ["https://api.example.com"], "protocols": ["HTTPS"]}
  ]
}
```

## Benefits of This Approach

### 1. **Clean Separation of Concerns** ✅
- **PAR**: Creates grants and requests
- **Authorization**: Shows consent UI
- **Consent**: Activates grants

### 2. **OAuth 2.0 Compliance** ✅
- Grants exist from the moment of request
- Clear grant lifecycle (pending → active)
- Proper association between requests and grants

### 3. **Simplified Logic** ✅
- No complex grant creation in authorization handler
- Simple upsert handles create/merge scenarios
- Clear data flow

### 4. **Better Error Handling** ✅
- Grant always exists when authorization starts
- Clear error messages for missing grants
- No race conditions

### 5. **Merge Operations** ✅
- `srv.upsert()` handles merge elegantly
- Existing grant updated with new request data
- No complex conditional logic

## Flow Example

### New Grant Flow:
```
1. PAR: grant_id=null → Generate gnt_12345 → Create Grant (pending)
2. Authorization: Load Grant gnt_12345 → Show consent UI
3. Consent: Create Consent → Update Grant (active)
```

### Merge Grant Flow:
```
1. PAR: grant_id=gnt_12345 → Upsert Grant gnt_12345 → Create Request
2. Authorization: Load Grant gnt_12345 → Show merge UI
3. Consent: Create Consent → Update Grant with merged data
```

## Technical Benefits

### srv.upsert() Advantages:
- **Idempotent**: Safe to call multiple times
- **Merge-Friendly**: Updates existing grants automatically
- **Simple**: One call handles both create and update scenarios

### Clear Data Ownership:
- **PAR**: Owns grant creation
- **Authorization**: Owns consent UI
- **Consent**: Owns grant activation

This architecture is much cleaner and follows the natural OAuth 2.0 flow where grants are created when requests are pushed, not when users see the consent screen.
