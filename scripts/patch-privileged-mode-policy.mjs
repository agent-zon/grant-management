#!/usr/bin/env node
/**
 * Replace the `privileged_mode` policy in {agent}/policies.json on GitHub with the fragment
 * srv/policies-service/yaml-examples/policies/privileged_mode.with-env-condition.json
 *
 *   npx cds bind --profile hybrid --exec -- node scripts/patch-privileged-mode-policy.mjs -- --agent agent-123 --ref main
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fragPath = join(
  root,
  "srv/policies-service/yaml-examples/policies/privileged_mode.with-env-condition.json",
);
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
    else if (a === "--ref" && argv[i + 1]) out.ref = argv[++i];
  }
  return out;
}

const args = parseArgs(process.argv);
const agentId = args.agent || process.env.PATCH_AGENT || "agent-123";
const ref = args.ref || process.env.PATCH_REF || "main";

const fragment = JSON.parse(readFileSync(fragPath, "utf8"));

function policyKey(p) {
  return Array.isArray(p?.policy) ? p.policy.join(".") : "";
}

const cds = (await import("@sap/cds")).default;
cds.root = root;
await cds.load("*");
const { Octokit } = await import("octokit");
const github = await cds.connect.to("github");
const { token, url } = github?.options?.credentials ?? {};
if (!token) {
  console.error("No GitHub token (cds bind github …)");
  process.exit(1);
}
const octokit = new Octokit({
  auth: token,
  baseUrl: url ?? "https://github.tools.sap/api/v3",
  userAgent: "grant-management-patch-privileged-mode",
});
const owner = process.env.MCP_AMS_POLICIES_OWNER || "AIAM";
const repo = process.env.MCP_AMS_POLICIES_REPO || "policies";
const path = `${agentId}/policies.json`;

function decodeFileContent(data) {
  const b64 = data.content?.replace(/\n/g, "") || "";
  return Buffer.from(b64, "base64").toString("utf8");
}

const { data: fileRes } = await octokit.rest.repos.getContent({ owner, repo, path, ref });
const doc = JSON.parse(decodeFileContent(fileRes));
if (!Array.isArray(doc.policies)) {
  console.error("policies.json: missing policies array");
  process.exit(1);
}
let idx = doc.policies.findIndex((p) => policyKey(p) === "privileged_mode");
if (idx < 0) {
  doc.policies.push(fragment);
  console.log(`[patch] appended privileged_mode to ${path}`);
} else {
  doc.policies[idx] = fragment;
  console.log(`[patch] replaced privileged_mode at index ${idx} in ${path}`);
}
const body = `${JSON.stringify(doc, null, 2)}\n`;
const content = Buffer.from(body, "utf8").toString("base64");
await octokit.rest.repos.createOrUpdateFileContents({
  owner,
  repo,
  path,
  message: `policies: privileged_mode grants require $env.grant.privileged_mode (${agentId})`,
  content,
  branch: ref,
  sha: fileRes.sha,
});
console.log(`[patch] committed ${path}@${ref}`);
