# Agent Graph

The agent graph visualizes what an AI agent is authorized to access. It reads OAuth 2.0 grants (modeled as [RFC 9396 Rich Authorization Requests](https://datatracker.ietf.org/doc/html/rfc9396)) and renders a ReactFlow graph showing the agent, its resources, delegation chains to other agents, and security findings.

## Architecture overview

```
┌──────────────────────────┐     ┌──────────────────────────────────┐
│  CDS Backend (:4004)     │     │  Portal Frontend (:3000)         │
│                          │     │                                  │
│  handler.graph.tsx       │────>│  agents.graph.tsx (SSR loader)   │
│   - SELECT grants        │JSON │   - fetch from CDS               │
│   - resolve delegations  │     │   - pass to transformGrantsToGraph│
│   - evaluate findings    │     │   - render ReactFlow             │
│                          │     │                                  │
│  db/grants.cds           │     │  graph-utils.ts                  │
│   - Grants               │     │   - extractLeaves()              │
│   - Consents             │     │   - groupLeaves()                │
│   - AuthorizationDetails │     │   - applyFindings()              │
│   - FindingRules         │     │   - buildTraceLayout()           │
└──────────────────────────┘     └──────────────────────────────────┘
```

## Data flow

### 1. Backend: `GET /grants-management/agentGraph(actor='urn:agent:expense-assistant')`

The handler (`srv/grant-management/handler.graph.tsx`) runs this pipeline:

1. **Fetch** all grants for the authenticated user with nested `consents.authorization_details`
2. **Group by actor** — extract the actor URN from each consent (via `consent.actor` or `consent.request.requested_actor`)
3. **Transform** the selected actor's grants from CDS DB shape to frontend shape (type renames, Map-to-array conversions)
4. **Resolve delegations** — for each `agent_invocation` detail, find the target agent's details where `request_scope` overlaps with the invoked `actions`, recursively (max depth 10)
5. **Evaluate findings** — flatten all details into leaves, match against `FindingRules`
6. **Return** `{ actors[], selectedActor, grants[], findings[] }`

### 2. Frontend: `transformGrantsToGraph()`

The utility (`app/portal/app/components/graph/graph-utils.ts`) converts the API response into ReactFlow nodes and edges:

1. **Extract leaves** — walk each grant's `authorization_details`, emitting one `LeafResource` per atomic resource (each MCP tool, each DB table, each FS path, each API URL)
2. **Apply findings** — match backend-evaluated finding conditions against leaves
3. **Group** by leaf type (MCP, DB, FS, API), sort granted-first then alphabetical
4. **Layout** — agent node at column 0, leaf nodes at column 1, vertically stacked by group
5. **Finding edges** — connect leaf nodes that share a `findingId`

## Node types

### AgentNode

The central node representing the selected agent.

```
        ┌──────────────────┐
        │     (Bot icon)   │
        │  expense-assistant│
        │  7 grants · 12   │
        │   permissions    │
        └──────────────────┘
```

| Property | Type | Description |
|---|---|---|
| `label` | `string` | Agent display name (URN with `urn:agent:` prefix stripped) |
| `grantCount` | `number` | Number of grants for this actor |
| `permissionCount` | `number` | Total leaf count (individual resources) |
| `deniedCount` | `number` | Leaves with `status: "denied"` |

Component: `AgentNode.tsx`. Has a single `source` handle on the right.

### LeafNode

Each atomic resource the agent can access. One per MCP tool, DB table, FS path, or API endpoint.

```
┌──────────────────────────────┐
│ ⚡ register_receipt     [MCP] │
│    expense-mcp            ✓  │
│    via payment-service       │
│    ⚠ Warning                 │
└──────────────────────────────┘
```

| Property | Type | Description |
|---|---|---|
| `leaf.id` | `string` | Stable ID, e.g. `mcp::expense-mcp::register_receipt` or `via-payment-service::api::https://...` |
| `leaf.leafType` | `LeafType` | One of: `mcp_tool`, `db_table`, `fs_path`, `api_endpoint` |
| `leaf.label` | `string` | Primary text — tool name, table name, path, or hostname |
| `leaf.sublabel` | `string` | Secondary text — server name, schema, permissions, HTTP methods |
| `leaf.status` | `"granted" \| "denied"` | Whether access is allowed |
| `leaf.viaAgent` | `string?` | If present, this resource is accessed via delegation (shows "via {agent}") |
| `leaf.sourceDetailType` | `AuthorizationDetailType` | The originating detail type — used for edge coloring. For delegated resources this is `"agent_invocation"` |
| `leaf.finding` | `FindingInfo?` | If present, this leaf is involved in a security finding |
| `leaf.trace` | `AuthorizationTrace` | Full authorization trace (grant → [delegation] → detail) for the detail panel |

Component: `LeafNode.tsx`. Has `target` and `source` handles on left/right, plus `finding-out`/`finding-in` handles for finding edges.

**Leaf type icons:**

| LeafType | Icon | Color |
|---|---|---|
| `mcp_tool` | Zap (⚡) | `#e76500` (orange) |
| `db_table` | Database | `#8b5cf6` (purple) |
| `fs_path` | HardDrive | `#aa0808` (red) |
| `api_endpoint` | Globe | `#0070f2` (blue) |

### TraceStepNode

Intermediate nodes that appear when a leaf is clicked, showing the authorization trace chain. These are ephemeral — created/destroyed during trace animation.

```
┌────────────────────────┐
│ 🔑 Grant               │    ┌────────────────────────┐
│ g-104                  │    │ 🤖 A2A Delegation      │
│ scope: agent:payment   │    │ → payment-service      │
└────────────────────────┘    └────────────────────────┘
```

| Property | Type | Description |
|---|---|---|
| `stepType` | `"grant" \| "delegation" \| "detail"` | Which step in the trace |
| `leaf` | `LeafResource` | The leaf this trace belongs to (for reading the full trace) |

Three step types:

- **grant** — Shows `grant_id`, `scope`, `description`, `granted_at`
- **delegation** — Shows target agent name and description. Only present when `leaf.trace.delegation` exists
- **detail** — Shows the resource detail type and specifics (server name, DB schema, paths, URLs)

Component: `TraceStepNode.tsx`.

## Edge types

### Standard edge (agent → leaf)

Connects the agent node to each leaf node. Color-coded by `sourceDetailType`.

| Property | Value |
|---|---|
| `stroke` | Type color (orange for MCP, purple for DB, red for FS, blue for API, green for agent_invocation) |
| `strokeWidth` | `2` |
| `strokeDasharray` | `"6 3"` if leaf is denied, otherwise solid |
| `opacity` | `0.5` if denied, `1` otherwise |

### Finding edge (`findingEdge`)

Custom "C-shaped" edge that routes to the right of both involved leaf nodes, connecting two leaves that share a security finding.

```
leaf-A ──────────┐
                 │  ⚠ SoD Risk
leaf-B ──────────┘
```

Component: `FindingEdge.tsx`. Uses `finding-out`/`finding-in` handles. Clicking the label dispatches a `focusFindingLeaves` DOM event that selects both leaves.

### Trace edges (animated)

Ephemeral animated edges shown during trace expansion:

```
Agent ──→ Grant ──→ [Delegation] ──→ Detail ──→ Leaf
```

Color matches the leaf's `sourceDetailType`. Uses `animated: true` for a flowing dash effect.

## Layout algorithm

### Default layout

Two-column left-to-right:

```
  Column 0 (x=0)          Column 1 (x=400)
  ┌──────────┐
  │  Agent   │─────────── Leaf (MCP tool)
  │  Node    │─────────── Leaf (MCP tool)
  │          │                              ← GROUP_SEPARATOR (28px)
  │          │─────────── Leaf (DB table)
  │          │─────────── Leaf (DB table)
  │          │
  │          │─────────── Leaf (FS path)
  │          │                              ← GROUP_SEPARATOR
  │          │─────────── Leaf (API endpoint)
  └──────────┘
```

Constants:
- `COL_GAP = 400` — horizontal distance between agent and leaves
- `ROW_GAP = 88` — vertical distance between leaf nodes
- `GROUP_SEPARATOR = 28` — extra vertical gap between leaf type groups

Groups are ordered: MCP → DB → FS → API. Within each group: granted first, then denied, then alphabetical.

### Trace expansion layout

When one or more leaves are clicked, the layout transitions (animated, 350ms ease-out cubic):

```
                     ┌───────┐   ┌───────────┐   ┌────────┐
  ┌──────────┐ ───→  │ Grant │──→│Delegation │──→│ Detail │──→ [Selected Leaf]
  │  Agent   │       └───────┘   └───────────┘   └────────┘
  │  Node    │
  └──────────┘                                              ← dimmed leaves above

                                                            ← dimmed leaves below
```

- Selected leaves move to the right end of the trace chain
- Non-selected leaves are pushed above/below the trace region and dimmed (`opacity: 0.35`)
- `TRACE_COL_GAP = 300` between trace step nodes
- `TRACE_ROW_GAP = 140` between parallel trace chains (multi-select)
- Existing edges to selected leaves are hidden; animated trace edges are shown instead

## Delegation chain resolution (backend)

The `request_scope` field on `AuthorizationDetails` is **required** (`@mandatory`) on every detail, regardless of type. It declares which skills/capabilities the resource serves. This is essential for graph traversal — without it, the handler cannot resolve which resources belong to a delegation chain. It also supports MCP tool composition, where one tool invokes another tool that accesses a resource.

When an `agent_invocation` detail names a target agent and skills, the handler joins across grants:

### Example: 3-layer chain

```
expense-assistant
  └─ agent_invocation
       identifier: urn:agent:audit-service
       actions: ["verify-compliance"]            ← skills being requested
       request_scope: ["approve-expense"]        ← what this consent serves

audit-service
  ├─ database (audit_log, violations)
  │    request_scope: ["verify-compliance"]      ← matches! included
  │
  └─ agent_invocation
       identifier: urn:agent:compliance-bot
       actions: ["check-policy"]
       request_scope: ["verify-compliance"]      ← matches! recurse

compliance-bot
  └─ api (compliance.governance.sap)
       request_scope: ["check-policy"]           ← matches! included
```

The handler resolves this into nested `delegated_details`:

```json
{
  "type": "agent_invocation",
  "agent": "urn:agent:audit-service",
  "delegated_details": [
    {
      "type": "database",
      "database": "audit_db",
      "tables": ["audit_log", "violations"]
    },
    {
      "type": "agent_invocation",
      "agent": "urn:agent:compliance-bot",
      "delegated_details": [
        {
          "type": "api",
          "urls": ["https://compliance.governance.sap/v1"]
        }
      ]
    }
  ]
}
```

The frontend then flattens this into leaf nodes with `viaAgent` annotations.

## Findings engine

Findings are security rules evaluated on the backend against the flattened leaf set. Two categories:

### Segregation of Duties (SoD)

Two-sided rule — both side A and side B must have matching leaves:

```yaml
rule: sod-expense-approve
severity: high
conditions:
  - side: A, leafType: mcp_tool, labelPattern: register_receipt
  - side: B, leafType: api_endpoint, labelPattern: reimburse-approve.payments.sap, requireDelegated: true
```

This fires when the agent can both register receipts (directly) and approve payments (via delegation).

### Excessive privilege

Single-sided rule — only side A conditions are checked:

```yaml
rule: excessive-db-write
severity: medium
conditions:
  - side: A, leafType: db_table, sublabelPattern: DELETE
```

### Condition fields

| Field | Description |
|---|---|
| `side` | `"A"` or `"B"` — which side of a SoD rule |
| `leafType` | Match leaf type: `mcp_tool`, `db_table`, `fs_path`, `api_endpoint` |
| `labelPattern` | Exact or substring match on `leaf.label` |
| `sublabelPattern` | Substring match on `leaf.sublabel` |
| `requireDelegated` | If `true`, only match leaves with `viaAgent` set (delegated access) |
| `sourceDetailType` | Match `leaf.sourceDetailType` |

## Detail panel

The right-side panel shows the full authorization trace for selected leaves, with pagination when multiple leaves are selected.

### Trace steps

For a direct resource:
1. **Grant** — grant_id, scope, timestamps
2. **Authorization Detail** — type-specific info (server, tools, tables, URLs...)
3. **Resource** — the leaf itself with granted/denied status

For a delegated resource:
1. **Grant** — the grant that contains the `agent_invocation`
2. **A2A Delegation** — target agent name and description
3. **Authorization Detail** — the delegated detail from the target agent
4. **Resource** — the leaf with "via {agent}" annotation

### Pagination

When multiple leaves are selected (click multiple nodes, or click a finding edge), the panel shows a `< 1 / N >` pagination bar. The page auto-advances to the most recently selected leaf.

## `request_scope` — required on all details

Every `AuthorizationDetail` must include a non-empty `request_scope` array. This field is marked `@mandatory` in the CDS model and validated in the PAR handler.

### Why it's required

`request_scope` declares which skills/capabilities a resource serves. The graph handler uses it to resolve delegation chains: when Agent-Y invokes Agent-X with `actions: ["register-receipt"]`, the handler finds Agent-X's details where `request_scope` includes `"register-receipt"`. Without it, the resource is invisible in the chain — producing a dead-end node in the graph.

This applies to **all** detail types, not just delegation targets. MCP tools can chain calls (tool A invokes tool B which reads from a database), and any agent can be a delegation target. Every resource must declare what it's for.

### Enforcement

1. **CDS model** — `@mandatory` annotation on `AuthorizationDetails.request_scope` rejects inserts with missing values
2. **PAR handler** — `parseAuthorizationDetails()` in `srv/authorization-service/handler.requests.tsx` validates that every detail in the request has a non-empty `request_scope` array before persisting, returning an error like:
   ```
   Authorization detail of type 'mcp' missing required field 'request_scope'
   ```

### Example PAR request

```json
[
  {
    "type": "mcp",
    "server": "expense-tools",
    "tools": { "register_receipt": null },
    "request_scope": ["register-receipt"]
  },
  {
    "type": "database",
    "tables": ["receipts", "cost_centers"],
    "actions": ["SELECT"],
    "request_scope": ["register-receipt", "list-expenses"]
  },
  {
    "type": "agent_invocation",
    "identifier": "urn:agent:payment-service",
    "actions": ["approve-payment"],
    "request_scope": ["approve-expense"]
  }
]
```

## API response shape

```typescript
interface AgentGraphResponse {
  actors: string[];           // All agent URNs with grants for this user
  selectedActor: string | null;
  grants: ApiGrant[];         // Grants for the selected actor
  findings: FindingInfo[];    // Evaluated security findings
}

interface ApiGrant {
  grant_id: string;
  actor: string;              // Agent URN
  granted: boolean;
  scope?: string;
  granted_at?: string;
  authorization_details: AuthorizationDetail[];
}

// AuthorizationDetail is a discriminated union on `type`:
//   "mcp_server"       → { server, transport, tools: [{name, granted}] }
//   "database"         → { database, schema, tables[], actions[] }
//   "file_system"      → { roots[], permissions: {read, write, ...} }
//   "api"              → { urls[], protocols[], actions[] }
//   "agent_invocation" → { agent, description, delegated_details[] }
//
// All types share:
//   request_scope: string[]  — required, skills this resource serves
```

## Backend → Frontend type mapping

| CDS `type` enum | Frontend `type` | Frontend `leafType` |
|---|---|---|
| `mcp` | `mcp_server` | `mcp_tool` (one per tool) |
| `fs` | `file_system` | `fs_path` (one per root) |
| `database` | `database` | `db_table` (one per table) |
| `api` | `api` | `api_endpoint` (one per URL) |
| `agent_invocation` | `agent_invocation` | _(recurse into delegated_details)_ |

## Files

| File | Role |
|---|---|
| `srv/grant-management/handler.graph.tsx` | Backend handler — fetches grants, resolves delegations, evaluates findings |
| `srv/grant-management/grant-management.cds` | CDS service definition — exposes `agentGraph()` function |
| `app/portal/app/routes/agents.graph.tsx` | Route component — SSR loader + ReactFlow page |
| `app/portal/app/components/graph/graph-types.ts` | TypeScript types for API response, leaves, nodes, edges |
| `app/portal/app/components/graph/graph-utils.ts` | `transformGrantsToGraph()`, `extractLeaves()`, `buildTraceLayout()`, `applyFindings()` |
| `app/portal/app/components/graph/AgentNode.tsx` | Central agent circle node |
| `app/portal/app/components/graph/LeafNode.tsx` | Resource leaf card node |
| `app/portal/app/components/graph/TraceStepNode.tsx` | Ephemeral trace step node |
| `app/portal/app/components/graph/DetailPanel.tsx` | Right-side detail panel with pagination |
| `app/portal/app/components/graph/FindingsBubble.tsx` | Floating findings counter pill |
| `app/portal/app/components/graph/FindingEdge.tsx` | C-shaped dashed finding edge |
| `db/grants.cds` | CDS data model — entities, aspects, enums. `request_scope` is `@mandatory` on `AuthorizationDetails` |
| `srv/authorization-service/handler.requests.tsx` | PAR handler — validates `request_scope` is present on every authorization detail |
| `scripts/seed-mock-data.py` | Generates all seed CSV files + optional `cds deploy` |

## Seed data

Run `python3 scripts/seed-mock-data.py --deploy` to populate the local SQLite database.

Current seed has 4 agents, 11 grants, 11 authorization details, 2 finding rules, 3 finding conditions:

```
expense-assistant (root)
├── MCP:   expense-mcp (register_receipt, scan_receipt)       request_scope: [register-receipt]
├── DB:    expense_db.transactions (receipts, cost_centers)   request_scope: [list-expenses]
│          — SELECT
├── FS:    /data/receipts/uploads (read, write, list, create) request_scope: [register-receipt]
├── API:   expense-api.internal.sap/v2 (GET, POST)           request_scope: [list-expenses]
├── DB:    expense_db.transactions (receipts, approvals)      request_scope: [approve-expense]
│          — INSERT, UPDATE
├── Agent: payment-service [2-layer]                          request_scope: [approve-expense]
│   └── API: reimburse-approve.payments.sap/v1                request_scope: [approve-payment]
│            (approve, disburse)
└── Agent: audit-service [3-layer]                            request_scope: [approve-expense]
    ├── DB:    audit_db.compliance (audit_log, violations)    request_scope: [verify-compliance]
    │          — SELECT, INSERT
    └── Agent: compliance-bot                                 request_scope: [verify-compliance]
        └── API: compliance.governance.sap/v1 (GET, POST)    request_scope: [check-policy]
```
