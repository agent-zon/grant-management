#!/usr/bin/env tsx
/**
 * Seed Agent Grants
 *
 * Creates grants via the PAR → authorize → consent flow, matching the
 * seed data pattern used for the agents graph visualization.
 *
 * Usage:
 *   # Via port-forward to the deployed srv:
 *   kubectl port-forward deployment/agents-srv 8090:8080
 *   TOKEN=<IAS_TOKEN> npx tsx scripts/seed-agent-grants.ts --base-url http://localhost:8090
 *
 *   # Against local CDS with hybrid auth (cds bind):
 *   TOKEN=<IAS_TOKEN> npx tsx scripts/seed-agent-grants.ts
 *
 *   # Token can also be passed as a flag:
 *   npx tsx scripts/seed-agent-grants.ts --base-url http://localhost:8090 --token <IAS_TOKEN>
 */

const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
}

const BASE_URL = getArg("base-url") || process.env.BASE_URL || "http://localhost:4004";
const TOKEN = getArg("token") || process.env.TOKEN;

if (!TOKEN) {
  console.error("Error: --token <IAS_TOKEN> or TOKEN env var is required.");
  console.error("Get a token via: curl -s -X POST <IAS_URL>/oauth2/token --cert cert.pem --key key.pem -d 'grant_type=client_credentials&client_id=<CLIENT_ID>'");
  process.exit(1);
}

const AUTH_HEADER = `Bearer ${TOKEN}`;

// ── Grant definitions ─────────────────────────────────────────────────────────
//
// The PAR stores authorization_details as `access: array of AuthorizationDetailRequest`
// which has a limited schema (mcp, fs, database, api aspects).
// The consent creates `AuthorizationDetails` entities which have additional fields
// like `identifier`, flat `permissions`, etc.
//
// We split each grant definition into:
//   parDetails  – fields valid for AuthorizationDetailRequest (PAR schema)
//   consentDetails – full fields for AuthorizationDetails (consent schema)

interface GrantDef {
  actor: string;
  client_id: string;
  scope: string;
  parDetails: Record<string, unknown>[];
  consentDetails: Record<string, unknown>[];
}

