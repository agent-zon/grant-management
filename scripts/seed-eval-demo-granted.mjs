#!/usr/bin/env node
/**
 * Create {agent}/eval/{policySlug}/{resourceSlug}.json on the policies GitHub repo with every tool
 * granted — for UI demos when there is no eval tree yet (or persist failed).
 *
 * Source of truth: agent policies.json (policy qualified names) + agent/mcps/*.yaml (tool lists).
 *
 *   npx cds bind --profile hybrid --exec -- node scripts/seed-eval-demo-granted.mjs
 *   node scripts/seed-eval-demo-granted.mjs --agent A532408 --ref main --dry-run
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
    "[seed-eval-demo-granted] No GitHub token. Run:\n" +
      "  npx cds bind --profile hybrid --exec -- node scripts/seed-eval-demo-granted.mjs",
  );
  process.exit(1);
}
const octokit = new Octokit({
  auth: token,
  baseUrl: url ?? "https://github.tools.sap/api/v3",
  userAgent: "grant-management-seed-eval-demo-granted",
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
  console.error(`[seed-eval-demo-granted] cannot read ${agentId}/policies.json: ${e.status || ""} ${e.message || e}`);
  process.exit(1);
}

const policies = Array.isArray(polDoc.policies) ? polDoc.policies : [];
const qualifiedNames = [];
for (const p of policies) {
  const q = qualifiedFromPolicyEntry(p);
  if (q) qualifiedNames.push(q);
}
if (qualifiedNames.length === 0) {
  console.warn(
    "[seed-eval-demo-granted] no parseable policy names in policies.json — using qualified name \"default\" (matches empty actas / default policy UI)",
  );
  qualifiedNames.push("default");
}

let yamlFiles;
try {
  const { data } = await octokit.rest.repos.getContent({ owner, repo, path: `${agentId}/mcps`, ref });
  const items = Array.isArray(data) ? data : [data];
  yamlFiles = items.filter((e) => e.type === "file" && YAML_EXT.test(e.name));
  yamlFiles.sort((a, b) => a.name.localeCompare(b.name));
} catch (e) {
  console.error(`[seed-eval-demo-granted] cannot list ${agentId}/mcps: ${e.status || ""} ${e.message || e}`);
  process.exit(1);
}
if (yamlFiles.length === 0) {
  console.error(`[seed-eval-demo-granted] no YAML under ${agentId}/mcps`);
  process.exit(1);
}

const now = new Date().toISOString();
let written = 0;

for (const q of qualifiedNames) {
  const polSlug = policyEvalFileSlug(q);
  for (const entry of yamlFiles) {
    const resourceName = entry.name.replace(YAML_EXT, "");
    const resourceSlug = policyEvalFileSlug(resourceName);
    const evalPath = `${agentId}/eval/${polSlug}/${resourceSlug}.json`;

    if (!force) {
      try {
        await octokit.rest.repos.getContent({ owner, repo, path: evalPath, ref });
        console.log(`[seed-eval-demo-granted] skip existing: ${evalPath}`);
        continue;
      } catch (e) {
        if (e.status !== 404) throw e;
      }
    }

    const fileRes = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: `${agentId}/mcps/${entry.name}`,
      ref,
    });
    const doc = yaml.load(decodeFileContent(fileRes.data));
    const tools = Array.isArray(doc?.tools) ? doc.tools : [];
    const rows = tools.map((t) => ({
      name: t.name,
      title: t.title || t.name,
      description: t.description || "",
      granted: true,
      denied: false,
    }));
    if (rows.length === 0) {
      rows.push({
        name: "_demo_placeholder",
        title: "Demo",
        description: "",
        granted: true,
        denied: false,
      });
    }

    const art = {
      policy: q,
      resource: resourceName,
      ref,
      evalVariant: "demo-seed",
      updatedAt: now,
      tools: rows,
    };
    const body = `${JSON.stringify(art, null, 2)}\n`;

    if (dryRun) {
      console.log(`[seed-eval-demo-granted] dry-run would write ${evalPath} (${rows.length} tools)`);
      written++;
      continue;
    }
    await putRepoFile(evalPath, body, `eval: demo-seed all granted ${resourceName} ${q} @ ${ref}`);
    written++;
    console.log(`[seed-eval-demo-granted] wrote ${evalPath}`);
  }
}

console.log(`[seed-eval-demo-granted] done: ${written} file(s)${dryRun ? " (dry-run)" : ""}`);
process.exit(0);
