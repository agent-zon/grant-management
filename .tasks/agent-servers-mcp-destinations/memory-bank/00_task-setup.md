# Task Setup

**Created**: 2026-02-04
**Last Updated**: 2026-02-04
**Category**: [SETUP]
**Timeline**: 00 of N - Initial setup phase

## Overview

Initial setup for the Agent MCP Destinations (Phase 1) task, including branch creation and documentation structure.

## Setup Completed

### Branch

- Branch name: `task/agent-servers-mcp-destinations`
- Created from: `task/apg-doc-reshape`

### Task Documentation Structure

```
.tasks/agent-servers-mcp-destinations/
├── TASK_DEFINITION.md  # Task goals, requirements, acceptance criteria
├── STATUS.md           # Current status and progress tracking
├── CHANGELOG.md        # Chronological log of changes
├── NOTES.md            # Investigation notes and findings
├── memory-bank/        # Reusable knowledge (this folder)
│   └── 00_task-setup.md
├── artifacts/          # Code artifacts and prototypes
└── docs/               # Drop-in folder for specs and references
```

## Key References from Plan

### Files to Modify

1. `db/discovery.cds` - Add `mcp` config to Agents entity
2. `srv/grant-tools-service/grant-tools-service.cds` - Expose MCP config
3. `srv/grant-tools-service/handler.tools.tsx` - Tool discovery
4. `srv/grant-tools-service/handler.mcp.tsx` - Tool execution proxy

### Reference Implementation

- `srv/grant-tools-service/handler.proxy.tsx` - Use as conceptual guide for streaming proxy

### Test Style References

- `test/mcp-service.test.js`
- `test/grant-tools.test.js`

## Execution Order (from Plan)

1. **Update CDS model first** - Introduce `Agents.mcp` config shape
2. **Write tests next** - Exercise destination-backed MCP behavior (start red)
3. **Update model if necessary** - When tests expose mismatches
4. **Implement incrementally** - Transport helper → discovery → proxy execution

## Next Steps

Proceed to CDS model update to add the `Agents.mcp` configuration structure.
