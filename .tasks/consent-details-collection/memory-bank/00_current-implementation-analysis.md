# Current Implementation Analysis

**Created**: 2025-10-04  
**Last Updated**: 2025-10-04  
**Category**: [ANALYSIS]  
**Timeline**: 00 of XX - Initial analysis of current consent handling

## Overview

Analysis of the current consent handling implementation to understand the structure and identify integration points for enhanced consent details collection.

## Current Consent Entity Structure

### Consents Entity (`db/grants.cds`)
```cds
entity Consents:cuid,managed {
  grant: String ; // Store the grant ID directly
  request: Association to AuthorizationRequests ;
  scope: String; 
  authorization_details: array of Map;
  duration: Timespan;
  subject: User ;//@cds.on.insert: $user;
  previous_consent: Association to Consents; // Reference to the previous consent for this grant
}
```

### Grants View (Projection on Consents)
```cds
entity Grants as projection on Consents {
  key grant as ID,
  max(request.client_id) as client_id : String,
  max(request.risk_level) as risk_level : String,
  'active' as status : String,
  max(createdAt) as granted_at : Timestamp,
  max(subject) as subject : User,
  max(request.requested_actor) as actor : String,
  max(scope) as scope : String,
  authorization_details as authorization_details : array of Map,
} group by grant;
```

## Current Authorization Details Structure

### AuthorizationDetailRequest Type
```typescript
type AuthorizationDetailRequest: MCPToolAuthorizationDetailRequest, 
  FileSystemAuthorizationDetailRequest, 
  DatabaseAuthorizationDetailRequest, 
  ApiAuthorizationDetailRequest {
  type: Association to AuthorizationDetailType;
  locations: array of String;
  actions: array of String;
}
```

### Authorization Detail Types
- `mcp`: MCP tools with server, transport, tools map
- `fs`: File system with roots, permissions
- `database`: Database access with databases, schemas, tables
- `api`: API access with URLs, protocols
- `grant_management`: Grant management operations
- `file_access`, `data_access`, `network_access`: Generic access types

## Current Consent Handling Logic

### Consent Creation (`srv/authorization/handlers.consent.tsx`)
- **Merge Logic**: Finds previous consent for same grant
- **Scope Merging**: Combines existing + new scopes, removes duplicates
- **Previous Consent Linking**: Links to previous consent via `previous_consent_ID`

### Authorization Flow (`srv/authorization/handlers.authorize.tsx`)
- **Merge Detection**: Checks for `grant_management_action === "merge"`
- **Existing Grant Loading**: Loads existing grant for merge operations
- **Authorization Details Rendering**: Uses templates for each type

## Key Findings

### ✅ Existing Capabilities
1. **Consent Merging**: Already implemented for scopes
2. **Previous Consent Tracking**: `previous_consent` association exists
3. **Authorization Details Storage**: `authorization_details: array of Map` in Consents
4. **Grant View**: Projection that aggregates consent data

### 🔧 Required Enhancements
1. **Access Field**: Need to add `access` field to Consents entity
2. **Complete Grant Capture**: Show all grant values as inputs in consent form
3. **Enhanced Merging**: Extend merge logic to handle all fields, not just scopes
4. **CDS Insert Trigger**: Implement @cds.insert trigger for automatic merging

## Implementation Strategy

### Phase 1: Consent Entity Enhancement
- Add `access` field to Consents entity
- Implement CDS insert trigger for comprehensive merging

### Phase 2: Consent Form Enhancement
- Modify handlers.authorize.tsx to show all grant values as inputs
- Ensure complete audit trail capture

### Phase 3: Grants View Update
- Update grants view to use new access field
- Maintain backward compatibility

## Technical Considerations

- **Data Migration**: Need to handle existing consents without access field
- **Merge Conflicts**: How to handle conflicting authorization details
- **Performance**: Impact of enhanced merging on consent creation
- **Audit Trail**: Ensure complete tracking of consent decisions
