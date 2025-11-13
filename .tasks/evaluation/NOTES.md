# Implementation Notes: Authorization Evaluation Service

**Created**: 2025-01-27

## Key Decisions

1. **Direct Authorization Details Query**: Instead of querying grants and expanding authorization_details, we query authorization_details directly and join with consent/request/grant to verify client_id, subject, and active status.

2. **Resource URI Parsing**:

   - Extract server location: `scheme://authority` from URI
   - Extract resource type: last path segment or full URI as fallback
   - For MCP: tool name comes from resource.id

3. **Matching Logic**:

   - Type must match (mcp, api, fs, database, etc.)
   - Server must match (for MCP) OR locations array contains server
   - Actions array must contain requested action
   - For MCP: tools map must contain tool name
   - For others: resources array must contain resource identifier
   - Associated consent.request.client_id must match
   - Associated consent.subject must match
   - Associated grant.status must be 'active'

4. **Response Format**: Follow AuthZEN spec with `decision: boolean` and optional `context` object. Include `grant_id` when decision is true.

## Implementation Approach

- Use CDS query API to query AuthorizationDetails directly
- Expand consent, grant, and request associations
- Filter in-memory for complex matching (tools map, arrays)
- Return first matching authorization_detail with grant_id

## References

- Authorization API spec: `.cursor/oauth/authorization-api.md`
- Java example: `.tasks/evaluation/docs/imp-example.java`
- Grant schema: `db/grants.cds`
