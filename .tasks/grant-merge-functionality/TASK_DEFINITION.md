# Task Definition: Grant Merge Functionality

## Task Goals
Implement grant editing functionality using OAuth 2.0 Grant Management "merge" action, allowing users to modify existing grants by adding new requirements while preserving existing permissions.

## Requirements

### 1. Research Phase
- Study OAuth 2.0 Grant Management merge action specification from grant-management.md
- Understand current authorize endpoint flow and consent creation process
- Analyze how to pre-populate authorization form with existing grant data

### 2. Implementation Phase
- Modify authorize endpoint to handle `grant_management_action=merge`
- Pre-populate consent form with current grant state as default values
- Allow user to add new requirements to existing permissions
- Create new consent record that automatically replaces grant content
- Ensure proper integration with existing grants table calculated view

## Acceptance Criteria
- [ ] Authorize endpoint supports `grant_management_action=merge` parameter
- [ ] When merge action called with grant_id, form shows current grant state as defaults
- [ ] User can add new requirements to existing permissions
- [ ] New consent record created with merged permissions
- [ ] Grants table automatically reflects updated content via calculated view
- [ ] Proper error handling for invalid grant_ids
- [ ] Integration with existing authorization flow maintained

## Context
- Building on successful grants table implementation
- Following OAuth 2.0 Grant Management specification
- Current flow: PAR → Authorize → Consent → Grants view
- Need to extend authorize flow to support merge action

## Success Metrics
- Users can edit existing grants by adding new permissions
- Current permissions preserved during merge process
- New consent records properly replace grant content
- UI shows updated grant information immediately
- Maintains security and authorization controls

## Technical Approach
1. **Authorize Endpoint Enhancement**: Handle merge action parameter
2. **Grant State Retrieval**: Load current grant permissions as form defaults
3. **Consent Form Pre-population**: Show existing + new requirements
4. **Consent Creation**: New record with merged permissions
5. **Automatic Update**: Grants view reflects changes via GROUP BY logic

## Timeline
- Research Phase: Understand merge action specification and current flow
- Implementation Phase: Extend authorize endpoint and consent creation
- Testing Phase: Validate merge functionality end-to-end

Created: 2025-10-02
