#!/usr/bin/env node
/**
 * Rewrite persisted AMS eval JSON in the policies GitHub repo so every tool shows as granted
 * (for UI demos when live eval denies everything).
 *
 * Handles:
 *   - Nested: {agent}/eval/{policySlug}/{resource}.json with top-level `tools[]`
 *   - Variant: {agent}/eval/{variant}/{policySlug}/{resource}.json (same shape)
 *   - Legacy: {agent}/eval/{policySlug}.json with `resources.{name}.tools[]`
 *
 * Usage:
 *   npx cds bind --profile hybrid --exec -- node scripts/patch-eval-all-granted.mjs
 *   node scripts/patch-eval-all-granted.mjs --agent A532408 --ref main --dry-run
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

function parseArgs(argv) {
  const out = { dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--agent" && argv[i + 1]) out.agent = argv[++i];
    else if (a === "--ref" && argv[i + 1]) out.ref = argv[++i];
    else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}

function decodeFileContent(data) {
  const b64 = data.content?.replace(/\n/g, "") || "";
  return Buffer.from(b64, "base64").toString("utf8");
}

/** @param {any} art */
function patchToolsRows(rows) {
  if (!Array.isArray(rows)) return { rows, changed: 0 };
  let changed = 0;
  const next = rows.map((t) => {
    if (!t || typeof t !== "object") return t;
    const granted = t.granted === true;
    const denied = t.denied === true;
    const cond = t.condition;
    if (granted && !denied && (cond === undefined || cond === "" || cond === null)) return t;
    changed++;
    return {
      ...t,
      granted: true,
      denied: false,
      condition: "",
    };
  });
  return { rows: next, changed };
}

/** @param {any} art */
function patchArtifact(art) {
  let total = 0;
  const out = JSON.parse(JSON.stringify(art));
  if (Array.isArray(out.tools)) {
    const { rows, changed } = patchToolsRows(out.tools);
    out.tools = rows;
    total += changed;
  }
  if (out.resources && typeof out.resources === "object") {
    for (const k of Object.keys(out.resources)) {
      const block = out.resources[k];
      if (block && Array.isArray(block.tools)) {
        const { rows, changed } = patchToolsRows(block.tools);
        block.tools = rows;
        total += changed;
      }
    }
  }
  return { out, changedRows: total, touched: total > 0 || Array.isArray(out.tools) || !!out.resources };
}

const args = parseArgs(process.argv);
const agentId = args.agent || process.env.PERSIST_AGENT || "A532408";
const ref = args.ref || process.env.PERSIST_REF || "main";
const dryRun = args.dryRun;

const cds = (await import("@sap/cds")).default;
cds.root = root;
await cds.load("*");

const { Octokit } = await import("octokit");

const github = await cds.connect.to("github");
const { token, url } = github?.options?.credentials ?? {};
if (!token) {
  console.error(
    "[patch-eval-all-granted] No GitHub token. Run:\n" +
      "  npx cds bind --profile hybrid --exec -- node scripts/patch-eval-all-granted.mjs",
  );
  process.exit(1);
}
const octokit = new Octokit({
  auth: token,
  baseUrl: url ?? "https://github.tools.sap/api/v3",
  userAgent: "grant-management-patch-eval-all-granted",
});
const owner = process.env.MCP_AMS_POLICIES_OWNER || "AIAM";
const repo = process.env.MCP_AMS_POLICIES_REPO || "policies";

async function listJsonUnderEval(prefix) {
  const paths = [];
  let data;
  try {
    const res = await octokit.rest.repos.getContent({ owner, repo, path: prefix, ref });
    data = res.data;
  } catch (e) {
    if (e.status === 404) return paths;
    throw e;
  }
  const items = Array.isArray(data) ? data : [data];
  for (const item of items) {
    if (item.type === "file" && item.name.endsWith(".json")) {
      paths.push(item.path);
    } else if (item.type === "dir") {
      const sub = await listJsonUnderEval(item.path);
      paths.push(...sub);
    }
  }
  return paths;
}

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

const evalRoot = `${agentId}/eval`;
const jsonPaths = await listJsonUnderEval(evalRoot);
if (jsonPaths.length === 0) {
  console.error(`[patch-eval-all-granted] No JSON under ${evalRoot}@${ref}`);
  process.exit(1);
}

let filesUpdated = 0;
let rowsPatched = 0;

for (const path of jsonPaths.sort()) {
  const { data } = await octokit.rest.repos.getContent({ owner, repo, path, ref });
  if (!("content" in data) || data.type !== "file") continue;
  const raw = decodeFileContent(data);
  let art;
  try {
    art = JSON.parse(raw);
  } catch {
    console.warn(`[patch-eval-all-granted] skip (invalid JSON): ${path}`);
    continue;
  }
  const { out, changedRows, touched } = patchArtifact(art);
  if (!touched) {
    console.log(`[patch-eval-all-granted] skip (no tools): ${path}`);
    continue;
  }
  if (changedRows === 0) {
    console.log(`[patch-eval-all-granted] unchanged: ${path}`);
    continue;
  }
  rowsPatched += changedRows;
  const body = `${JSON.stringify(out, null, 2)}\n`;
  if (dryRun) {
    console.log(`[patch-eval-all-granted] dry-run would patch ${changedRows} row(s): ${path}`);
    filesUpdated++;
    continue;
  }
  await putRepoFile(path, body, `eval: grant all tools (demo) ${path}`);
  filesUpdated++;
  console.log(`[patch-eval-all-granted] wrote ${path} (${changedRows} tool row(s))`);
}

console.log(
  `[patch-eval-all-granted] done: ${filesUpdated} file(s)${dryRun ? " (dry-run)" : ""}, ${rowsPatched} tool row(s) patched`,
);
process.exit(0);
