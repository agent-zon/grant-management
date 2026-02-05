# Status: Agent MCP Destinations (Phase 1)

**Created**: 2026-02-04
**Last Updated**: 2026-02-05
**Current Status**: TESTING_PASSED

## Summary

Implementing Phase 1 of Agent MCP Destinations - enabling each agent to stream MCP requests through GrantToolsService to exactly one remote MCP server via SAP Destination.

## Current Phase

**Testing Passed** - Moved to naming convention, direct tool exposure, tests passing

## Progress

| Component | Status | Description  |Notes|
|-----------|--------|-------|-------|
| Branch setup | ✅ Complete | |`task/agent-servers-mcp-destinations` |
| Task documentation | ✅ Complete || TASK_DEFINITION.md, STATUS.md, CHANGELOG.md, NOTES.md |
| CDS model update | ✅ Complete | |Added `mcp` config (McpConfig type) to Agents entity |
| Tests | ✅ Complete | Write tests for destination-backed MCP |`test/mcp-destination.test.js` created |
| Transport helper | ✅ Complete |Bidirectional streaming endpoint | `handler.destination.tsx` with Cloud SDK integration |
| Tool discovery | ✅ Complete |List remote tools via destination | `handler.tools.tsx` discovers remote tools |
| Tool execution | ✅ Complete |callTool forwarding | `handler.mcp.tsx` proxies callTool to remote |

## Blockers

None currently.

## Next Steps

1. Update CDS model to add `Agents.mcp` config shape
2. Write tests that exercise destination-backed MCP behavior
3. Implement transport helper
4. Implement tool discovery
5. Implement tool execution proxy

---

## Status History

### 2026-02-04 - Initial Setup

- Created branch `task/agent-servers-mcp-destinations`
- Created task documentation structure
- Status: IN_PROGRESS

### 2026-02-05 - Naming Convention & Direct Tool Exposure

- Moved to destination name convention (no CAP DB storage for MCP config)
- Remote tools now exposed directly with original names
- Removed `list-remote-tools` and `remote-tool-proxy` intermediate tools
- Tests passing: 3 pass, 0 fail, 1 skipped (12.27s)
- Status: TESTING_PASSED
