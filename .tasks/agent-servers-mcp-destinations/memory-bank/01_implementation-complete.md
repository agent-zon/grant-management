# Implementation Complete: Agent MCP Destinations (Phase 1)

**Created**: 2026-02-04
**Last Updated**: 2026-02-04
**Category**: [IMPLEMENTATION]
**Timeline**: 01 of N - Implementation phase complete

## Overview

Phase 1 implementation enables each agent to connect to exactly one remote MCP server via SAP Destination. The implementation includes CDS model changes, destination transport helper, tool discovery, and tool execution proxy.

## Files Created/Modified

### New Files

1. **`srv/grant-tools-service/handler.destination.tsx`**
   - Destination transport helper
   - Functions: `createDestinationTransport`, `createDestinationClient`, `discoverRemoteTools`, `callRemoteTool`

2. **`test/mcp-destination.test.js`**
   - Test file for destination-backed MCP behavior

### Modified Files

1. **`db/discovery.cds`**
   - Added `McpDestinationStrategy` enum
   - Added `McpConfig` type
   - Added `mcp: McpConfig` to `Agents` entity

2. **`srv/grant-tools-service/handler.tools.tsx`**
   - Now loads agent `mcp` config
   - Discovers remote tools via destination if configured
   - Passes `agentMcp` to downstream handlers

3. **`srv/grant-tools-service/handler.mcp.tsx`**
   - Registers proxy tools for remote tools
   - Forwards `callTool` to remote MCP server
   - Added `jsonSchemaToZodShape` helper

4. **`package.json`**
   - Added `test:mcp-destination` script

## Architecture

```
Agent Request
    │
    ▼
GrantToolsService
    │
    ├── handler.meta.tsx (extracts agent ID)
    │
    ├── handler.tools.tsx
    │   ├── Load local tools from DB
    │   ├── Load agent.mcp config
    │   └── IF mcp.kind === 'destination':
    │       └── discoverRemoteTools() → Remote MCP Server
    │
    ├── handler.mcp.tsx
    │   ├── Register push-authorization-request
    │   └── FOR each remote tool:
    │       └── Register proxy that calls callRemoteTool()
    │
    └── StreamableHTTPServerTransport
        └── Handles MCP protocol
```

## Key Patterns

### Destination Header Merging

```typescript
// Order (destination wins):
// 1. Forward inbound headers (exclude content-length)
// 2. Destination headers
// 3. Destination authTokens http_header
const headers = {
  ...forwardedHeaders,
  ...destinationHeaders,
  ...authFromTokens,
};
```

### Selection Strategy

```typescript
function getSelectionStrategy(strategy: string): DestinationSelectionStrategy {
  switch (strategy) {
    case "alwaysProvider": return alwaysProvider;
    case "alwaysSubscriber": return alwaysSubscriber;
    case "subscriberFirst":
    default: return subscriberFirst;
  }
}
```

### Remote Tool Discovery

```typescript
// Paginate through all tools from remote server
let cursor: string | undefined;
do {
  const result = await client.listTools({ cursor });
  for (const tool of result.tools || []) {
    tools.push({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      destinationName,
      strategy,
      isRemote: true,
    });
  }
  cursor = result.nextCursor;
} while (cursor);
```

## Known Limitations (Phase 1)

1. **Tool Name Collisions**: Remote tool names may collide with local tools. Currently, last-write-wins (remote overwrites local).

2. **Connection Per Call**: Each `callTool` creates a new client connection. This is simpler but may have performance implications for high-volume scenarios.

3. **No Aggregation**: Phase 1 only supports one destination per agent. Aggregation across multiple destinations is planned for Phase 2.

## Testing

Run tests with:

```bash
npm run test:mcp-destination
```

Requires:
- `TEST_PASSWORD` environment variable
- Hybrid profile credentials (`cds bind --profile hybrid`)
- Valid MCP destination (set via `TEST_MCP_DESTINATION` env var)

## Next Steps

- Run integration tests with real MCP destination
- Consider connection pooling for high-volume scenarios
- Phase 2: Aggregator MCP for multiple destinations per agent