const GRANTS: GrantDef[] = [
  // ── Agent: expense-assistant ──────────────────────────────────────────────
  {
    actor: "urn:agent:expense-assistant",
    client_id: "expense-app",
    scope: "mcp:expense",
    parDetails: [
      {
        type: "mcp",
        server: "expense-mcp",
        transport: "stdio",
        tools: { register_receipt: { essential: true }, scan_receipt: { essential: true } },
        actions: ["read"],
      },
    ],
    consentDetails: [
      {
        type: "mcp",
        server: "expense-mcp",
        transport: "stdio",
        tools: { register_receipt: true, scan_receipt: true },
        actions: ["read"],
      },
    ],
  },
  {
    actor: "urn:agent:expense-assistant",
    client_id: "expense-app",
    scope: "db:expense-read",
    parDetails: [
      {
        type: "database",
        databases: ["expense_db"],
        schemas: ["transactions"],
        tables: ["receipts", "cost_centers"],
        actions: ["SELECT"],
      },
    ],
    consentDetails: [
      {
        type: "database",
        databases: ["expense_db"],
        schemas: ["transactions"],
        tables: ["receipts", "cost_centers"],
        actions: ["SELECT"],
      },
    ],
  },
  {
    actor: "urn:agent:expense-assistant",
    client_id: "expense-app",
    scope: "fs:receipts",
    parDetails: [
      {
        type: "fs",
        roots: ["/data/receipts/uploads"],
        permissions: {
          read: { essential: true },
          write: { essential: true },
          delete: { essential: false },
          list: { essential: true },
          create: { essential: true },
        },
      },
    ],
    consentDetails: [
      {
        type: "fs",
        roots: ["/data/receipts/uploads"],
        permissions_read: true,
        permissions_write: true,
        permissions_delete: false,
        permissions_list: true,
        permissions_create: true,
      },
    ],
  },
  {
    actor: "urn:agent:expense-assistant",
    client_id: "expense-app",
    scope: "agent:payment-service",
    parDetails: [
      {
        type: "agent_invocation",
        actions: ["approve-expense"],
        locations: ["urn:agent:payment-service"],
      },
    ],
    consentDetails: [
      {
        type: "agent_invocation",
        identifier: "urn:agent:payment-service",
        actions: ["approve-expense"],
      },
    ],
  },
  {
    actor: "urn:agent:expense-assistant",
    client_id: "expense-app",
    scope: "api:expense",
    parDetails: [
      {
        type: "api",
        urls: ["https://expense-api.internal.sap/v2"],
        protocols: ["HTTPS"],
        actions: ["GET", "POST"],
      },
    ],
    consentDetails: [
      {
        type: "api",
        urls: ["https://expense-api.internal.sap/v2"],
        protocols: ["HTTPS"],
        actions: ["GET", "POST"],
      },
    ],
  },
  {
    actor: "urn:agent:expense-assistant",
    client_id: "expense-app",
    scope: "agent:audit-service",
    parDetails: [
      {
        type: "agent_invocation",
        actions: ["verify-compliance"],
        locations: ["urn:agent:audit-service"],
      },
    ],
    consentDetails: [
      {
        type: "agent_invocation",
        identifier: "urn:agent:audit-service",
        actions: ["verify-compliance"],
      },
    ],
  },
  {
    actor: "urn:agent:expense-assistant",
    client_id: "expense-app",
    scope: "db:expense-write",
    parDetails: [
      {
        type: "database",
        databases: ["expense_db"],
        schemas: ["transactions"],
        tables: ["receipts", "approvals"],
        actions: ["INSERT", "UPDATE"],
      },
    ],
    consentDetails: [
      {
        type: "database",
        databases: ["expense_db"],
        schemas: ["transactions"],
        tables: ["receipts", "approvals"],
        actions: ["INSERT", "UPDATE"],
      },
    ],
  },
  // ── Agent: payment-service ────────────────────────────────────────────────
  {
    actor: "urn:agent:payment-service",
    client_id: "payment-app",
    scope: "api:payment",
    parDetails: [
      {
        type: "api",
        urls: ["https://reimburse-approve.payments.sap/v1"],
        protocols: ["HTTPS"],
        actions: ["approve", "disburse"],
      },
    ],
    consentDetails: [
      {
        type: "api",
        urls: ["https://reimburse-approve.payments.sap/v1"],
        protocols: ["HTTPS"],
        actions: ["approve", "disburse"],
      },
    ],
  },
  // ── Agent: audit-service ──────────────────────────────────────────────────
  {
    actor: "urn:agent:audit-service",
    client_id: "audit-app",
    scope: "agent:compliance-bot",
    parDetails: [
      {
        type: "agent_invocation",
        actions: ["check-policy"],
        locations: ["urn:agent:compliance-bot"],
      },
    ],
    consentDetails: [
      {
        type: "agent_invocation",
        identifier: "urn:agent:compliance-bot",
        actions: ["check-policy"],
      },
    ],
  },
  {
    actor: "urn:agent:audit-service",
    client_id: "audit-app",
    scope: "db:audit",
    parDetails: [
      {
        type: "database",
        databases: ["audit_db"],
        schemas: ["compliance"],
        tables: ["audit_log", "violations"],
        actions: ["SELECT", "INSERT"],
      },
    ],
    consentDetails: [
      {
        type: "database",
        databases: ["audit_db"],
        schemas: ["compliance"],
        tables: ["audit_log", "violations"],
        actions: ["SELECT", "INSERT"],
      },
    ],
  },
  // ── Agent: compliance-bot ─────────────────────────────────────────────────
  {
    actor: "urn:agent:compliance-bot",
    client_id: "compliance-app",
    scope: "api:compliance",
    parDetails: [
      {
        type: "api",
        urls: ["https://compliance.governance.sap/v1"],
        protocols: ["HTTPS"],
        actions: ["GET", "POST"],
      },
    ],
    consentDetails: [
      {
        type: "api",
        urls: ["https://compliance.governance.sap/v1"],
        protocols: ["HTTPS"],
        actions: ["GET", "POST"],
      },
    ],
  },
];

