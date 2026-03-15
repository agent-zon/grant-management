# Grant-Native Rule-Based Tool Access

**Created**: 2026-03-14  
**Last Updated**: 2026-03-14  
**Category**: [FEATURE] [MCP] [AUTHORIZATION]  
**Timeline**: 02 of N — Rule-based tool access in authorization details

## Overview

Policy lives directly in the grant's authorization_details. No external ODRL or agent-policy dependency. The agent can request access to specific tools or use a rule pattern stored as a key in the `tools` Map within authorization_details.

## Pattern Syntax

| Pattern | Meaning | Example Match |
|---------|---------|---------------|
| `*` | All tools | `todos.create`, `messages.read`, anything |
| `prefix.*` | All tools starting with `prefix.` | `todos.create`, `todos.delete` |
| `exact.name` | Exact tool name | only `exact.name` |

## Flow

### No grant exists (default: ask consent for all)
1. All tools registered as disabled
2. Agent calls `push-authorization-request` (specific tools or rule)
3. PAR created → consent UI shown → user approves → grant stored
4. Tools enabled based on grant

### Agent requests specific tools
```
push-authorization-request({ tools: ["todos.create", "todos.delete"] })
→ PAR: authorization_details = [{ type: "mcp", tools: { "todos.create": null, "todos.delete": null } }]
→ Consent UI shows individual checkboxes
→ User approves → grant stores { "todos.create": true, "todos.delete": true }
→ Only those two tools enabled
```

### Agent requests rule
```
push-authorization-request({ rule: "*" })
→ PAR: authorization_details = [{ type: "mcp", tools: { "*": null } }]
→ Consent UI shows "All Tools" rule card
→ User approves → grant stores { "*": true }
→ All tools enabled (including future tools)
```

## Key Files

| File | Role |
|------|------|
| `srv/grant-tools-service/tool-pattern.tsx` | `matchToolPattern()` — shared glob matching utility |
| `srv/grant-tools-service/handler.tools.tsx` | `push-authorization-request` tool — accepts `tools[]` and/or `rule` |
| `srv/grant-tools-service/handler.filter.tsx` | `enableDisabledTools()` — pattern-aware tool enable/disable |
| `srv/authorization-service/handler.authorize.tsx` | Consent UI — detects rule requests, shows banner |
| `srv/authorization-service/details/mcp.tsx` | MCP consent card — renders rules and tools separately |
