#!/usr/bin/env node

/**
 * Script to run MCP Inspector CLI with authentication
 * 
 * This script calls the MCP Inspector CLI directly, using the token script
 * in command substitution for the Authorization header.
 * 
 * Usage:
 *   # Direct usage (auto-fetches token)
 *   node scripts/mcp-inspector.js
 *   
 *   # With custom token
 *   MCP_TOKEN=your-token node scripts/mcp-inspector.js
 *   
 *   # With custom URL
 *   MCP_URL=https://example.com/mcp node scripts/mcp-inspector.js
 *   
 *   # Using npm script
 *   npm run inspector:mcp:test
 * 
 * You can also use the token script directly in your own commands:
 *   npx -y @modelcontextprotocol/inspector \
 *     --url https://example.com/mcp/streaming \
 *     --transport http \
 *     --method tools/list \
 *     --header "Authorization: Bearer $(node scripts/get-mcp-token.js)"
 * 
 * Or with npm script:
 *   npx -y @modelcontextprotocol/inspector \
 *     --url https://example.com/mcp/streaming \
 *     --transport http \
 *     --method tools/list \
 *     --header "Authorization: Bearer $(npm run token:user --silent)"
 * 
 * Environment Variables:
 *   MCP_TOKEN - Access token (if not set, will use get-mcp-token.js)
 *   MCP_URL - MCP server URL (defaults to production URL)
 *   MCP_TRANSPORT - Transport type: "http" or "sse" (defaults to "http")
 *   MCP_METHOD - MCP method to call (defaults to "tools/list")
 */

import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { join } from "path";
import { getAccessToken } from "./test-mcp-inspector";

// Try to load dotenv if available
async function loadDotenv() {
  try {
    const dotenv = await import("dotenv");
    dotenv.default.config();
  } catch (e) {
    // dotenv not available, use process.env directly
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

/**
 * Determine transport type from URL
 */
function determineTransport(url, explicitTransport) {
  // If explicitly set, use it
  if (explicitTransport) {
    return explicitTransport;
  }
  
  // Default to http transport
  return 'http';
}

/**
 * Main function
 */
async function main() {
  // Load dotenv first
  await loadDotenv();
  
  // Set configuration after dotenv loads
  const MCP_URL = process.env.MCP_URL || "https://agents-srv-grants.c-127c9ef.stage.kyma.ondemand.com/mcp/streaming";
  const MCP_TRANSPORT = process.env.MCP_TRANSPORT; // Defaults to "http" if not set
  const MCP_METHOD = process.env.MCP_METHOD || "tools/list";
  const MCP_TOKEN = process.env.MCP_TOKEN;
  
  const transport = determineTransport(MCP_URL, MCP_TRANSPORT);
  const method = MCP_METHOD;
  
  console.log("🚀 MCP Inspector Script\n");
  console.log("Configuration:");
  console.log(`   MCP URL: ${MCP_URL}`);
  console.log(`   Transport: ${transport} (${MCP_TRANSPORT ? 'explicit' : 'auto-detected'})`);
  console.log(`   Method: ${method}`);
  console.log();

  try {
 
    const headerValue = `Authorization: Bearer ${MCP_TOKEN ||await getAccessToken()}`;
    
    // Build command arguments
    const args = [
      'npx',
      '-y',
      '@modelcontextprotocol/inspector',
      '--cli',
      MCP_URL,
      '--transport',
      transport,
      '--method',
      method,
      '--header',
      headerValue
    ];
    
    const command = args.join(' ');
    console.log(`📋 Executing: ${command.replace(/Bearer [^\s]+/, 'Bearer [TOKEN]')}\n`);
    
    const output = execSync(command, {
      encoding: "utf-8",
      stdio: "inherit",
      cwd: projectRoot,
      shell: true,
    });

    console.log("\n✅ Successfully completed!");
    return output;
  } catch (error) {
    console.error("\n❌ MCP Inspector CLI failed:", error.message);
    if (error.status) {
      console.error(`   Exit code: ${error.status}`);
    }
    if (error.stderr) {
      console.error(`   Error output: ${error.stderr}`);
    }
    process.exit(1);
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
  (typeof process !== 'undefined' && process.argv[1] && 
   import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')));

if (isMainModule || !process.argv[1] || process.argv[1].includes('mcp-inspector')) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { main };
