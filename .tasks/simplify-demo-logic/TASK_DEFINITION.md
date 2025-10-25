# Task: Simplify Demo Service Logic

**Created**: 2025-10-25
**Status**: In Progress
**Branch**: cursor/simplify-demo-logic-with-endpoint-driven-steps-2cfe

## Objective
Simplify the demo service logic by creating specific endpoints for each permission step and removing the xstate dependency.

## Requirements
1. Create specific endpoints for each step:
   - `/permissions/analysis-request` - Request analysis permissions
   - `/permissions/deployment-request` - Request deployment permissions  
   - `/permissions/subscription-request` - Request subscription permissions
2. Each endpoint triggers the next one in a callback flow
3. Remove xstate dependency and state machine logic
4. Implement handlers similar to grant-management handlers
5. Keep UI logic using HTMX features (replacement navigation, etc.)
6. No custom JavaScript code where possible

## Acceptance Criteria
- [ ] Three new permission endpoints are functional
- [ ] Each endpoint creates appropriate authorization request
- [ ] Callback flow automatically progresses through steps
- [ ] xstate dependency is removed
- [ ] UI uses HTMX for navigation and updates
- [ ] Code is clean and self-explanatory
