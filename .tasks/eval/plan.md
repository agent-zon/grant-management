# Authorization Evaluation Service Implementation

## Overview

Create a new CDS service `evaluation-service` in `srv/` that implements the Authorization API (AuthZEN) specification. The service will evaluate access requests by querying grants through the grant management service, matching authorization details against requested resources and actions.

## Implementation Steps

### 1. Create Service Structure

- **Location**: `srv/evaluation-service/`
- **Files to create**:
  - `evaluation-service.cds` - CDS service definition
  - `evaluation-service.tsx` - Service implementation class
  - `handler.evaluation.tsx` - Access Evaluation API handler
  - `handler.evaluations.tsx` - Access Evaluations API handler (batch)
  - `handler.metadata.tsx` - Metadata discovery endpoint handler

### 2. CDS Service Definition (`evaluation-service.cds`)

- Define service with path `/access/v1`
- Define action `evaluation` for single evaluation (POST)
- Define action `evaluations` for batch evaluation (POST)
- Define function `metadata` for discovery (GET)
- Follow AuthZEN spec structure:
  - Request: `subject`, `action`, `resource`, `context` (optional)
  - Response: `decision` (boolean), `context` (optional)

### 3. Service Implementation (`evaluation-service.tsx`)

- Extend `cds.ApplicationService`
- Register handlers for evaluation endpoints
- Connect to `GrantsManagementService` for grant queries
- Handle authentication/authorization (OAuth 2.0 recommended per spec)

### 4. Grant Matching Logic (`utils/grant-matcher.tsx`)

- Extract server location from resource URI (e.g., `https://mcp.example.com/tools` → `https://mcp.example.com`)
- Extract resource type from resource URI (e.g., `tools` from path)
- Query grants matching:
  - `client_id` (from authenticated request)
  - `subject` (from request)
  - `status = 'active'`
- Filter authorization_details by:
  - Server location match (from `locations` or `server` field)
  - Action match (from `actions` array)
  - Resource type match (from `type`, `resources`, or tool names)
- Support agentic context for wildcard matching (if provided)
- Return first matching grant or null

### 5. Evaluation Handler (`handler.evaluation.tsx`)

- Parse AuthZEN request format:

  ```typescript
  {
    subject: { type: string, id: string, properties?: object },
    action: { name: string, properties?: object },
    resource: { type: string, id: string, properties?: object },
    context?: object
  }
  ```

- Extract `client_id` from authenticated user context
- Call grant matcher to find authorizing grant
- Return decision:
  - `{ decision: true, context?: object }` if grant found
  - `{ decision: false, context?: object }` if no grant found
- Handle errors per spec (400, 401, 403, 500)

### 6. Evaluations Handler (`handler.evaluations.tsx`)

- Support batch evaluation with `evaluations` array
- Support default values for shared subject/action/resource/context
- Support evaluation semantics: `execute_all`, `deny_on_first_deny`, `permit_on_first_permit`
- Return array of decisions matching request order

### 7. Metadata Handler (`handler.metadata.tsx`)

- Implement `GET /.well-known/authzen-configuration`
- Return metadata per spec:
  ```json
  {
    "policy_decision_point": "https://host",
    "access_evaluation_endpoint": "https://host/access/v1/evaluation",
    "access_evaluations_endpoint": "https://host/access/v1/evaluations",
    "capabilities": []
  }
  ```

### 8. Integration

- Add service to `srv/index.cds`:
  ```cds
  using from './evaluation-service/evaluation-service.cds';
  ```

### 9. Task Documentation

- Create task folder: `.tasks/authorization-evaluation-service/`
- Add required files:
  - `TASK_DEFINITION.md` - Task goals and requirements
  - `STATUS.md` - Progress tracking
  - `CHANGELOG.md` - Change log
  - `NOTES.md` - Implementation notes
  - `docs/java-example.md` - Java implementation example provided by user

## Key Implementation Details

### Grant Query Pattern

```typescript
// Query active grants for subject and client
const grants = await grantService.read(Grants).where({
  subject: requestSubject,
  client_id: clientId,
  status: "active",
});

// Expand authorization_details
const grantsWithDetails = await grantService.read(
  Grants,
  grants.map((g) => g.id),
  {
    $expand: "authorization_details",
  }
);

// Match authorization details
const matchingGrant = grantsWithDetails.find((grant) =>
  grant.authorization_details.some((detail) =>
    matchesResource(detail, resourceUri, action, context)
  )
);
```

### Resource URI Parsing

- Server location: Extract `scheme://authority` from URI
- Resource type: Extract last path segment or use full URI as fallback
- Handle both URI format (`https://server/path`) and simple identifiers

### Authorization Details Matching

- Match by `type` (mcp, api, fs, database, etc.)
- Match by `locations` array containing server location
- Match by `actions` array containing requested action
- Match by `resources` array or tool names (for MCP type)
- Support wildcard matching when agentic context provided

## Files to Create/Modify

### New Files

- `srv/evaluation-service/evaluation-service.cds`
- `srv/evaluation-service/evaluation-service.tsx`
- `srv/evaluation-service/handler.evaluation.tsx`
- `srv/evaluation-service/handler.evaluations.tsx`
- `srv/evaluation-service/handler.metadata.tsx`
- `srv/evaluation-service/utils/grant-matcher.tsx`
- `.tasks/authorization-evaluation-service/TASK_DEFINITION.md`
- `.tasks/authorization-evaluation-service/STATUS.md`
- `.tasks/authorization-evaluation-service/CHANGELOG.md`
- `.tasks/authorization-evaluation-service/NOTES.md`
- `.tasks/authorization-evaluation-service/docs/java-example.md`

### Modified Files

- `srv/index.cds` - Add evaluation service import

## Testing Considerations

- Test single evaluation endpoint
- Test batch evaluation with defaults
- Test evaluation semantics (short-circuiting)
- Test metadata discovery
- Test error handling (invalid requests, unauthorized, etc.)
- Test grant matching with various authorization detail types
- Test resource URI parsing edge cases
