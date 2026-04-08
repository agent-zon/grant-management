#!/usr/bin/env node
/**
 * Run mcp-ams (stateless eval: POST /policies/{ref}/evaluate with inline `dcn`).
 * GitHub token is optional — AMS no longer reads/writes the policies repo.
 * Persist eval files: npm run persist:mcp-ams-eval (uses bind for Git + AMS for math only).
 *
 * Usage:
 *   node scripts/run-mcp-ams.mjs
 *   npx cds bind --profile hybrid --exec -- node scripts/run-mcp-ams.mjs   # optional; sets token if bound
 *
 * Forwards extra args to `go` (default: `go run .` in tools/mcp-ams).
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const mcpAmsDir = path.join(root, "tools", "mcp-ams");

const cds = (await import("@sap/cds")).default;
cds.root = root;
await cds.load("*");

let token;
let apiBase;

try {
  const github = await cds.connect.to("github");
  const creds = github?.options?.credentials ?? {};
  token = creds.token;
  // Same as git-handler: Enterprise hosts expose REST under .../api/v3
  if (creds.url && typeof creds.url === "string") {
    apiBase = creds.url.replace(/\/$/, "");
  }
} catch (e) {
  console.error("[run-mcp-ams] cds.connect.to('github') failed:", e?.message || e);
}

if (!token) {
  console.warn(
    "[run-mcp-ams] No GitHub token — starting AMS without repo access (eval via inline dcn only).",
  );
}

const env = { ...process.env };
if (token) {
  env.MCP_AMS_GITHUB_TOKEN = token;
  if (apiBase) env.MCP_AMS_GITHUB_API_BASE = apiBase;
}

const userArgs = process.argv.slice(2);
const goCmd = userArgs.length > 0 ? userArgs : ["run", "."];

const port = process.env.PORT || "8687";
const amsHint = (process.env.AMS_URL || `http://localhost:${port}`).replace(/\/$/, "");
console.log(
  `[run-mcp-ams] Starting mcp-ams PORT=${port} — stateless eval (inline dcn). Git: persist via npm run persist:mcp-ams-eval (separate bind).`,
);

const child = spawn("go", goCmd, {
  cwd: mcpAmsDir,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
