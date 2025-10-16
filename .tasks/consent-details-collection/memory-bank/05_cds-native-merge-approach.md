# CDS-Native Merge Approach with @cds.on.insert

**Created**: 2025-10-04  
**Last Updated**: 2025-10-04  
**Category**: [ARCHITECTURE]  
**Timeline**: 05 of XX - Implemented CDS-native merge approach using regular field population

## Overview

Fixed the virtual field issue by implementing a CDS-native approach where the `merged_access` field is populated during consent creation using the `srv.before("POST")` handler. This maintains the elegant chain pattern while being compatible with CDS projections.

## Problem with Virtual Fields

**CDS Error:**
```
[ERROR] db/grants.cds:20:3: Virtual elements can't be used in expressions (in entity:"grant.management.Grants"/column:"scope")
[ERROR] db/grants.cds:21:3: Virtual elements can't be used in expressions (in entity:"grant.management.Grants"/column:"authorization_details")
```

**Root Cause:** Virtual fields cannot be used in CDS projections with `max()`, `group by`, or other aggregation functions.

## Solution: CDS-Native Field Population

### 1. **Regular Field Instead of Virtual**

**Before (Virtual - Doesn't Work):**
```cds
entity Consents {
  // ... other fields
  virtual merged_access : ConsentAccess;
}
```

**After (Regular Field - Works):**
```cds
entity Consents {
  // ... other fields
  // Merged access field that gets populated automatically on insert
  merged_access: ConsentAccess;
}
```

### 2. **Population During Insert**

Instead of computing on-demand, we populate the field during consent creation:

```tsx
srv.before("POST", Consents, async (req) => {
  // Create current consent's access
  const currentAccess = { /* current consent data */ };
  req.data.access = currentAccess;
  
  // Find previous consent
  const previousConsents = await srv.run(/*...*/);
  
  if (previousConsents.length > 0) {
    const previousConsent = previousConsents[0];
    
    // Merge with previous consent's merged_access
    const previousMergedAccess = previousConsent.merged_access || previousConsent.access || {};
    
    const mergedAccess = {
      ...previousMergedAccess,
      ...currentAccess,
      scope: mergeScopes(previousMergedAccess.scope, currentAccess.scope),
      authorization_details: mergeAuthorizationDetails(/*...*/),
      // ... other merged fields
    };
    
    req.data.merged_access = mergedAccess;
  } else {
    // First consent - merged_access is same as access
    req.data.merged_access = currentAccess;
  }
});
```

### 3. **Chain Pattern Maintained**

The elegant chain pattern is preserved:
- **Consent 1**: `merged_access = access` (base case)
- **Consent 2**: `merged_access = merge(Consent1.merged_access, Consent2.access)`
- **Consent 3**: `merged_access = merge(Consent2.merged_access, Consent3.access)`

Each consent only needs to merge with its immediate predecessor's `merged_access` field.

## Implementation Details

### CDS Model (`db/grants.cds`)

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
  
  // Regular field populated on insert (not virtual)
  merged_access: ConsentAccess;
}

// Grants view can now use merged_access in projections
entity Grants as projection on Consents {
  key grant as ID,
  max(request.client_id) as client_id : String,
  max(merged_access.scope) as scope : String,
  max(merged_access.authorization_details) as authorization_details : array of Map,
  merged_access as access : ConsentAccess,
} group by grant;
```

### Handler Logic (`srv/authorization/handlers.consent.tsx`)

**Key Changes:**
1. **Removed**: Virtual field computation in `srv.on("READ")`
2. **Added**: Field population in `srv.before("POST")`
3. **Simplified**: No recursive computation needed
4. **Maintained**: Helper functions for merging scopes and authorization details

## Benefits of This Approach

### 1. **CDS Compatibility** ✅
- Works with CDS projections and aggregations
- No virtual field limitations
- Standard CDS patterns

### 2. **Performance** ✅
- Computed once during insert
- No computation on read
- Faster query performance

### 3. **Simplicity** ✅
- Chain pattern maintained
- Each consent merges with immediate predecessor
- Clean separation of concerns

### 4. **Data Integrity** ✅
- Merged data stored persistently
- No risk of computation errors on read
- Consistent results

## Chain Pattern Example

```
Consent 1:
  access: { scope: "read", auth_details: [fs] }
  merged_access: { scope: "read", auth_details: [fs] }

Consent 2:
  access: { scope: "write", auth_details: [api] }
  merged_access: { scope: "read write", auth_details: [fs, api] }
  (merged from Consent1.merged_access + Consent2.access)

Consent 3:
  access: { scope: "delete", auth_details: [db] }
  merged_access: { scope: "read write delete", auth_details: [fs, api, db] }
  (merged from Consent2.merged_access + Consent3.access)
```

## Technical Implementation

### Merge Logic
```tsx
// Simple merge: previous merged_access + current access
const mergedAccess = {
  ...previousMergedAccess,
  ...currentAccess,
  scope: mergeScopes(previousMergedAccess.scope, currentAccess.scope),
  authorization_details: mergeAuthorizationDetails(
    previousMergedAccess.authorization_details || [],
    currentAccess.authorization_details || []
  ),
  granted_at: currentAccess.granted_at,
  merge_history: [
    ...(previousMergedAccess.merge_history || []),
    { consent_id: previousConsent.ID, merged_at: new Date().toISOString() }
  ]
};
```

### Helper Functions
- `mergeScopes()`: Combines scope strings, removes duplicates
- `mergeAuthorizationDetails()`: Merges by type, combines arrays

## Result

- ✅ **CDS Compatible**: Works with projections and aggregations
- ✅ **Performant**: Computed once, stored persistently
- ✅ **Elegant**: Chain pattern maintained
- ✅ **Simple**: No complex virtual field logic
- ✅ **Reliable**: Consistent data storage

This approach combines the elegance of the chain pattern with CDS-native field population, solving the virtual field limitation while maintaining all the benefits of the original design.
