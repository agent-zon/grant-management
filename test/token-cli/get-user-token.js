#!/usr/bin/env node

/**
 * Script to fetch an access token for MCP server authentication
 * 
 * Outputs the token to stdout (suitable for use in command substitution)
 * 
 * Usage:
 *   node scripts/get-mcp-token.js
 *   TOKEN=$(node scripts/get-mcp-token.js)
 *   npm run token:user --silent  # Use --silent to suppress npm output
 * 
 * Environment Variables:
 *   TEST_USER - Test user email/username (for password grant)
 *   TEST_PASSWORD - Test user password (for password grant)
 *   APPROUTER_CLIENT_ID - Approuter client ID for audience (defaults to known value)
 *   MCP_RESOURCE - Resource for token request (e.g., "grant-mcp")
 */

import { IdentityService } from "@sap/xssec";
import cds from "@sap/cds";
import { jwtDecode } from "jwt-decode";

// Try to load dotenv if available
async function loadDotenv() {
  try {
    const dotenv = await import("dotenv");
    dotenv.default.config();
  } catch (e) {
    // dotenv not available, use process.env directly
  }
}

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

    const TEST_USER = process.env.TEST_USER;
    const TEST_PASSWORD = process.env.TEST_PASSWORD;

    // Try password grant if TEST_USER and TEST_PASSWORD are set
    if (TEST_USER && TEST_PASSWORD) {
      if (process.stderr.isTTY) {
        console.error("🔐 Using password grant with TEST_USER...");
      }
      tokenResponse = await authService.fetchPasswordToken(
        TEST_USER,
        TEST_PASSWORD,
        {
          grant_type: "password",
        }
      );
    } else {
      // Fall back to client credentials grant
      tokenResponse = await clientCredentials(authService);
    }

    // Debug output to stderr (only when interactive)
    if (process.stderr.isTTY) {
      console.error("✅ Token acquired successfully");
      console.error(`   Token (first 50 chars): ${tokenResponse.access_token.substring(0, 50)}...`);
      console.error(`   Expires in: ${tokenResponse.expires_in} seconds`);

      // Decode and display token claims
      try {
        const claims = jwtDecode(tokenResponse.access_token);
        console.error("\n📋 Token Claims:");
        console.error(`   Issuer: ${claims.iss}`);
        console.error(`   Subject: ${claims.sub}`);
        console.error(`   Audience: ${Array.isArray(claims.aud) ? claims.aud.join(", ") : claims.aud}`);
        console.error(`   Expires: ${new Date(claims.exp * 1000).toISOString()}`);
        if (claims.scope) {
          console.error(`   Scopes: ${claims.scope}`);
        }
        // Check for grant-related claims
        if (claims.sid) {
          console.error(`   Session ID (sid): ${claims.sid} ⚠️  This should map to a grant`);
        }
        if (claims.jti) {
          console.error(`   JWT ID (jti): ${claims.jti} ⚠️  This should map to a grant`);
        }
        if (!claims.sid && !claims.jti) {
          console.error(`   ⚠️  WARNING: Token has no 'sid' or 'jti' - MCP service needs one of these to find the grant`);
        }
      } catch (e) {
        console.error("⚠️  Could not decode token claims");
      }
    }

    // Return token (will be written to stdout by main function)
    return tokenResponse.access_token;
  } catch (error) {
    console.error("❌ Error getting access token:", error.message);
    if (error.response) {
      console.error("   Response:", await error.response.text().catch(() => "N/A"));
    }
    throw error;
  }
}

async function clientCredentials(authService) {
  if (process.stderr.isTTY) {
    console.error("🔐 Using client credentials grant...");
    console.error("ℹ️  Set TEST_USER and TEST_PASSWORD in .env for password grant");
  }

  // Try to get approuter client ID from environment or use a default
  const audience = process.env.APPROUTER_CLIENT_ID || "1a977efc-688c-4888-bb3b-f850d2ab20d0";

  const options = {
    audience: audience,
  };

  // Add resource if specified (e.g., "grant-mcp")
  const resource = process.env.MCP_RESOURCE;
  if (resource) {
    options.resource = `urn:sap:identity:application:provider:name:${resource}`;
    if (process.stderr.isTTY) {
      console.error(`   Resource: ${options.resource}`);
    }
  }

  return await authService.fetchClientCredentialsToken(options);
}

/**
 * Main function
 */
async function main() {
  // Load dotenv first
  await loadDotenv();
  
  try {
    const token = await getAccessToken();
    // Output token to stdout (only the token, with newline for reliable parsing)
    // This ensures clean output for command substitution: $(node scripts/get-mcp-token.js)
    // When used with cds bind, use: tail -1 to get only the token
    process.stdout.write(token + '\n');
    // Explicitly exit to prevent any trailing output
    process.exit(0);
  } catch (error) {
    // Errors go to stderr, not stdout
    console.error("❌ Script failed:", error.message);
    process.exit(1);
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
  (typeof process !== 'undefined' && process.argv[1] && 
   import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')));

if (isMainModule || !process.argv[1] || process.argv[1].includes('get-mcp-token')) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { getAccessToken };
