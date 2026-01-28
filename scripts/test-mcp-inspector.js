#!/usr/bin/env node

/**
 * Script to get an access token and list MCP tools using MCP Inspector CLI
 * 
 * Usage:
 *   node scripts/test-mcp-inspector.js
 *   npm run inspector:mcp:test
 * 
 * Environment Variables:
 *   TEST_USER - Test user email/username (for password grant)
 *   TEST_PASSWORD - Test user password (for password grant)
 *   MCP_TOKEN - Manually provided token (skips token fetch if set)
 *   MCP_URL - MCP server URL (defaults to production URL)
 *   MCP_TRANSPORT - Transport type: "http" or "sse" (defaults to "http")
 *   MCP_METHOD - MCP method to call (defaults to "tools/list")
 *   APPROUTER_CLIENT_ID - Approuter client ID for audience (defaults to known value)
 *   MCP_RESOURCE - Resource for token request (e.g., "grant-mcp")
 */

import { IdentityService } from "@sap/xssec";
import cds from "@sap/cds";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { join } from "path";
import { jwtDecode } from "jwt-decode";
// Try to load dotenv if available (using dynamic import in async context)
async function loadDotenv() {
  try {
    const dotenv = await import("dotenv");
    dotenv.default.config();
  } catch (e) {
    // dotenv not available, use process.env directly
    console.log("ℹ️  dotenv not available, using process.env directly");
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Configuration (will be set after dotenv loads)
let MCP_URL, MCP_TRANSPORT, MCP_METHOD, TEST_USER, TEST_PASSWORD, MCP_TOKEN, MCP_RESOURCE;

/**
 * Get access token using IdentityService
 */
async function getAccessToken() {
  const credentials = cds.env.requires?.auth?.credentials;

  if (!credentials) {
    throw new Error(
      "❌ No auth credentials found. " +
      "Please configure auth service or use 'cds bind --profile hybrid' to bind to a service instance."
    );
  }

  const authService = new IdentityService(credentials);

  try {
    let tokenResponse;

    // Try password grant if TEST_USER and TEST_PASSWORD are set
    if (TEST_USER && TEST_PASSWORD) {
      console.log("🔐 Using password grant with TEST_USER...");
      tokenResponse = await authService.fetchPasswordToken(
        TEST_USER,
        TEST_PASSWORD,
        {
          grant_type: "password",
        }
      );
    } else {
      // Fall back to client credentials grant
      console.log("🔐 Using client credentials grant...");
      console.log("ℹ️  Set TEST_USER and TEST_PASSWORD in .env for password grant");
      
      // Try to get approuter client ID from environment or use a default
      const audience = process.env.APPROUTER_CLIENT_ID || "1a977efc-688c-4888-bb3b-f850d2ab20d0";
      
      const options = {
        audience: audience,
      };
      
      // Add resource if specified (e.g., "grant-mcp")
      const resource = process.env.MCP_RESOURCE;
      if (resource) {
        options.resource = `urn:sap:identity:application:provider:name:${resource}`;
        console.log(`   Resource: ${options.resource}`);
      }
      
      tokenResponse = await authService.fetchClientCredentialsToken(options);
    }

    console.log("✅ Token acquired successfully");
    console.log(`   Token (first 50 chars): ${tokenResponse.access_token.substring(0, 50)}...`);
    console.log(`   Expires in: ${tokenResponse.expires_in} seconds`);

    // Decode and display token claims
    try {
      const claims = jwtDecode(tokenResponse.access_token);
      console.log("\n📋 Token Claims:");
      console.log(`   Issuer: ${claims.iss}`);
      console.log(`   Subject: ${claims.sub}`);
      console.log(`   Audience: ${Array.isArray(claims.aud) ? claims.aud.join(", ") : claims.aud}`);
      console.log(`   Expires: ${new Date(claims.exp * 1000).toISOString()}`);
      if (claims.scope) {
        console.log(`   Scopes: ${claims.scope}`);
      }
      // Check for grant-related claims
      if (claims.sid) {
        console.log(`   Session ID (sid): ${claims.sid} ⚠️  This should map to a grant`);
      }
      if (claims.jti) {
        console.log(`   JWT ID (jti): ${claims.jti} ⚠️  This should map to a grant`);
      }
      if (!claims.sid && !claims.jti) {
        console.log(`   ⚠️  WARNING: Token has no 'sid' or 'jti' - MCP service needs one of these to find the grant`);
      }
    } catch (e) {
      console.log("⚠️  Could not decode token claims");
    }

    return tokenResponse.access_token;
  } catch (error) {
    console.error("❌ Error getting access token:", error.message);
    if (error.response) {
      console.error("   Response:", await error.response.text().catch(() => "N/A"));
    }
    throw error;
  }
}

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
 * Run MCP Inspector CLI to list tools using direct URL and headers
 */
function runMCPInspector(token, url, transport, method) {
  console.log("\n🔍 Running MCP Inspector CLI to list tools...");
  console.log(`   URL: ${url}`);
  console.log(`   Transport: ${transport}`);
  console.log(`   Method: ${method}`);
  console.log(`   Authorization: Bearer ${token.substring(0, 20)}...\n`);

  try {
    // Build command arguments - header value must be quoted
    const headerValue = `Authorization: Bearer ${token}`;
    const args = [
      'npx',
      '-y',
      '@modelcontextprotocol/inspector',
      '--cli',
      url,
      '--transport',
      transport,
      '--method',
      method,
      '--header',
      `"${headerValue}"`  // Quote the header value to handle spaces
    ];
    
    const command = args.join(' ');
    console.log(`📋 Executing: ${command}\n`);
    
    const output = execSync(command, {
      encoding: "utf-8",
      stdio: "inherit",
      cwd: projectRoot,
      shell: true, // Use shell to handle quotes properly
    });

    return output;
  } catch (error) {
    console.error("\n❌ MCP Inspector CLI failed:", error.message);
    if (error.status) {
      console.error(`   Exit code: ${error.status}`);
    }
    if (error.stderr) {
      console.error(`   Error output: ${error.stderr}`);
    }
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  // Load dotenv first
  await loadDotenv();
  
  // Set configuration after dotenv loads
  MCP_URL = process.env.MCP_URL || "https://agents-srv-grants.c-127c9ef.stage.kyma.ondemand.com/mcp/streaming";
  MCP_TRANSPORT = process.env.MCP_TRANSPORT; // Defaults to "http" if not set
  MCP_METHOD = process.env.MCP_METHOD || "tools/list";
  TEST_USER = process.env.TEST_USER;
  TEST_PASSWORD = process.env.TEST_PASSWORD;
  MCP_TOKEN = process.env.MCP_TOKEN; // Manually provided token
  MCP_RESOURCE = process.env.MCP_RESOURCE; // Resource for token request (e.g., "grant-mcp")
  
  const transport = determineTransport(MCP_URL, MCP_TRANSPORT);
  const method = MCP_METHOD;
  
  console.log("🚀 MCP Inspector Test Script\n");
  console.log("Configuration:");
  console.log(`   MCP URL: ${MCP_URL}`);
  console.log(`   Transport: ${transport} (${MCP_TRANSPORT ? 'explicit' : 'auto-detected'})`);
  console.log(`   Method: ${method}`);
  if (MCP_TOKEN) {
    console.log(`   Token: Using manually provided token (MCP_TOKEN)`);
  } else {
    console.log(`   Auth Method: ${TEST_USER && TEST_PASSWORD ? "Password Grant" : "Client Credentials"}`);
    if (MCP_RESOURCE) {
      console.log(`   Resource: ${MCP_RESOURCE}`);
    }
  }
  console.log();

  try {
    // Step 1: Get access token (or use provided one)
    let token;
    if (MCP_TOKEN) {
      console.log("🔐 Using manually provided token from MCP_TOKEN environment variable");
      token = MCP_TOKEN;
      
      // Decode and display token claims for debugging
      try {
        const claims = jwtDecode(token);
        console.log("\n📋 Token Claims:");
        console.log(`   Issuer: ${claims.iss}`);
        console.log(`   Subject: ${claims.sub}`);
        console.log(`   Audience: ${Array.isArray(claims.aud) ? claims.aud.join(", ") : claims.aud}`);
        console.log(`   Expires: ${new Date(claims.exp * 1000).toISOString()}`);
        if (claims.sid) {
          console.log(`   Session ID (sid): ${claims.sid}`);
        }
        if (claims.jti) {
          console.log(`   JWT ID (jti): ${claims.jti}`);
        }
        if (!claims.sid && !claims.jti) {
          console.log(`   ⚠️  WARNING: Token has no 'sid' or 'jti' - MCP service needs one of these to find the grant`);
        }
      } catch (e) {
        console.log("⚠️  Could not decode token claims");
      }
    } else {
      token = await getAccessToken();
    }

    // Step 2: Run MCP Inspector CLI with direct URL and header
    runMCPInspector(token, MCP_URL, transport, method);

    console.log("\n✅ Successfully listed MCP tools!");
  } catch (error) {
    console.error("\n❌ Script failed:", error.message);
    process.exit(1);
  }
}

// Run if called directly
// Check if this module is being executed directly (not imported)
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
  (typeof process !== 'undefined' && process.argv[1] && 
   import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')));

if (isMainModule || !process.argv[1] || process.argv[1].includes('test-mcp-inspector')) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { main, getAccessToken, runMCPInspector, determineTransport };
