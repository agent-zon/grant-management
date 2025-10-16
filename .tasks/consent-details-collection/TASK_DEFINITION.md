# Consent Details Collection Task

**Created**: 2025-10-04  
**Last Updated**: 2025-10-04  
**Category**: [ENHANCEMENT]  
**Timeline**: Task Definition

## Overview

Implement comprehensive consent details collection to capture all grant values during user consent process and enable proper consent merging functionality.

## Goals

1. **Enhanced Consent Recording**: Show all grant values as inputs in the consent form for complete audit trail
2. **Consent Access Field**: Add "access" field to consent entity with automatic merging capabilities
3. **CDS Insert Trigger**: Implement trigger to merge consent with previous consent if exists
4. **Grants View Update**: Update grants view to utilize the new access field

## Requirements

### A. Consent Form Enhancement (handlers.authorize.tsx)
- Show all grant values as inputs (even if not editable) during consent process
- Ensure all consent details are recorded for audit purposes
- Maintain existing UI/UX while adding comprehensive data capture

### B. Consent Entity Enhancement
- Add "access" field to consent entity
- Implement @cds.insert trigger for automatic consent merging
- Merge all fields from previous consent if one exists
- Ensure data integrity during merge operations

### C. Grants View Update
- Update grants view to use the new access field
- Ensure backward compatibility during transition
- Maintain performance and functionality

## Acceptance Criteria

- [ ] All grant values are captured as inputs in consent form
- [ ] Consent entity has "access" field with proper CDS modeling
- [ ] CDS insert trigger successfully merges consent data
- [ ] Grants view uses access field for display and operations
- [ ] No breaking changes to existing functionality
- [ ] Proper error handling for merge conflicts
- [ ] Complete audit trail of consent decisions

## Technical Considerations

- Maintain OAuth 2.0 Grant Management protocol compliance
- Ensure proper data validation and sanitization
- Consider performance impact of consent merging
- Maintain referential integrity across entities
- Follow existing code patterns and architecture

## Dependencies

- Current grant management implementation
- CDS entity modeling and triggers
- HTMX form handling in authorization flow
- Grant Management API endpoints
