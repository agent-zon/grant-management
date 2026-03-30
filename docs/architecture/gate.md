# Agent-Centric Progressive Authorization Gate (APG)

## The case for agent-centric progressive authorization

## Executive summary

AI agents are not simple API clients. They call many MCP servers, operate across tenants, act on behalf of users, and change permissions continuously.

Traditional IAM answers **who you are** and **what roles you have**. Agents need an additional answer:

> What is this agent allowed to do right now — in this context?

Existing components already cover identity and policies:

* **IAS** → identity & tokens
* **AMS** → policy evaluation

But neither provides an **agent-centric control plane** nor a **runtime enforcement boundary** at the agent.

This paper introduces the **Agent-Centric Progressive Authorization Gate (APG)** — a lightweight control plane + runtime gate that sits on top of IAS and AMS to centrally decide permissions and enforce them locally at the agent boundary.

## References

- [MCP Grant Dialect (discussion)](https://github.tools.sap/AIAM/grant-management/discussions/34)
- [Agent Identity Lifecycle (SharePoint)](https://sap.sharepoint.com/:w:/r/teams/CPASecurity/Shared%20Documents/WG%20IAM%20AI/Agentic%20AI/Agent%20Identity%20Lifecycle.docx?d=wfb9bf8a2d428483b819103f5b19200b0&csf=1&web=1&e=4C9lXb)
- [Authorization API architecture (All-in-Identity architecture log)](https://github.tools.sap/AIAM/all-in-identity/blob/main/architecture-log/authorization-api-architecture.md)

## Table of contents

1. The problem (gaps)
2. Why MCP-only enforcement does not scale
3. Why AMS alone isn’t enough (context + remote resources)
4. Core insight
5. Proposed architecture
6. Deployment model
7. Runtime behavior
8. Permission graph (control plane view)
9. Central decision API + dialect negotiation
10. What APG enables
11. Key message

## 1. The problem (gaps)

Our current lifecycle already covers:

* Identity in IAS
* Policies in AMS
* Tool enforcement in MCP

(as described in [Agent Identity Lifecycle (SharePoint)](https://sap.sharepoint.com/:w:/r/teams/CPASecurity/Shared%20Documents/WG%20IAM%20AI/Agentic%20AI/Agent%20Identity%20Lifecycle.docx?d=wfb9bf8a2d428483b819103f5b19200b0&csf=1&web=1&e=4C9lXb))

But three gaps remain:

### Gap 1 — Agent ≠ Application

Classic IAM treats agents like service users.
Agents are:

* dynamic
* tool-discovering
* permission-elevating
* multi-hop callers

Static roles don’t model this behavior.

Agents require **continuous authorization**, not static assignment

---

### Gap 2 — No Single View of Trust

Today governance is fragmented:

```
IAS → identities
AMS → policies
MCP → tools
HITL → approvals
```

But no system answers:

> “Show me everything this agent can touch right now.”

Security teams need:

* full permissions graph
* cross‑system visibility
* instant revocation
* explainability

Without a unified control plane, trust becomes opaque.

---

### Gap 3 — Runtime Control is Fragmented

Authorization happens in many places:

* inside tokens
* inside backend services
* inside MCP servers

This causes:

* duplicated logic
* inconsistent behavior
* delayed revocation
* unpredictable runtime

Agents need:

* one runtime boundary
* deterministic enforcement
* progressive enablement

## 2. Why MCP-only enforcement does not scale

### Policy Caching, Runtime Drift, and the Need for an Agent-Attached Gate

A natural first approach is to enforce authorization directly inside MCP servers.

For example:

* MCP validates scopes
* MCP checks AMS policies
* MCP rejects unauthorized calls

While this works for **server-level protection**, it breaks down for **agent-centric authorization**.

Because policies are not only server-specific — they are:

* agent-specific
* tenant-specific
* time-bound
* dynamically elevated
* and continuously changing

This creates three structural problems.

### Problem A — State explosion, grant fan-out, and drift (MCP-only enforcement)

If authorization is enforced primarily inside an MCP server, the MCP server becomes responsible for tracking **dynamic, agent-specific grants** across many dimensions — not just “roles”.

In real agent flows, grants vary by:

* agent identity
* user (on-behalf-of vs unattended)
* session / chat / conversation
* workspace / tenant / environment
* time bounds (1 hour, 1 day, “this week”)
* usage limits (N calls)
* step-up outcomes (MFA, approval)
* workflow instance (purchase order #, travel request #)

That creates a multiplication effect.

### MCP-only model

To decide whether to allow a request, the MCP needs near-real-time knowledge of **every relevant grant** for **every agent currently calling it**.

Conceptually:

```
Agent → MCP
         (agents × grants across sessions/chats/workspaces/users/…)

```

Operationally this forces the MCP server to:

* maintain per-agent grant caches
* map incoming requests to the right grant “slice” (which session/workflow/user?)
* subscribe to grant change events for *many* agents
* handle eviction, refresh, and correctness under load
* do all of that consistently across multiple MCP servers

So if you want dynamic behavior (enable/disable tools instantly), the MCP effectively needs:

> **a subscription / synchronization mesh:** “all agents → all grants → all MCP servers”.

That’s expensive, complex, and brittle.

---

### Agent-attached gate model

When enforcement is attached to the agent runtime, each agent only needs to track its **own** grant state (across its sessions), and the MCP server can stay focused on tool execution and token validation.

Conceptually:

```
Agent → Gate → MCP
 (1 agent × its grants)

```

The system shifts from *global fan-out* to *local ownership*:

* the gate subscribes to grant updates only for that agent
* the gate shapes what the agent can see and request
* the MCP does not need per-agent caches to behave correctly

This reduces the problem from:

> “MCP must manage dynamic grants for every agent”
> to
> “each agent manages its own dynamic grants”.

---

### Problem B — Caching & drift becomes a security bug (not just performance)

Even if an MCP server tries to manage this, it will almost always cache decisions for performance.

That means the MCP’s view is a snapshot:

```
Agent → MCP
         (cached grant/policy snapshot)

```

If a grant changes, e.g.:

* consent revoked
* temporary role expired
* risk tier updated
* approval withdrawn

then the MCP may still behave based on stale state until:

* cache refresh
* stream reconnection
* restart
* revalidation logic catches up

For autonomous agents, even a short drift window is high risk because the agent can execute many actions quickly.

With an agent-attached gate, drift is minimized because:

* the gate is the primary consumer of “grant updates”
* tool availability changes immediately at the point of execution
* revoked capabilities disappear from the agent’s toolset right away

**MCP-only enforcement turns every MCP server into a high-scale, per-agent grant synchronization system.**
**An agent-attached gate collapses the complexity to “one agent × its grants” and enables immediate, deterministic behavior.**

## 3. Why AMS alone isn’t enough (context + remote resources)

AMS is excellent for defining enterprise resource restrictions, but it does not automatically know agent runtime context (user/session/workflow/step-up) nor how abstract resources map to remote MCP tools and tenant-specific endpoints. 

Therefore we leverage AMS as a policy engine behind a centralized Grant & Evaluation API that enriches requests with context, resolves remote resource bindings, and returns deterministic decisions plus enforceable constraints. 


### A. Context isn’t automatically available

For an agent decision you often need context like:

* who is the **subject** (user) and who is the **actor** (agent)
* tenant / workspace / environment
* chat/session/workflow id
* step-up status / approval outcome
* data classification / risk tiers
* time/usage limits

AMS can’t “guess” this. Something must **collect it and pass it**.


### B. Remote resources aren’t automatically linked

AMS might know “resource = Orders”, but not:

* which MCP server endpoint represents “Orders” in *this* tenant
* which destination / system instance is bound
* how that maps to a tool name + parameters

So you need a layer that:

1. maps *abstract resources/capabilities* → *concrete remote tools/endpoints*
2. attaches runtime context → evaluation request


---

### C. How we leverage AMS
 
* AMS remains the **policy engine / policy store** for resource restrictions, org policy, roles, conditions.
*  **Grant/Evaluation API** becomes the **policy decision broker** for agents:

  * enriches requests with context
  * resolves remote resources (registry/destinations/bindings)
  * evaluates via AMS when possible
  * and can combine AMS with other decision sources (HITL, RAR-style grants, risk tiers)



---
 

### Resulting model

### With MCP-only enforcement

```
Agent sees everything
→ tries calls
→ gets errors
→ policies cached
→ inconsistent behavior

```

### With Agent-Centric Gate

```
Agent sees only allowed tools
→ schemas reflect limits
→ no invalid calls possible
→ immediate revocation
→ deterministic behavior

```

This is both:

* more secure
* more efficient
* more explainable

### Positioning

Therefore:

* **SAP Identity Authentication Service** handles authentication
* **SAP Authorization Management Service** provides policies and resource resrrictions to be evaluted by server or decision api
* **APG** evaluate policies provides agent-context decisions and local enforcement at the agent boundary

---

## 4. Core insight

> Enforcement and decisions must live at the agent boundary, not only at the server boundary.

If each agent runs in its own pod:

> **The pod boundary is the natural authorization boundary. The gate belongs there.**

---

## 5. Proposed architecture

### 5.1 Responsibility split

```
IAS  → authentication
AMS  → policy decisions
APG  → agent access decisions + runtime enforcement
MCP  → tool execution
```

APG adds:

* runtime gate
* permission graph
* progressive grants
* tool exposure control
* multi‑tenant governance

---

### 5.2 Control plane + runtime plane

### Control Plane

```
┌──────────────────────────┐
│ Agent Control Plane      │
│ - policies               │
│ - approvals              │
│ - graph                  │
│ - audit                  │
└─────────────┬────────────┘
              │
              ▼
```


### 5.3. How we leverage AMS
 
* AMS remains the **policy engine / policy store** for resource restrictions, org policy, roles, conditions.
*  **Grant/Evaluation API** becomes the **policy decision broker** for agents:

  * enriches requests with context
  * resolves remote resources (registry/destinations/bindings)
  * evaluates via AMS when possible
  * and can combine AMS with other decision sources (HITL, RAR-style grants, risk tiers)

### Summery
- **AMS** stays the enterprise policy engine and policy store.
- **APG + the Grant & Evaluation API** add what AMS doesn’t have by default for agents: runtime context enrichment, remote resource/tool binding, and deterministic projection (tool visibility + schema constraints).

Note: Backend services (e.g., CAP) still enforce AMS directly for service-side enforcement where appropriate.

 
## 6. Deployment model


```
+--------------------------------------+
| Agent Pod                            |
|                                      |
|  Agent container  →  Gate -> Grant API    |
|                         ↓            |
+-------------------------┼------------+
                          ↓
                      MCP servers
```

Properties:

* strongest boundary
* instant revocation
* per‑agent state only
* deterministic behavior

Each agent:

```
state = 1 × #grant_contexts
```

Instead of:

```
#agents × #grant_contexts per MCP
```

---

## 7. Runtime behavior

### Before

```
Agent sees all tools
→ tries calls
→ gets errors
```

### After

```
Gate filters tools
Agent sees only allowed tools
Schemas reflect limits
Invalid calls impossible
```

---

## 8. Permission graph (control plane view)

```
Agent: InvoiceBot
  ├─ S/4 Orders (read)
  ├─ Concur (approval only)
  ├─ Pricing (limit <= 500)
  └─ HR (hidden)
```

Benefits:

* instant audit
* clear blast radius
* explainable decisions
 
---

## 9. Central decision API (Grant & Evaluation API)

For the deeper API-level design and trade-offs, see [Authorization API architecture (All-in-Identity architecture log)](https://github.tools.sap/AIAM/all-in-identity/blob/main/architecture-log/authorization-api-architecture.md).

### Keep clients simple

Clients should not:

* parse policies
* implement AMS semantics
* depend on policy language features

Instead they:

* ask for decision
* receive projection
* enforce locally

### Centralized decisions, decentralized enforcement

* Decision logic centralized
* Enforcement local (sidecar/SDK/CLI)

This gives consistency + scalability.

---

### 9.1 Dialect negotiation (MCP, A2A, AMS)

Clients declare supported dialects:

```
supportedDialects: ["mcp", "a2a", "ams"]
```

Decision service returns compatible artifacts:

* tool list
* schema constraints
* optional policy tokens/claims

This allows:

* sidecar
* SDK
* CLI
* automation connectors

All using the same control plane.

See [MCP Grant Dialect (discussion)](https://github.tools.sap/AIAM/grant-management/discussions/34) for the MCP-facing shape and semantics.

---
 

## 11. Key message

If IAS answers:

> Who is this agent?

And AMS answers:

> What policies apply to what server?

Then APG answers:

> What is this agent allowed to do right now — and only that?

That control plane is the missing layer for safe autonomous systems.



## Appendix: Enforcement delivery options (how APG shows up in runtimes)

All options share the same primitives (grant model, evaluation API, context schema, and tool projection). They differ only in *where* enforcement runs:

* **Sidecar gate**: default for Kubernetes agent pods (strong boundary).
* **SDK**: embedded runtimes (Node/Java/etc).
* **CLI wrapper**: simple automation runners / scripts.
* **Automation integration**: workflow/API-callout pattern that still uses the same decision service.
