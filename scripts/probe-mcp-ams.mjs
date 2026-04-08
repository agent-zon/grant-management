#!/usr/bin/env node
/**
 * Direct HTTP checks against mcp-ams (bypasses CAP auth).
 * Loads string keys from project default-env.json when AMS_URL is unset (same default as cds serve / hybrid).
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const defaultEnvPath = join(root, "default-env.json");
if (!process.env.AMS_URL && existsSync(defaultEnvPath)) {
  try {
    const raw = JSON.parse(readFileSync(defaultEnvPath, "utf8"));
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "string" && process.env[k] === undefined) process.env[k] = v;
    }
  } catch {
    /* ignore */
  }
}

const base = (process.env.AMS_URL || "http://127.0.0.1:8687").replace(/\/$/, "");

const minimalDcn = {
  version: 1,
  policies: [
    {
      policy: ["default"],
      default: true,
      rules: [{ rule: "grant", actions: ["access"], resources: ["tools.probe"] }],
    },
  ],
  functions: [],
  tests: [],
};

async function probe(path, init = {}, timeoutMs = 8000) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    const text = await res.text();
    const preview = text.length > 400 ? `${text.slice(0, 400)}…` : text;
    return { url, status: res.status, ok: res.ok, preview };
  } catch (e) {
    return { url, status: 0, ok: false, preview: String(e.message || e) };
  }
}

console.log(`Probing mcp-ams at ${base}\n`);

const health = await probe("/health");
console.log(`[1] GET /health → ${health.status} ${health.ok ? "OK" : "FAIL"}`);
if (!health.ok) console.log(`    ${health.preview}`);

const peGetUrl = `${base}/policies/test-ref/evaluate?agentId=agent-123`;
let peGetStatus = 0;
let peGetErr = "";
try {
  const pe = await fetch(peGetUrl, { signal: AbortSignal.timeout(8000) });
  peGetStatus = pe.status;
} catch (e) {
  peGetErr = String(e.message || e);
}
console.log(`[1a] GET /policies/test-ref/evaluate?agentId=… → ${peGetStatus}${peGetErr ? ` (${peGetErr})` : ""}`);

let pePostStatus = 0;
let peBodyMatch = false;
let pePostPreview = "";
try {
  const pePost = await fetch(`${base}/policies/test-ref/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId: "agent-123",
      env: { time: new Date().toISOString(), tid: "probe-mcp-ams" },
      user: {},
      input: {
        app: {},
        tools: [{ name: "probe", title: "Probe", description: "", props: {} }],
      },
      dcn: minimalDcn,
      activePolicy: "",
    }),
    signal: AbortSignal.timeout(8000),
  });
  pePostStatus = pePost.status;
  const text = await pePost.text();
  pePostPreview = text.length > 400 ? `${text.slice(0, 400)}…` : text;
  try {
    const j = JSON.parse(text);
    const tools = j.active?.tools ?? j.tools;
    peBodyMatch = Array.isArray(tools) && tools.length > 0;
  } catch {
    peBodyMatch = false;
  }
} catch (e) {
  pePostPreview = String(e.message || e);
}
console.log(
  `[1b] POST /policies/test-ref/evaluate (input.tools + minimal dcn) → ${pePostStatus} bodyMatch(tools)=${peBodyMatch}`,
);
if (pePostPreview && (pePostStatus === 0 || !peBodyMatch)) console.log(`    ${String(pePostPreview).replace(/\s+/g, " ").trim()}`);

const echoPayload = JSON.stringify({ echo: true, probe: "mcp-ams" });
let echoStatus = 0;
let echoRoundTrip = false;
let echoErr = "";
try {
  const echoRes = await fetch(`${base}/debug/echo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: echoPayload,
    signal: AbortSignal.timeout(8000),
  });
  echoStatus = echoRes.status;
  const echoText = await echoRes.text();
  echoRoundTrip = echoRes.ok && echoText === echoPayload;
} catch (e) {
  echoErr = String(e.message || e);
}
console.log(
  `[1c] POST /debug/echo (no server logic) → ${echoStatus} ${echoRoundTrip ? "OK body identical" : "FAIL"}`,
);
if (echoErr) console.log(`    ${echoErr}`);

const policies = await probe(
  "/sap/scai/v1/authz/mcp-servers/any/policies",
);
console.log(
  `[2] GET …/mcp-servers/any/policies → ${policies.status} (200=list from in-memory AMS; 404/405=not this mcp-ams binary)`,
);
if (policies.preview) console.log(`    ${policies.preview.replace(/\s+/g, " ").trim()}`);

console.log(
  `[3] GET …/policies/dcn — skipped (route removed; use POST /policies/main/evaluate with inline dcn or persist-mcp-ams-eval.mjs)`,
);

const useTool = await probe(
  "/sap/scai/v1/authz/agents/agent-123/versions/main/mcp-servers/any/decision/useTool",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      primitive: "tools",
      name: "probe",
      input: {},
      activePolicy: "",
    }),
  },
  25000,
);
console.log(
  `[4] POST …/versions/main/…/useTool (versioned) → ${useTool.status}`,
);
if (useTool.preview) console.log(`    ${useTool.preview.replace(/\s+/g, " ").trim()}`);

const useToolLegacy = await probe(
  "/sap/scai/v1/authz/agents/agent-123/mcp-servers/any/decision/useTool",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      primitive: "tools",
      name: "probe",
      input: {},
      activePolicy: "",
    }),
  },
  25000,
);
console.log(
  `[5] POST …/mcp-servers/any/decision/useTool (legacy, ref=main) → ${useToolLegacy.status}`,
);
if (useToolLegacy.preview) {
  console.log(`    ${useToolLegacy.preview.replace(/\s+/g, " ").trim()}`);
}

const filterTools = await probe(
  "/sap/scai/v1/authz/decision/filter-tools",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dcn: minimalDcn,
      activePolicy: "",
      env: {},
      app: {},
      tools: [{ name: "probe", title: "Probe", props: {} }],
    }),
  },
  25000,
);
console.log(
  `[6] POST …/decision/filter-tools (batch, inline DCN) → ${filterTools.status} (200=current binary; 404/405=route missing)`,
);
if (filterTools.preview) console.log(`    ${filterTools.preview.replace(/\s+/g, " ").trim()}`);

if (health.status === 0) {
  console.log("\nNothing answered — is mcp-ams running? Try: npm run hybrid:mcp-ams");
  process.exit(1);
}
if (policies.status === 405) {
  console.log("\n405 on …/mcp-servers/…/policies — not mcp-ams on this port. lsof -nP -iTCP:8687 -sTCP:LISTEN");
  process.exit(1);
}
process.exit(health.ok ? 0 : 1);
