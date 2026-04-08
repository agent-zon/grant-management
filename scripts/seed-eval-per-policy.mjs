#!/usr/bin/env node
/**
 * Writes one Git file per policy: {agent}/eval/{policySlug}.json
 * Shape (read by CAP handler.resources.tools):
 *   { activePolicy, ref, updatedAt, resources: { [mcpCardName]: { tools: EvalToolRow[] } } }
 *
 * Tool rows are heuristic (AMS-like, not live eval): mixed granted / denied / conditional,
 * stable for the same policy+resource+tool name, varied across policies.
 *
 *   npx cds bind --profile hybrid --exec -- node scripts/seed-eval-per-policy.mjs
 *   node scripts/seed-eval-per-policy.mjs --agent A532408 --ref main --force
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const defaultEnvPath = join(root, "default-env.json");
if (existsSync(defaultEnvPath)) {
  try {
    const raw = JSON.parse(readFileSync(defaultEnvPath, "utf8"));
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "string" && process.env[k] === undefined) process.env[k] = v;
    }
  } catch {
    /* ignore */
  }
}

const YAML_EXT = /\.(yaml|yml)$/i;

function parseArgs(argv) {
  const out = { dryRun: false, force: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--agent" && argv[i + 1]) out.agent = argv[++i];
    else if (a === "--ref" && argv[i + 1]) out.ref = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--force") out.force = true;
  }
  return out;
}

function policyEvalFileSlug(qualified) {
  let s = String(qualified).trim().replace(/\//g, "_").replace(/\\/g, "_");
  s = s.replace(/^\.+|\.+$/g, "");
  return s || "_empty";
}

function qualifiedFromPolicyEntry(p) {
  if (!p || typeof p !== "object") return "";
  if (typeof p.qualifiedName === "string" && p.qualifiedName.trim()) return p.qualifiedName.trim();
  const arr = p.policy;
  if (Array.isArray(arr) && arr.length > 0) return arr.map(String).join(".");
  if (typeof arr === "string" && arr.trim()) return arr.trim();
  return "";
}

function decodeFileContent(data) {
  const b64 = data.content?.replace(/\n/g, "") || "";
  return Buffer.from(b64, "base64").toString("utf8");
}

function hash32(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * @param {string} policyQ
 * @param {string} resourceName
 * @param {{ name: string, title?: string, description?: string }} tool
 */
function toolRowFor(policyQ, resourceName, tool) {
  const key = `${policyQ}\0${resourceName}\0${tool.name}`;
  const h = hash32(key) % 100;
  const pol = policyQ.toLowerCase();
  const tname = (tool.name || "").toLowerCase();
  const sens = /admin|delete|purge|secret|credential|token|password|pay|transfer|approve|void/i.test(tname);
  const readish = /read|list|get|search|fetch|describe|ping|health/i.test(tname);

  const base = {
    name: tool.name,
    title: tool.title || tool.name,
    description: tool.description || "",
  };

  if (pol === "obo_authenticated_user" || pol.startsWith("obo_")) {
    if (sens) return { ...base, granted: false, denied: true, condition: "" };
    if (readish) return { ...base, granted: true, denied: false, condition: "" };
    if (h < 45) return { ...base, granted: true, denied: false, condition: "" };
    if (h < 78) return { ...base, granted: false, denied: false, condition: "eq $env.actas.on_behalf_of_user" };
    return { ...base, granted: false, denied: true, condition: "" };
  }

  if (pol.includes("privileged")) {
    if (h < 12) return { ...base, granted: false, denied: true, condition: "" };
    if (h < 22) return { ...base, granted: false, denied: false, condition: "eq $env.grant.privileged_mode true" };
    return { ...base, granted: true, denied: false, condition: "" };
  }

  if (pol.includes("admin")) {
    if (h < 5) return { ...base, granted: false, denied: true, condition: "" };
    return { ...base, granted: true, denied: false, condition: "" };
  }

  if (pol.includes("work") && pol.includes("hour")) {
    if (h < 35) return { ...base, granted: false, denied: false, condition: "eq $env.work.inside_business_hours true" };
    if (h < 50) return { ...base, granted: false, denied: true, condition: "" };
    return { ...base, granted: true, denied: false, condition: "" };
  }

  if (pol.includes("authenticated") || pol === "default") {
    if (sens && h < 70) return { ...base, granted: false, denied: true, condition: "" };
    if (h < 48) return { ...base, granted: true, denied: false, condition: "" };
    if (h < 76) return { ...base, granted: false, denied: true, condition: "" };
    return { ...base, granted: false, denied: false, condition: "eq $app.tools.*.access-level standard" };
  }

  const shift = hash32(policyQ) % 23;
  const x = (h + shift) % 100;
  if (x < 42) return { ...base, granted: true, denied: false, condition: "" };
  if (x < 72) return { ...base, granted: false, denied: true, condition: "" };
  return { ...base, granted: false, denied: false, condition: "constraint pending" };
}

const args = parseArgs(process.argv);
const agentId = args.agent || process.env.PERSIST_AGENT || "A532408";
const ref = args.ref || process.env.PERSIST_REF || "main";
const dryRun = args.dryRun;
const force = args.force;

const cds = (await import("@sap/cds")).default;
cds.root = root;
await cds.load("*");

const { Octokit } = await import("octokit");

const github = await cds.connect.to("github");
const { token, url } = github?.options?.credentials ?? {};
if (!token) {
  console.error(
    "[seed-eval-per-policy] No GitHub token. Run:\n" +
      "  npx cds bind --profile hybrid --exec -- node scripts/seed-eval-per-policy.mjs",
  );
  process.exit(1);
}
const octokit = new Octokit({
  auth: token,
  baseUrl: url ?? "https://github.tools.sap/api/v3",
  userAgent: "grant-management-seed-eval-per-policy",
});
const owner = process.env.MCP_AMS_POLICIES_OWNER || "AIAM";
const repo = process.env.MCP_AMS_POLICIES_REPO || "policies";

async function putRepoFile(path, bodyUtf8, message) {
  const content = Buffer.from(bodyUtf8, "utf8").toString("base64");
  let sha;
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path, ref });
    sha = data.sha;
  } catch (e) {
    if (e.status !== 404) throw e;
  }
  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content,
    branch: ref,
    ...(sha ? { sha } : {}),
  });
}

