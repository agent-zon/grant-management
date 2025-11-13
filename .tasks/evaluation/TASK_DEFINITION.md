# Task Definition: Authorization Evaluation Service

**Created**: 2025-01-27  
**Status**: In Progress

## Goal

Implement an Authorization API (AuthZEN) evaluation service as a new CDS service that uses grant management to evaluate access requests. The service will expose evaluation endpoints per the Authorization API 1.0 specification and integrate with the existing grant management system.

## Requirements

1. Create a new CDS service `evaluation-service` in `srv/` that implements the Authorization API (AuthZEN) specification
2. Implement Access Evaluation API endpoint (POST /access/v1/evaluation)
3. Implement Access Evaluations API endpoint (POST /access/v1/evaluations) for batch evaluation
4. Implement metadata discovery endpoint (GET /.well-known/authzen-configuration)
5. Query authorization_details directly instead of querying grants first
6. Match authorization details by:
   - Type (mcp, api, fs, database, etc.)
   - Server location (for MCP) or locations array
   - Actions array containing requested action
   - Tools map (for MCP) or resources array
   - Associated consent/request with matching client_id and subject
   - Active grant status

## Acceptance Criteria

- [ ] Service exposes `/access/v1/evaluation` endpoint following AuthZEN spec
- [ ] Service exposes `/access/v1/evaluations` endpoint for batch evaluation
- [ ] Service exposes `/.well-known/authzen-configuration` for metadata discovery
- [ ] Evaluation queries authorization_details directly with proper matching
- [ ] Returns `{ decision: true/false, context?: object, grant_id?: string }`
- [ ] Handles errors per spec (400, 401, 403, 500)
- [ ] Supports evaluation semantics (execute_all, deny_on_first_deny, permit_on_first_permit)
- [ ] Service integrated into `srv/index.cds`

## References

- Authorization API 1.0 specification (`.cursor/oauth/authorization-api.md`)
- Java implementation example (`.tasks/evaluation/docs/imp-example.java`)
- Grant Management Protocol Alignment (MDC Rule)
