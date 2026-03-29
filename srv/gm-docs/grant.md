# MCP Grant Dialect

## Grant‑Driven Tool Projection & Step‑Up Authorization for Agent Runtimes

---

## Goal

Make the agent runtime deterministic and safe by construction:

* the agent only sees tools it can use **now**
* tool schemas reflect current limits/constraints
* step-up is done via explicit “authorization request” tools
* changes are streamed so tools update live
* No need to cache complex policy, just dicovery like model

This keeps the client simple:

* no policy language
* no library dependency
* no per-tool token request
* just “project tools from grants” + “subscribe to updates”

---

# Architecture

## Control Plane vs Runtime

```
+-------------------------+
| Grant / Evaluation API  |
| (control plane)         |
|  - context enrichment   |
|  - AMS integration      |
|  - decisions            |
|  - approvals            |
+-----------+-------------+
            |
            v
+-------------------------------------------+
| Agent Pod                                 |
|                                           |
|  Agent -> MCP Client/Proxy -> MCP servers |
|              ^                            |
|              |                            |
|           tool projection                 |
+-------------------------------------------+
```

* Decisions are centralized
* Enforcement happens next to the agent

> If the agent is in its own pod, the pod boundary is the natural authorization boundary — the gate belongs there.

---

# Protocol Flow

## 1) Initialization Flow: “Grant First, Then Tool Discovery”

At startup (or agent session start), the agent runtime asks the **Grant Service** for a tool projection in the MCP dialect.

### ASCII overview

```
+-------------------+          +-------------------+
| Agent Runtime     |          | Grant Service     |
| (MCP client/proxy)|          | (decision plane)  |
+---------+---------+          +---------+---------+
          |                               |
          | 1) grant.query(context, agent) |
          +------------------------------>|
          |                               |
          | 2) toolProjection + authTools |
          |<------------------------------+
          |                               |
          | 3) connect only enabled tools |
          |    + adapt schemas            |
          |-------------------------------> MCP servers

```

**Context may include:**

* agent id
* tenant
* acting subject (user)
* session/chat/workflow id
* environment
* risk metadata

## 2) MCP Dialect Response: Tool Projection

The Grant Service returns a projection-like structure that tells the runtime **exactly what to expose**.

### Shape (conceptual)

```
tools[*]:
  true
  | { inputSchema, outputSchema }
  | false

```

Meaning:

* `true` → tool is enabled as-is
* `{inputSchema, outputSchema}` → tool enabled but schema is **constrained / adapted**
* `false` (or omitted) → tool not enabled, should not be visible

```
{
  tools: {
    "orders.read": true,
    "pricing.increase": {
      inputSchema: {...},
      outputSchema: {...}
    },
    "orders.delete": false
  },
  authTools: [...]
}
```

 

### Why schema adaptation matters

Instead of:

* exposing `increasePrice(amount)` and later rejecting >500

We return:

* `increasePrice(amount <= 500)`

So the agent *knows* what it can do and plans accordingly.

## Role Propagation (AMS / Enterprise Roles)

Step‑up can produce **temporary, contextual role delegations** in addition to tool‑level grants.

AMS is very strong at **resource scoping** (e.g., region, business unit, system instance). MCP servers can also enforce these constraints reliably.

Examples AMS handles well:

* Grant WRITE on systems where region=EU
* Grant READ on invoices where $user.organization = invoice.org
* Grant WRITE on orders wnere price < 500$

These **resource restrictions** are map naturally to backend enforcement.

However, agents often need **runtime or event context**, which does not exist statically in AMS by default.

Examples:

* only in the region mentioned in the triggering event
* only for this specific order/workflow/session
* only after explicit approval
* only for the next 10 minutes
* only N invocations

These are **dynamic, per‑execution constraints**, not static role properties.

### Key distinction

```
AMS roles       -> resource restrictions (where / what system)
Grant dialect   -> runtime context (when / for which event / how much)
```

### Combined model

The Grant Service orchestrates both layers.

After approval it may:

1. assign a temporary AMS role for backend enforcement
2. project tool/schema constraints locally for runtime safety

> see also [Role Propagation](#39)
---

## 3) Local Enforcement: MCP Client as Proxy/Middleware

The MCP client (or a lightweight proxy/middleware in the agent pod) does two jobs:

### A. Disable tools that are not enabled

* don’t register them
* don’t show them in discovery
* agent cannot call them at all

### B. Adapt schemas for enabled tools

* rewrite `inputSchema` and `outputSchema`
* enforce constraints before sending to MCP server
* prevents out-of-policy calls by construction

### ASCII inside the agent pod

```
+---------------------------------------------+
| Agent Pod                                    |
|                                             |
|  [Agent] -> [MCP Client/Proxy] -> [MCP Hub] |
|              - hide tools                   |
|              - rewrite schemas              |
|              - enforce locally              |
+---------------------------------------------+

```

---

# Schema Shaping 

### Traditional

```
increasePrice(900) -> 403
```

### Grant Dialect

```
increasePrice(amount <= 500)
```

Benefits:

* agent understands limits
* fewer failed calls
* safer reasoning
* less noise
* deterministic behavior

---

# 3. Subscription

Grants change dynamically.

Examples:

* consent approved/revoked
* step‑up granted
* temporary role expired
* policy updated

Runtime subscribes:

```
grant.subscribe(agentId, sessionId)
```

On update:

* add tools
* remove tools
* update schemas

```
Grant Service ---> grant.changed ---> Proxy updates toolset
```

Revocation becomes immediate.

---

# 4. Step‑Up Authorization Tools

In addition to business tools, the agent receives **authorization tools**.

These allow requesting elevated permissions.

Agent sees:

```
orders.read
products.search
pricing.increase(amount <= 500)

grant.push-authorization-tool
grant.check-status

//meta tools, available after using the push-authorization-tool
task-managment.create-task
emails.send-email
whatsap.send-message
```

##

---

# Dialect Negotiation

Clients declare supported enforcement dialects:

```
supportedDialects: ["mcp", "a2a", "ams"]
```

Server returns compatible artifacts.

This allows:

* sidecar
* SDK
* CLI
* automation connectors

All using the same decision plane.

---

# Summary

The MCP Grant Dialect enables:

* centralized authorization
* localized enforcement
* progressive permissions
* instant revocation
* schema‑aware safety
* simpler runtimes

Instead of:

```
Agent -> MCP -> reject
```

We get:

```
Agent -> Proxy -> only valid tools exist
```
<!---
Secure by construction.

Deterministic for agents.

Operationally scalable.
--->