let polDoc;
try {
  const polRes = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: `${agentId}/policies.json`,
    ref,
  });
  polDoc = JSON.parse(decodeFileContent(polRes.data));
} catch (e) {
  console.error(`[seed-eval-per-policy] cannot read ${agentId}/policies.json: ${e.status || ""} ${e.message || e}`);
  process.exit(1);
}

const policies = Array.isArray(polDoc.policies) ? polDoc.policies : [];
const qualifiedNames = [];
for (const p of policies) {
  const q = qualifiedFromPolicyEntry(p);
  if (q) qualifiedNames.push(q);
}
if (qualifiedNames.length === 0) {
  console.warn('[seed-eval-per-policy] no policy names in policies.json — seeding "default" only');
  qualifiedNames.push("default");
}

let yamlFiles;
try {
  const { data } = await octokit.rest.repos.getContent({ owner, repo, path: `${agentId}/mcps`, ref });
  const items = Array.isArray(data) ? data : [data];
  yamlFiles = items.filter((e) => e.type === "file" && YAML_EXT.test(e.name));
  yamlFiles.sort((a, b) => a.name.localeCompare(b.name));
} catch (e) {
  console.error(`[seed-eval-per-policy] cannot list ${agentId}/mcps: ${e.status || ""} ${e.message || e}`);
  process.exit(1);
}
if (yamlFiles.length === 0) {
  console.error(`[seed-eval-per-policy] no YAML under ${agentId}/mcps`);
  process.exit(1);
}

const now = new Date().toISOString();
let written = 0;

for (const q of qualifiedNames) {
  const polSlug = policyEvalFileSlug(q);
  const evalPath = `${agentId}/eval/${polSlug}.json`;

  if (!force) {
    try {
      await octokit.rest.repos.getContent({ owner, repo, path: evalPath, ref });
      console.log(`[seed-eval-per-policy] skip existing: ${evalPath}`);
      continue;
    } catch (e) {
      if (e.status !== 404) throw e;
    }
  }

  /** @type {Record<string, { tools: object[] }>} */
  const resources = {};

  for (const entry of yamlFiles) {
    const resourceName = entry.name.replace(YAML_EXT, "");
    const fileRes = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: `${agentId}/mcps/${entry.name}`,
      ref,
    });
    const doc = yaml.load(decodeFileContent(fileRes.data));
    const tools = Array.isArray(doc?.tools) ? doc.tools : [];
    const rows =
      tools.length > 0
        ? tools.map((t) => toolRowFor(q, resourceName, t))
        : [toolRowFor(q, resourceName, { name: "_placeholder", title: "Placeholder", description: "" })];
    resources[resourceName] = { tools: rows };
  }

  const art = {
    activePolicy: q,
    ref,
    updatedAt: now,
    note: "Heuristic demo eval (not live AMS); one file per policy for CAP tools panel",
    resources,
  };
  const body = `${JSON.stringify(art, null, 2)}\n`;

  if (dryRun) {
    console.log(`[seed-eval-per-policy] dry-run would write ${evalPath} (${Object.keys(resources).length} resources)`);
    written++;
    continue;
  }
  await putRepoFile(evalPath, body, `eval: per-policy heuristic ${q} @ ${ref}`);
  written++;
  console.log(`[seed-eval-per-policy] wrote ${evalPath}`);
}

console.log(`[seed-eval-per-policy] done: ${written} file(s)${dryRun ? " (dry-run)" : ""}`);
process.exit(0);
