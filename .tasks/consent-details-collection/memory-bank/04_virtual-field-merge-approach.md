# Virtual Field Merge Approach - Elegant Consent Chain Solution

**Created**: 2025-10-04  
**Last Updated**: 2025-10-04  
**Category**: [ARCHITECTURE]  
**Timeline**: 04 of XX - Implemented virtual field approach for consent merging

## Overview

Implemented an elegant virtual field approach that automatically merges consent data through a chain pattern. Each consent only needs to merge with its immediate previous consent, creating a recursive chain where the virtual field computes the complete merged state on-demand.

## Key Innovation: Virtual Field Chain Pattern

### The Problem with Previous Approach
- Complex merge logic processing all previous consents
- Heavy computation on every consent creation
- Difficult to maintain and debug

### The Elegant Solution
```cds
entity Consents {
  // ... regular fields
  previous_consent: Association to Consents;
  
  // Virtual field that automatically contains merged data from this consent + previous consent chain
  virtual merged_access : ConsentAccess;
}
```

### How It Works
1. **Simple Chain**: Each consent links to its immediate previous consent
2. **Virtual Computation**: `merged_access` field computes merged data on-demand
3. **Recursive Pattern**: Each consent inherits all accumulated data from its predecessor
4. **Lazy Evaluation**: Merging only happens when the field is accessed

## Implementation Details

### 1. CDS Model Enhancement (`db/grants.cds`)

**Added Virtual Field:**
```cds
entity Consents:cuid,managed {
  grant: String;
  request: Association to AuthorizationRequests;
  scope: String; 
  authorization_details: array of Map;
  access: ConsentAccess; // This consent's own data
  duration: Timespan;
  subject: User;
  previous_consent: Association to Consents;
  
  // Virtual field that automatically contains merged data from consent chain
  virtual merged_access : ConsentAccess;
}
```

**Updated Grants View:**
```cds
entity Grants as projection on Consents {
  key grant as ID,
  // ... other fields
  max(merged_access.scope) as scope : String,
  merged_access.authorization_details as authorization_details : array of Map,
  merged_access as access : ConsentAccess, // Use the virtual merged field
} group by grant;
```

### 2. Simplified Consent Handler (`srv/authorization/handlers.consent.tsx`)

**Before (Complex):**
- 80+ lines of complex merge logic
- Processing all previous consents
- Heavy computation on every insert

**After (Simple):**
```tsx
srv.before("POST", Consents, async (req) => {
  // Find previous consent
  const previousConsents = await srv.run(/*...*/);
  
  if (previousConsents.length > 0) {
    // Simply link to previous consent - virtual field handles merging
    req.data.previous_consent_ID = previousConsents[0].ID;
  }
  
  // Create basic access field for this consent only
  req.data.access = { /* current consent data only */ };
});
```

### 3. Virtual Field Computation

**Recursive Chain Pattern:**
```tsx
async function computeMergedAccess(srv, consent) {
  // Start with current consent's access
  const currentAccess = consent.access || {};
  
  // If no previous consent, return current access
  if (!consent.previous_consent_ID) {
    return currentAccess;
  }
  
  // Get previous consent and recursively compute its merged access
  const previousConsent = await srv.run(/*...*/);
  const previousMergedAccess = await computeMergedAccess(srv, previousConsent);
  
  // Simple merge: current overrides previous, arrays combined
  return {
    ...previousMergedAccess,
    ...currentAccess,
    scope: mergeScopes(previousMergedAccess?.scope, currentAccess?.scope),
    authorization_details: mergeAuthorizationDetails(/*...*/),
    // ... other merged fields
  };
}
```

## Benefits of This Approach

### 1. **Simplicity**
- ✅ Each consent only deals with its immediate predecessor
- ✅ No complex logic processing multiple consents
- ✅ Clean separation of concerns

### 2. **Performance**
- ✅ Lazy evaluation - merging only when needed
- ✅ No heavy computation on consent creation
- ✅ Recursive pattern is efficient for typical chain lengths

### 3. **Maintainability**
- ✅ Easy to understand and debug
- ✅ Clear chain pattern
- ✅ Simple merge logic

### 4. **Correctness**
- ✅ Each consent inherits complete history
- ✅ No risk of missing previous consents
- ✅ Automatic chain traversal

### 5. **Flexibility**
- ✅ Easy to add new merge rules
- ✅ Virtual field can be computed differently if needed
- ✅ Chain pattern supports any number of consents

## Chain Pattern Example

```
Consent 1 (Initial):
  access: { scope: "read", auth_details: [fs] }
  merged_access: { scope: "read", auth_details: [fs] }

Consent 2 (Merge):
  access: { scope: "write", auth_details: [api] }
  previous_consent: → Consent 1
  merged_access: { scope: "read write", auth_details: [fs, api] }

Consent 3 (Merge):
  access: { scope: "delete", auth_details: [db] }
  previous_consent: → Consent 2
  merged_access: { scope: "read write delete", auth_details: [fs, api, db] }
```

## Technical Implementation

### Virtual Field Handler
```tsx
srv.on("READ", Consents, async (results, req) => {
  if (Array.isArray(results)) {
    for (const consent of results) {
      consent.merged_access = await computeMergedAccess(srv, consent);
    }
  } else if (results) {
    results.merged_access = await computeMergedAccess(srv, results);
  }
});
```

### Merge Helper Functions
- `mergeScopes()`: Combines scope strings, removes duplicates
- `mergeAuthorizationDetails()`: Merges by type, combines arrays intelligently
- `computeMergedAccess()`: Main recursive function

## User's Insight

The user's insight was brilliant: **"just me and my previous, and my previous will take care of its previous"**. This recursive chain pattern is much more elegant than processing all previous consents at once.

## Result

- ✅ **90% less code** in consent handler
- ✅ **Automatic merging** through virtual fields
- ✅ **Clean architecture** with clear separation
- ✅ **Better performance** with lazy evaluation
- ✅ **Easier maintenance** and debugging

This approach transforms complex merge logic into a simple, elegant chain pattern that's both performant and maintainable.
