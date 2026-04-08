#!/usr/bin/env node
/**
 * Git + AMS eval pipeline (no Git inside mcp-ams):
 *  1. Read {agent}/policies.json from GitHub → Go normalize-dcn-policies → {agent}/dcn/policies.json (legal rules, schemas stripped).
 *  2. For each {agent}/mcps/*.yaml → Go mcp-to-dcn-schema → {agent}/dcn/schema/{resourceSlug}.json
 *  3. Merge normalized policies + per-resource schema → eval → {agent}/eval/{variant}/{policySlug}/{resourceSlug}.json
 *     If --eval-variant is omitted, path is {agent}/eval/{policySlug}/{resourceSlug}.json (no variant segment).
 *
 * --skip-dcn  Skip writing dcn/policies.json and dcn/schema/* (use after a full run when only eval files differ).
 *
 * Env: USE_GO_EVAL, PERSIST_EVAL_ENV, PERSIST_EVAL_VARIANT, PERSIST_SKIP_DCN=1, AMS_URL, PERSIST_AGENT, PERSIST_REF, PERSIST_RESOURCE
 */
import { spawnSync } from "node:child_process";
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

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--agent" && argv[i + 1]) out.agent = argv[++i];
    else if (a === "--resource" && argv[i + 1]) out.resource = argv[++i];
    else if (a === "--ref" && argv[i + 1]) out.ref = argv[++i];
    else if (a === "--env-json" && argv[i + 1]) out.envJsonPath = argv[++i];
    else if (a === "--eval-variant" && argv[i + 1]) out.evalVariant = argv[++i];
    else if (a === "--skip-dcn") out.skipDcn = true;
  }
  return out;
}

