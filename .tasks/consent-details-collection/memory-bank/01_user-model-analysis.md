# User Model Analysis and Intent

**Created**: 2025-10-04  
**Last Updated**: 2025-10-04  
**Category**: [ANALYSIS]  
**Timeline**: 01 of XX - Understanding user's draft model intent

## User's Draft Model Intent

### What I understand from your draft:

```cds
access: {
  scope: String @cds.on.insert: [$self.scope, previous_consent.scope];
  authorization_details: array of Map @cds.on.insert: [$self.authorization_details, previous_consent.authorization_details];
  client_id: String @cds.on.insert: [$self.client_id, previous_consent.client_id];
  risk_level: String @cds.on.insert: [$self.risk_level, previous_consent.risk_level];
  requested_actor: String @cds.on.insert: [$self.requested_actor, previous_consent.requested_actor];
  granted_at: String @cds.on.insert: [$self.granted_at, previous_consent.granted_at];
  duration: Timespan @cds.on.insert: [$self.duration, previous_consent.duration];
}
```

### Your Intent (as I understand it):
1. **Structured Access Field**: Instead of a generic Map, you want a structured object with specific fields
2. **CDS-Level Merging**: Use CDS annotations to automatically merge fields from previous consent
3. **Comprehensive Capture**: Include all relevant consent and authorization details
4. **Automatic Inheritance**: Fields should automatically inherit/merge from previous_consent

### Issues with Current Draft:
1. **CDS Syntax**: The `@cds.on.insert: [$self.field, previous_consent.field]` syntax isn't standard CDS
2. **Reference Resolution**: `previous_consent` needs to be properly defined as an association
3. **Merge Logic**: CDS doesn't have built-in array merging - needs custom logic

## Recommended Approach:

### Phase 1: Fix Authorization Details Inputs
- Add missing fields from fs, database, api types as hidden inputs
- Ensure complete capture of all authorization detail fields

### Phase 2: Implement Proper Access Structure
- Use structured type instead of generic Map
- Implement merge logic in handlers (not CDS annotations)
- Maintain your intended structure but with proper CDS syntax

## Next Steps:
1. First fix the authorization details inputs (missing fs, database, api fields)
2. Then implement proper access field structure with handler-based merging
3. Update grants view to use structured access field
