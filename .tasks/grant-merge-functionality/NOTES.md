# Notes: Grant Merge Functionality Research

## Initial Observations

### OAuth 2.0 Grant Management Specification
From `.tasks/grant-mangment/grant-mangment.md`, the merge action specification:

**Key Requirements:**
- `grant_management_action=merge` parameter in authorization request
- Requires existing `grant_id` parameter
- Merges new permissions with existing grant permissions
- Creates new consent record that replaces grant content

**Specification Quote:**
> "update: this mode requires the client to specify a grant id using the grant_id parameter. If the parameter is present and the AS supports the grant management action update, the AS will merge the permissions consented by the user in the actual request with those which already exist within the grant."

### Current Implementation Analysis
- Authorize endpoint in `srv/routes/authorization.authorize.tsx`
- Current flow: PAR → Authorize → Consent → Token
- Grants table as calculated view over Consents with GROUP BY grant
- Need to extend authorize to handle merge action

### Key Questions for Research
1. How to retrieve current grant permissions for pre-population?
2. How to merge existing + new authorization_details?
3. How to present merged permissions in consent form?
4. How does new consent record replace grant content?
5. What happens to old consent records?

### Files to Investigate
- `srv/routes/authorization.authorize.tsx` - Current authorize implementation
- `srv/routes/authorization.consent.tsx` - Consent creation logic
- `db/grants.cds` - Grants view definition and Consents entity
- OAuth 2.0 specification details in grant-management.md

### Implementation Strategy Ideas
1. **Authorize Enhancement**: Check for merge action and grant_id
2. **Grant Retrieval**: Load existing grant permissions from Grants view
3. **Form Pre-population**: Show current + new requirements
4. **Consent Creation**: Merge permissions and create new consent
5. **Automatic Update**: Grants view reflects changes via GROUP BY

## Investigation Log

### 2025-10-02 - Current Implementation Analysis

#### Demo Client Analysis (`example/demo.tsx`)
**Current Authorization Flow:**
1. **PAR Request**: Creates AuthorizationRequests with `grant_management_action: "create"`
2. **Authorization**: User clicks "Start Authorization" → calls `/oauth-server/par`
3. **Consent Form**: Displays authorization details for user consent
4. **Token Exchange**: Completes OAuth flow

**Key Configuration:**
```javascript
"hx-vals": JSON.stringify({
  response_type: "code",
  client_id: "demo-client-app", 
  redirect_uri: `/demo/callback`,
  grant_management_action: "create", // Currently only "create"
  authorization_details: JSON.stringify(config.authorization_details),
  requested_actor: config.actor,
  scope: config.scope
})
```

#### Current Authorize Endpoint (`srv/routes/authorization.authorize.tsx`)
**Current Flow:**
1. Reads AuthorizationRequests by request_uri
2. Renders consent form with authorization details
3. No handling for merge action or existing grant pre-population

**Missing for Merge:**
- No check for `grant_management_action=merge`
- No retrieval of existing grant permissions
- No pre-population of consent form with current state

#### Required Enhancements
1. **Demo Client**: Add merge action option with grant_id selection
2. **Authorize Endpoint**: Handle merge action and pre-populate form
3. **Consent Form**: Show existing + new permissions
4. **Testing**: Create demo flow to test merge functionality

Created: 2025-10-02
