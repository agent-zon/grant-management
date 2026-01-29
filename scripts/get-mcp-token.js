#!/usr/bin/env node

/**
 * Wrapper script for IAS Token CLI
 * 
 * This script is maintained for backward compatibility.
 * It delegates to the ias-token-cli tool in tools/ias-token-cli
 * 
 * Usage:
 *   # Password grant (default, uses TEST_USER/TEST_PASSWORD env vars)
 *   node scripts/get-mcp-token.js
 *   npm run token:user --silent
 * 
 *   # With explicit password grant
 *   node scripts/get-mcp-token.js password -u <user> -p <pass>
 * 
 *   # Client credentials
 *   node scripts/get-mcp-token.js client-credentials
 * 
 *   # Token exchange
 *   node scripts/get-mcp-token.js exchange -t <token>
 * 
 * All arguments are passed through to ias-token-cli.
 * See: tools/ias-token-cli/README.md for full documentation
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");
const cliPath = join(projectRoot, "tools", "ias-token-cli", "bin", "ias-token.js");

// Pass all arguments to the CLI tool
let args = process.argv.slice(2);

// If no arguments provided and TEST_USER/TEST_PASSWORD are set, use password grant
if (args.length === 0 && process.env.TEST_USER && process.env.TEST_PASSWORD) {
  args = ["password"]; // Use password subcommand, it will read from env vars
}

const child = spawn("node", [cliPath, ...args], {
  stdio: "inherit",
  cwd: projectRoot,
});

child.on("error", (error) => {
  console.error("❌ Failed to start ias-token-cli:", error.message);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
