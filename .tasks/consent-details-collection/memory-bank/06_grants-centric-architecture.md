# Grants-Centric Architecture - Complete Restructure

**Created**: 2025-10-04  
**Last Updated**: 2025-10-04  
**Category**: [ARCHITECTURE]  
**Timeline**: 06 of XX - Complete restructure to grants-centric approach

## Overview

Completely restructured the data model to use Grants as the primary entity with proper associations to Consents and AuthorizationRequests. This eliminates the complex projection issues and creates a cleaner, more maintainable architecture.

## Architectural Change

### Before: Consent-Centric (Problematic)
```
Consents (primary) → Grants (projection view)
- Complex projections with virtual fields
- Merge logic scattered across handlers
- Difficult to maintain relationships
```

### After: Grants-Centric (Clean)
```
Grants (primary entity)
├── Consents (composition)
└── AuthorizationRequests (composition)
```

## New Data Model

### 1. **Grants as Primary Entity**

```cds
entity Grants: cuid, managed {
  client_id: String;
  risk_level: String;
  status: String @cds.on.insert: 'active';
  granted_at: Timestamp @cds.on.insert: $now;
  subject: User;
  actor: String;
  scope: String;
  authorization_details: array of Map;
  
  // Compositions - Grants own their consents and requests
  consents: Composition of many Consents on consents.grant = $self;
  requests: Composition of many AuthorizationRequests on requests.grant = $self;
}
```

### 2. **Consents as Child Entity**

```cds
entity Consents:cuid,managed {
  // Association to Grant (primary relationship)
  grant: Association to Grants;
  
  request: Association to AuthorizationRequests;
  scope: String; 
  authorization_details: array of Map;
  duration: Timespan;
  subject: User;
  previous_consent: Association to Consents; // Chain for audit trail
}
```

### 3. **AuthorizationRequests Associated to Grants**

```cds
entity AuthorizationRequests: cuid, managed {
  // ... request fields
  
  // Association to Grant (primary relationship)
  grant: Association to Grants;
  
  // ... other fields
}
```

## Flow Changes

### 1. **Authorization Flow**

**Before**: Request → Consent → Grant (projection)
**After**: Request → Grant (create/find) → Consent (associate to grant)

```tsx
// In handlers.authorize.tsx
if (request.grant_management_action === "merge" && request.grant_id) {
  // Load existing grant
  grant = await srv.read(Grants, request.grant_id);
} else {
  // Create new grant
  const grantId = request.grant || ulid();
  grant = await srv.create(Grants, {
    ID: grantId,
    client_id: request.client_id,
    risk_level: request.risk_level,
    subject: req.user.id,
    actor: request.requested_actor,
    scope: request.scope,
    authorization_details: request.access || []
  });
}
```

### 2. **Consent Creation**

**Before**: Complex merge logic in consent handler
**After**: Simple consent creation + grant update

```tsx
// In handlers.consent.tsx
srv.before("POST", Consents, async (req) => {
  // Simple scope merging with previous consent
  const previousConsents = await srv.run(
    SELECT.from(Consents)
      .where({ grant_ID: req.data.grant_ID })
      .orderBy('createdAt desc')
      .limit(1)
  );
  
  if (previousConsents.length > 0) {
    // Merge scopes and link to previous consent
    req.data.previous_consent_ID = previousConsents[0].ID;
    req.data.scope = mergeScopes(previousConsents[0].scope, req.data.scope);
  }
});

srv.after("POST", Consents, async (consent, req) => {
  // Update grant with latest consent data
  await srv.update(Grants, consent.grant_ID, {
    scope: consent.scope,
    authorization_details: consent.authorization_details,
    status: 'active'
  });
});
```

### 3. **New Endpoint Structure**

**Before**: `AuthorizationRequests/{id}/consent`
**After**: `Grants/{grant_id}/consents` (future enhancement)

Current: Still using `AuthorizationRequests/{id}/consent` but with `grant_ID` in form data

## Benefits of This Architecture

### 1. **Clarity** ✅
- Grants are the primary entity (as they should be)
- Clear parent-child relationships
- No complex projections

### 2. **Maintainability** ✅
- Simple CRUD operations on Grants
- Consents are just audit trail entries
- Clear separation of concerns

### 3. **Performance** ✅
- No complex projections or virtual fields
- Direct queries on Grants table
- Efficient associations

### 4. **Extensibility** ✅
- Easy to add new fields to Grants
- Simple to add new child entities
- Clear data ownership

### 5. **OAuth Compliance** ✅
- Grants are first-class entities
- Proper grant lifecycle management
- Clear audit trail through consents

## Implementation Details

### Grant Creation Logic
```tsx
// Either use existing grant_id from request or generate new one
const grantId = request.grant || ulid();

// Check if grant exists (for merge operations)
const existingGrant = await srv.run(SELECT.one.from(Grants).where({ ID: grantId }));

if (!existingGrant) {
  // Create new grant with initial data
  grant = await srv.create(Grants, { /* grant data */ });
} else {
  // Use existing grant for merge
  grant = existingGrant;
}
```

### Consent Chain Maintenance
```tsx
// Find previous consent for this grant
const previousConsents = await srv.run(
  SELECT.from(Consents)
    .where({ grant_ID: req.data.grant_ID })
    .orderBy('createdAt desc')
    .limit(1)
);

// Link to previous consent for audit trail
if (previousConsents.length > 0) {
  req.data.previous_consent_ID = previousConsents[0].ID;
}
```

### Grant Updates
```tsx
// After consent creation, update grant with latest data
await srv.update(Grants, consent.grant_ID, {
  scope: consent.scope,
  authorization_details: consent.authorization_details,
  status: 'active'
});
```

## Migration Path

### Current State
- ✅ Grants entity restructured as primary entity
- ✅ Consents associated to Grants
- ✅ AuthorizationRequests associated to Grants
- ✅ Authorization flow updated
- ✅ Consent creation updated

### Next Steps
1. Update endpoint routing to use `grants/{id}/consents`
2. Update UI to work with grants-centric model
3. Test complete flow
4. Remove old projection-based code

## Result

This architecture is much cleaner and follows standard database design principles:
- **Grants** are the primary business entity
- **Consents** are audit trail entries
- **Requests** are temporary workflow entities
- Clear ownership and relationships
- No complex projections or virtual fields

The new structure is more intuitive, maintainable, and performant while maintaining full OAuth 2.0 Grant Management compliance.
