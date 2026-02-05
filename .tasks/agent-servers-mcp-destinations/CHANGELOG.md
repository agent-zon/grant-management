# Changelog: Agent MCP Destinations (Phase 1)

**Created**: 2026-02-04
**Last Updated**: 2026-02-04

All notable changes for this task are documented here. Entries are append-only.

---

## [2026-02-04] - Initial Setup

### Added

- Created branch `task/agent-servers-mcp-destinations`
- Created task folder structure under `.tasks/agent-servers-mcp-destinations/`
- Created required documentation files:
  - `TASK_DEFINITION.md` - Task goals, requirements, and acceptance criteria
  - `STATUS.md` - Current status and progress tracking
  - `CHANGELOG.md` - This changelog file
  - `NOTES.md` - Investigation notes and findings
- Created subfolders:
  - `memory-bank/` - Reusable knowledge and learnings
  - `artifacts/` - Code artifacts and prototypes
  - `docs/` - Drop-in folder for specs and references

### Context

This task implements Phase 1 of Agent MCP Destinations, enabling each agent to connect to exactly one remote MCP server via SAP Destination. The implementation follows the reference in `srv/grant-tools-service/handler.proxy.tsx`.

### Decision

Following the test-first approach outlined in the plan:
1. Update CDS model first (introduce `Agents.mcp` config shape)
2. Write tests next (start red)
3. Implement incrementally (transport → discovery → proxy)

---

## [2026-02-04] - CDS Model Update

### Added

- Added `McpDestinationStrategy` enum type to `db/discovery.cds`:
  - `alwaysProvider`: Always use provider account destination
  - `alwaysSubscriber`: Always use subscriber account destination
  - `subscriberFirst`: Try subscriber first, fallback to provider (default)

- Added `McpConfig` type to `db/discovery.cds`:
  - `kind`: String, default 'destination' (only type supported in Phase 1)
  - `name`: String, the SAP Destination name
  - `strategy`: McpDestinationStrategy, default 'subscriberFirst'

- Added `mcp: McpConfig` field to `Agents` entity

### Context

This CDS model change enables each agent to be configured with exactly one MCP destination. The projection in `grant-tools-service.cds` automatically exposes the new `mcp` field.

---

## [2026-02-04] - Test File Created

### Added

- Created `test/mcp-destination.test.js` - Test file for destination-backed MCP behavior
- Added npm script `test:mcp-destination` to `package.json`

### Test Coverage

- Agent creation with `mcp` config
- MCP client connection to GrantToolsService
- Tool listing (expects remote tools from destination)
- Tool call forwarding (expects proxy to remote MCP server)

---

## [2026-02-04] - Destination Transport Helper

### Added

- Created `srv/grant-tools-service/handler.destination.tsx`:
  - `createDestinationTransport()` - Creates StreamableHTTPClientTransport for destination
  - `createDestinationClient()` - Creates MCP Client connected via destination
  - `discoverRemoteTools()` - Lists tools from remote MCP server with pagination
  - `callRemoteTool()` - Forwards tool calls to remote MCP server
  - Proper header merging (forward + destination + auth tokens)
  - Selection strategy support (alwaysProvider, alwaysSubscriber, subscriberFirst)

### Reference

Implementation follows patterns from `handler.proxy.tsx` for destination resolution and header handling.

---

## [2026-02-04] - Tool Discovery Update

### Modified

- Updated `srv/grant-tools-service/handler.tools.tsx`:
  - Loads agent data including `mcp` config
  - If agent has `mcp.kind === 'destination'`, discovers remote tools
  - Remote tools added to tools map with proxy metadata
  - Graceful error handling (local tools still work if remote fails)
  - Passes `agentMcp` config to downstream handlers

---

## [2026-02-04] - Tool Execution Proxy

### Modified

- Updated `srv/grant-tools-service/handler.mcp.tsx`:
  - Registers proxy tools for each discovered remote tool
  - Proxy tools use native names (no namespace prefix in Phase 1)
  - Forwards `callTool` to remote MCP server via destination transport
  - Added `jsonSchemaToZodShape()` helper for schema conversion
  - Proper error handling with MCP-compliant error responses

### Technical Notes

- Remote tool calls create new client connection per call
- Connection is properly closed after each call
- Errors surface as `isError: true` MCP responses, not transport failures

---

## [2026-02-04] - Refactored to Runtime Approach

### Changed

- **Removed prefetching**: Tools are no longer discovered at startup
- **Runtime discovery**: Added `list-remote-tools` tool for on-demand discovery
- **Runtime execution**: Added `remote-tool-proxy` tool for forwarding calls
- **Simplified handler.tools.tsx**: No longer connects to remote MCP server

### Removed

- `discoverRemoteTools()` function from `handler.destination.tsx`
- `RemoteToolInfo` type (no longer needed)
- Tool prefetching logic from `handler.tools.tsx`

### Why

Runtime approach is simpler and avoids upfront connection overhead. Tools are discovered on-demand when the user explicitly calls `list-remote-tools`, and calls are proxied through `remote-tool-proxy`.

### New Tool Interface

- **list-remote-tools**: Returns available tools from remote MCP server
- **remote-tool-proxy**: Forwards tool calls with `tool_name` and `tool_arguments` parameters