function mergeEnvDeep(base, extra) {
  const out = { ...base };
  for (const [k, v] of Object.entries(extra || {})) {
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      out[k] &&
      typeof out[k] === "object" &&
      !Array.isArray(out[k])
    ) {
      out[k] = mergeEnvDeep(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function mergeDcnForEval(policiesNorm, schemaObj) {
  return {
    version: policiesNorm.version ?? 1,
    policies: policiesNorm.policies ?? [],
    functions: policiesNorm.functions ?? [],
    tests: policiesNorm.tests ?? [],
    schemas: Array.isArray(schemaObj?.schemas) ? schemaObj.schemas : [],
  };
}

function runGo(cwd, goArgs, stdin) {
  return spawnSync("go", goArgs, {
    cwd,
    input: stdin,
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 120_000,
  });
}

const args = parseArgs(process.argv);
const agentId = args.agent || process.env.PERSIST_AGENT || "A532408";
const ref = args.ref || process.env.PERSIST_REF || "main";
const resourceFilter = (args.resource || process.env.PERSIST_RESOURCE || "").trim();
const evalVariantRaw = (args.evalVariant || process.env.PERSIST_EVAL_VARIANT || "").trim();
const skipDcn =
  args.skipDcn === true ||
  process.env.PERSIST_SKIP_DCN === "1" ||
  process.env.PERSIST_SKIP_DCN === "true";
const base = (process.env.AMS_URL || "http://127.0.0.1:8687").replace(/\/$/, "");
const useGoEval =
  process.env.USE_GO_EVAL === "1" ||
  process.env.USE_GO_EVAL === "true" ||
  process.env.USE_GO_EVAL === "yes";
const mcpAmsDir = join(root, "tools", "mcp-ams");

let evalEnvExtra = {};
if (args.envJsonPath) {
  try {
    evalEnvExtra = JSON.parse(readFileSync(args.envJsonPath, "utf8"));
  } catch (e) {
    console.error(`[persist-mcp-ams-eval] --env-json read failed: ${e.message || e}`);
    process.exit(1);
  }
} else if (process.env.PERSIST_EVAL_ENV?.trim()) {
  try {
    evalEnvExtra = JSON.parse(process.env.PERSIST_EVAL_ENV);
  } catch (e) {
    console.error(`[persist-mcp-ams-eval] PERSIST_EVAL_ENV must be JSON: ${e.message || e}`);
    process.exit(1);
  }
}

const YAML_EXT = /\.(yaml|yml)$/i;

function policyEvalFileSlug(qualified) {
  let s = String(qualified).trim().replace(/\//g, "_").replace(/\\/g, "_");
  s = s.replace(/^\.+|\.+$/g, "");
  return s || "_empty";
}

const evalVariantSlug = evalVariantRaw ? policyEvalFileSlug(evalVariantRaw) : "";

function flattenMeta(meta) {
  const flat = {};
  for (const [k, v] of Object.entries(meta || {})) {
    const key = k.startsWith("sap/") ? k.slice(4) : k;
    flat[key] = typeof v === "object" ? JSON.stringify(v) : v;
  }
  return flat;
}

function decodeFileContent(data) {
  const b64 = data.content?.replace(/\n/g, "") || "";
  return Buffer.from(b64, "base64").toString("utf8");
}

function explainFetchError(e) {
  const msg = e?.message || String(e);
  const c = e?.cause;
  const causeStr = c ? ` (${c.code || c.name || ""}: ${c.message || c})`.trim() : "";
  return `${msg}${causeStr}`.replace(/\s+\)/, ")");
}

const cds = (await import("@sap/cds")).default;
cds.root = root;
await cds.load("*");

const { Octokit } = await import("octokit");

const github = await cds.connect.to("github");
const { token, url } = github?.options?.credentials ?? {};
if (!token) {
  console.error(
    "[persist-mcp-ams-eval] No GitHub token. Run:\n" +
      "  npx cds bind github -2 git-credentials --on k8s\n" +
      "  npx cds bind --profile hybrid --exec -- node scripts/persist-mcp-ams-eval.mjs",
  );
  process.exit(1);
}
const octokit = new Octokit({
  auth: token,
  baseUrl: url ?? "https://github.tools.sap/api/v3",
  userAgent: "grant-management-persist-mcp-ams-eval",
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
  return true;
}

let polRaw;
try {
  const polPath = `${agentId}/policies.json`;
  const polRes = await octokit.rest.repos.getContent({ owner, repo, path: polPath, ref });
  polRaw = decodeFileContent(polRes.data);
} catch (e) {
  console.error(`[persist-mcp-ams-eval] Failed to read policies.json: ${e.status || ""} ${e.message || e}`);
  process.exit(1);
}

const normGo = runGo(mcpAmsDir, ["run", "./cmd/normalize-dcn-policies"], polRaw);
if (normGo.status !== 0) {
  console.error(`[persist-mcp-ams-eval] normalize-dcn-policies: ${(normGo.stderr || "").trim().slice(0, 1200)}`);
  process.exit(1);
}
const policiesNormText = (normGo.stdout || "").trim();
let policiesNorm;
try {
  policiesNorm = JSON.parse(policiesNormText);
} catch {
  console.error("[persist-mcp-ams-eval] normalize stdout is not JSON");
  process.exit(1);
}
const policyCount = Array.isArray(policiesNorm?.policies) ? policiesNorm.policies.length : 0;
if (policyCount === 0) {
  console.error(
    "[persist-mcp-ams-eval] Normalized policies are empty — nothing to evaluate. Check agent policies.json and normalize-dcn-policies output.",
  );
  process.exit(1);
}

let yamlFiles;
try {
  const { data } = await octokit.rest.repos.getContent({ owner, repo, path: `${agentId}/mcps`, ref });
  const items = Array.isArray(data) ? data : [data];
  yamlFiles = items.filter((e) => e.type === "file" && YAML_EXT.test(e.name));
  yamlFiles.sort((a, b) => a.name.localeCompare(b.name));
} catch (e) {
  console.error(`[persist-mcp-ams-eval] Failed to list mcps: ${e.status || ""} ${e.message || e}`);
  process.exit(1);
}

let toProcess = yamlFiles;
if (resourceFilter) {
  toProcess = yamlFiles.filter((f) => f.name.replace(YAML_EXT, "") === resourceFilter);
  if (toProcess.length === 0) {
    console.error(`[persist-mcp-ams-eval] No mcps file for resource "${resourceFilter}"`);
    process.exit(1);
  }
}
if (toProcess.length === 0) {
  console.error(`[persist-mcp-ams-eval] No MCP YAML under ${agentId}/mcps@${ref}`);
  process.exit(1);
}

console.log(
  useGoEval
    ? `[persist-mcp-ams-eval] eval=go (tools/mcp-ams/cmd/eval-policies)`
    : `[persist-mcp-ams-eval] AMS_URL=${base}`,
);
console.log(
  `[persist-mcp-ams-eval] Git write ${owner}/${repo} agent=${agentId} ref=${ref} skipDcn=${skipDcn} evalVariant=${evalVariantSlug || "(none)"} resources=${toProcess.map((f) => f.name.replace(YAML_EXT, "")).join(",")}`,
);

let written = 0;

if (!skipDcn) {
  try {
    await putRepoFile(
      `${agentId}/dcn/policies.json`,
      policiesNormText.endsWith("\n") ? policiesNormText : `${policiesNormText}\n`,
      `dcn: normalized policies ${agentId} @ ${ref}`,
    );
    written++;
    console.log(`[persist-mcp-ams-eval] wrote ${agentId}/dcn/policies.json`);
  } catch (e) {
    console.error(`[persist-mcp-ams-eval] write dcn/policies.json: ${e.message || e}`);
    process.exit(1);
  }
} else {
  console.log(`[persist-mcp-ams-eval] skip dcn/policies.json (--skip-dcn)`);
}

const evaluateUrl = `${base}/policies/${encodeURIComponent(ref)}/evaluate`;

async function runOneEval(postBody) {
  if (useGoEval) {
    const r = runGo(mcpAmsDir, ["run", "./cmd/eval-policies", "-ref", ref], JSON.stringify(postBody));
    if (r.error) {
      console.error(`[persist-mcp-ams-eval] go eval-policies: ${explainFetchError(r.error)}`);
      return null;
    }
    if (r.status !== 0) {
      console.error(`[persist-mcp-ams-eval] go eval-policies exit ${r.status}: ${(r.stderr || r.stdout || "").trim().slice(0, 1200)}`);
      return null;
    }
    try {
      return JSON.parse(r.stdout || "{}");
    } catch {
      console.error(`[persist-mcp-ams-eval] go stdout not JSON: ${(r.stdout || "").slice(0, 800)}`);
      return null;
    }
  }
  try {
    const health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5_000) });
    if (!health.ok) {
      console.error(`[persist-mcp-ams-eval] GET /health → HTTP ${health.status}`);
      return null;
    }
  } catch (e) {
    console.error(`[persist-mcp-ams-eval] Cannot reach mcp-ams at ${base}: ${explainFetchError(e)}`);
    console.error("Start AMS or set USE_GO_EVAL=1.");
    return null;
  }
  let res;
  try {
    res = await fetch(evaluateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postBody),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (e) {
    console.error("[persist-mcp-ams-eval] evaluate failed:", explainFetchError(e));
    return null;
  }
  const text = await res.text();
  if (!res.ok) {
    console.error(`[persist-mcp-ams-eval] AMS HTTP ${res.status}: ${text.slice(0, 1200)}`);
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    console.error(`[persist-mcp-ams-eval] AMS non-JSON: ${text.slice(0, 1200)}`);
    return null;
  }
}

for (const yamlEntry of toProcess) {
  const resourceName = yamlEntry.name.replace(YAML_EXT, "");
  const resourceSlug = policyEvalFileSlug(resourceName);
  let cardContent;
  try {
    const fileRes = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: `${agentId}/mcps/${yamlEntry.name}`,
      ref,
    });
    cardContent = decodeFileContent(fileRes.data);
  } catch (e) {
    console.error(`[persist-mcp-ams-eval] read mcps/${yamlEntry.name}: ${e.message || e}`);
    continue;
  }

  const doc = yaml.load(cardContent);
  const tools = Array.isArray(doc?.tools) ? doc.tools : [];
  const mcpSchemaForGo = {
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description || "",
      inputSchema:
        t.inputSchema && typeof t.inputSchema === "object"
          ? t.inputSchema
          : { type: "object", properties: {} },
    })),
  };
  if (mcpSchemaForGo.tools.length === 0) {
    mcpSchemaForGo.tools = [
      {
        name: "_persist_placeholder",
        description: "",
        inputSchema: { type: "object", properties: {} },
      },
    ];
  }

  const schemaGo = runGo(mcpAmsDir, ["run", "./cmd/mcp-to-dcn-schema"], JSON.stringify(mcpSchemaForGo));
  if (schemaGo.status !== 0) {
    console.error(`[persist-mcp-ams-eval] mcp-to-dcn-schema (${resourceName}): ${(schemaGo.stderr || "").trim().slice(0, 800)}`);
    continue;
  }
  let schemaObj;
  try {
    schemaObj = JSON.parse(schemaGo.stdout || "{}");
  } catch {
    console.error(`[persist-mcp-ams-eval] schema stdout not JSON for ${resourceName}`);
    continue;
  }

  if (!skipDcn) {
    try {
      await putRepoFile(
        `${agentId}/dcn/schema/${resourceSlug}.json`,
        `${JSON.stringify(schemaObj, null, 2)}\n`,
        `dcn: schema ${agentId}/${resourceName} @ ${ref}`,
      );
      written++;
      console.log(`[persist-mcp-ams-eval] wrote ${agentId}/dcn/schema/${resourceSlug}.json`);
    } catch (e) {
      console.error(`[persist-mcp-ams-eval] write dcn/schema: ${e.message || e}`);
      continue;
    }
  }

  let toolIns = tools.map((t) => ({
    name: t.name,
    title: t.title || t.name,
    description: t.description || "",
    props: flattenMeta(t._meta || {}),
  }));
  if (toolIns.length === 0) {
    toolIns = [{ name: "_persist_placeholder", title: "Placeholder", description: "", props: {} }];
  }

  const mergedDcn = mergeDcnForEval(policiesNorm, schemaObj);
  const postBody = {
    agentId,
    activePolicy: "",
    env: mergeEnvDeep(
      {
        time: new Date().toISOString(),
        tid: `persist-mcp-ams-eval-${resourceSlug}-${Date.now()}`,
      },
      evalEnvExtra,
    ),
    user: {},
    input: {
      app: flattenMeta(doc?._meta || {}),
      tools: toolIns,
    },
    dcn: mergedDcn,
  };

  const evalJson = await runOneEval(postBody);
  if (!evalJson) {
    console.error(`[persist-mcp-ams-eval] eval failed for resource ${resourceName}`);
    continue;
  }

  const byPolicy = Array.isArray(evalJson.byPolicy) ? evalJson.byPolicy : [];
  const now = new Date().toISOString();

  for (const slice of byPolicy) {
    const q = slice.policy;
    const rows = slice.tools;
    if (!q || !Array.isArray(rows)) continue;
    const polSlug = policyEvalFileSlug(q);
    const variantSeg = evalVariantSlug ? `${evalVariantSlug}/` : "";
    const evalPath = `${agentId}/eval/${variantSeg}${polSlug}/${resourceSlug}.json`;
    const art = {
      policy: q,
      resource: resourceName,
      ref,
      evalVariant: evalVariantSlug || "default",
      updatedAt: now,
      tools: rows,
    };
    try {
      await putRepoFile(
        evalPath,
        `${JSON.stringify(art, null, 2)}\n`,
        `eval[${evalVariantSlug || "default"}]: ${agentId} ${resourceName} ${q} @ ${ref}`,
      );
      written++;
      console.log(`[persist-mcp-ams-eval] wrote ${evalPath}`);
    } catch (e) {
      console.error(`[persist-mcp-ams-eval] write ${evalPath}: ${e.message || e}`);
    }
  }
}

console.log(`[persist-mcp-ams-eval] done: ${written} file(s) touched`);
process.exit(written > 0 ? 0 : 1);
