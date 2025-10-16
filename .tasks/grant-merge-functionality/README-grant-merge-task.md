# Grant Merge Functionality Task

## Overview
Implementation of OAuth 2.0 Grant Management "merge" action to allow editing existing grants by adding new permissions while preserving existing ones.

## Task Structure
Following memory-bank methodology in `.tasks/grant-merge-functionality/`:
- **TASK_DEFINITION.md** - Requirements and acceptance criteria
- **STATUS.md** - Current progress tracking  
- **CHANGELOG.md** - Chronological development log
- **NOTES.md** - Research findings and investigation results
- **memory-bank.md** - Reusable patterns and learnings

## Requirements Summary

### OAuth 2.0 Specification Compliance
Based on `.tasks/grant-mangment/grant-mangment.md`:
- Support `grant_management_action=merge` parameter
- Require existing `grant_id` for merge operations
- Merge new permissions with existing grant permissions
- Create new consent record that replaces grant content

### Technical Implementation
1. **Authorize Endpoint Enhancement**: Handle merge action parameter
2. **Grant State Retrieval**: Load current permissions as form defaults
3. **Consent Form Pre-population**: Show existing + new requirements  
4. **Merged Consent Creation**: New record with combined permissions
5. **Automatic Update**: Leverage existing grants table calculated view

### Integration Points
- **Current Grants Table**: Already functional with calculated view
- **Authorization Flow**: PAR → Authorize → Consent → Token
- **UI Components**: Existing consent form and grant management interface
- **Data Model**: Consents, AuthorizationRequests, Grants entities

## Success Criteria
- Users can edit existing grants by adding new permissions
- Current permissions preserved and displayed as defaults
- New consent records properly merge and replace grant content
- Grants table automatically reflects updated permissions
- Maintains OAuth 2.0 Grant Management specification compliance

## Next Steps
1. Research current authorize endpoint implementation
2. Design merge action flow and form pre-population
3. Implement merge functionality in authorization process
4. Test end-to-end grant editing capability

---
*Task created October 2, 2025 on branch `task-grant-merge-functionality-2025-10-02`*
