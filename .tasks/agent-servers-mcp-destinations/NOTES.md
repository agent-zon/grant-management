# Notes: Agent MCP Destinations (Phase 1)

**Created**: 2026-02-04
**Last Updated**: 2026-02-04

## Investigation Notes

### Reference Implementation Analysis

The primary reference for this task is `srv/grant-tools-service/handler.proxy.tsx`. Key patterns to follow:

1. **Destination Resolution**
   - Use `useOrFetchDestination({ destinationName, jwt, selectionStrategy })`
   - Selection strategies: `alwaysProvider`, `alwaysSubscriber`, `subscriberFirst`

2. **Header Merging** (order matters - destination wins)
   - Forward inbound headers (exclude `content-length`)
   - Merge `destination.headers`
   - Merge `destination.authTokens[].http_header`

3. **Transport Creation**
   - `new StreamableHTTPClientTransport(new URL(\`\${destination.url}/mcp/streaming\`), { sessionId, requestInit: { headers } })`

4. **Session Continuity**
   - Read `mcp-session-id` and pass as `sessionId`
   - Forward `last-event-id`

### Important Constraints

- **Debug Destination service is NOT a dependency**: Runtime path MUST NOT depend on `srv/debug-service/*`
- **Tool naming**: Phase 1 uses native tool names (no namespace prefix) since each agent has exactly one MCP destination

### Test References

Tests to use as style reference:
- `test/mcp-service.test.js` - End-to-end MCP listTools + tool call + consent
- `test/grant-tools.test.js` - End-to-end GrantToolsService flow

## Open Questions

- None currently

## Findings

(Will be updated as implementation progresses)