// ── HTTP helpers ─────────────────────────────────────────────────────────────

async function post(path: string, body: Record<string, unknown>, accept = "application/json") {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: accept,
      Authorization: AUTH_HEADER,
    },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  return { status: res.status, headers: res.headers, data: await res.json().catch(() => null) };
}

async function put(path: string, body: Record<string, unknown>, accept = "application/json") {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: accept,
      Authorization: AUTH_HEADER,
    },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch {}
  return { status: res.status, headers: res.headers, data, text };
}

async function get(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json", Authorization: AUTH_HEADER },
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

// ── Grant creation flow ─────────────────────────────────────────────────────

async function createGrant(def: GrantDef): Promise<string> {
  // Step 1: PAR — use parDetails (AuthorizationDetailRequest schema)
  const par = await post("/oauth-server/par", {
    response_type: "code",
    client_id: def.client_id,
    redirect_uri: "urn:scai:grant:callback",
    scope: def.scope,
    state: `seed-${Date.now()}`,
    code_challenge: "seed-challenge",
    code_challenge_method: "S256",
    requested_actor: def.actor,
    authorization_details: JSON.stringify(def.parDetails),
  });

  if (!par.data?.request_uri) {
    throw new Error(`PAR failed: ${JSON.stringify(par.data)}`);
  }
  const requestId = par.data.request_uri.split(":").pop()!;

  // Step 2: Authorize (creates/upserts grant + renders consent page)
  await post(
    "/oauth-server/authorize",
    { request_uri: par.data.request_uri, client_id: def.client_id },
    "text/html"
  );

  // Step 3: Get grant_id
  const authReq = await get(`/oauth-server/AuthorizationRequests(${requestId})`);
  const grantId = authReq.data?.grant_id;
  if (!grantId) {
    throw new Error(`No grant_id on auth request: ${JSON.stringify(authReq.data)}`);
  }

  // Step 4: Submit consent — use consentDetails (AuthorizationDetails schema)
  const consent = await put(
    `/oauth-server/AuthorizationRequests/${requestId}/consent`,
    {
      request_ID: requestId,
      grant_id: grantId,
      client_id: def.client_id,
      scope: def.scope,
      authorization_details: def.consentDetails,
    },
    "text/html"
  );

  if (consent.status !== 301 && consent.status !== 201 && consent.status !== 200) {
    throw new Error(`Consent failed (${consent.status}): ${consent.text}`);
  }

  return grantId;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding agent grants against ${BASE_URL}`);
  console.log(`Auth: Bearer token\n`);

  const grantIds: string[] = [];
  for (const def of GRANTS) {
    try {
      const grantId = await createGrant(def);
      grantIds.push(grantId);
      console.log(`  [ok] ${def.actor} / ${def.scope} -> grant ${grantId}`);
    } catch (err: any) {
      console.error(`  [FAIL] ${def.actor} / ${def.scope}: ${err.message}`);
    }
  }

  console.log(`\nCreated ${grantIds.length}/${GRANTS.length} grants.`);

  // Verify: call agentGraph
  console.log("\nVerifying agentGraph endpoint...");
  const graph = await get("/grants-management/agentGraph()");
  if (graph.status === 200 && graph.data) {
    const actors: string[] = graph.data.actors || [];
    console.log(`  Actors found: ${actors.length}`);
    actors.forEach((a: string) => console.log(`    - ${a}`));

    if (actors.length > 0) {
      // Fetch graph for first actor
      const detail = await get(`/grants-management/agentGraph(actor='${encodeURIComponent(actors[0])}')`);
      const grants = detail.data?.grants || [];
      console.log(`  Grants for ${actors[0]}: ${grants.length}`);
    }
  } else {
    console.error(`  agentGraph returned ${graph.status}: ${JSON.stringify(graph.data)}`);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
