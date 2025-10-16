# Notes: Consent Details Collection

**Created**: 2025-10-04  
**Last Updated**: 2025-10-04

## Key Requirements Analysis

### A. Consent Form Enhancement
- Need to show all grant values as inputs in handlers.authorize.tsx
- Inputs should be present even if not editable (for audit trail)
- Must record complete consent details

### B. Consent Access Field
- Add "access" field to consent entity
- Implement @cds.insert trigger for automatic merging
- Merge with previous consent if exists (all fields)

### C. Grants View Update
- Update grants view to use access field instead of current implementation
- Ensure seamless transition

## Technical Notes

- Current handlers.authorize.tsx already handles merge scenarios (lines 22-32)
- Existing grant loading logic can be leveraged
- Need to examine consent entity structure in CDS models
- Consider impact on existing grant management API endpoints

## Questions to Investigate

1. What is the current consent entity structure?
2. How are consents currently stored and retrieved?
3. What fields need to be included in the "access" field?
4. How should consent merging handle conflicts?
5. What is the current grants view implementation?

## Implementation Strategy

1. **Phase 1**: Analyze current implementation
2. **Phase 2**: Enhance consent form with all grant inputs
3. **Phase 3**: Add access field and CDS trigger
4. **Phase 4**: Update grants view
5. **Phase 5**: Testing and validation
