/**
 * IAS Token CLI - Main entry point
 * 
 * Supports multiple OAuth 2.0 grant types via subcommands:
 * - password: User token (password grant)
 * - client-credentials: Client credentials grant
 * - exchange: Token exchange grant
 * 
 * Outputs the token to stdout (suitable for use in command substitution)
 * 
 * Usage:
 *   npx cds bind --profile hybrid --exec -- ias-token-cli password -u <user> -p <pass>
 *   npx cds bind --profile hybrid --exec -- ias-token-cli client-credentials
 *   npx cds bind --profile hybrid --exec -- ias-token-cli exchange -t <token>
 */

import { Command } from "commander";
import { IdentityService } from "@sap/xssec";
import cds from "@sap/cds";
import { jwtDecode } from "jwt-decode";
import fetch from "node-fetch";
import { Agent } from "https";
import { inspect } from "util";

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
 * Display token information (to stderr)
 */
function displayTokenInfo(token) {
  if (!process.stderr.isTTY) {
    return; // Only display when interactive
  }

  console.error("✅ Token acquired successfully");
  console.error(`   Token (first 50 chars): ${token.substring(0, 50)}...`);

  try {
    const claims = jwtDecode(token);
    console.error("\n📋 Token Claims:");
    console.error(`   Issuer: ${claims.iss}`);
    console.error(`   Subject: ${claims.sub}`);
    console.error(`   Audience: ${Array.isArray(claims.aud) ? claims.aud.join(", ") : claims.aud}`);
    if (claims.exp) {
      console.error(`   Expires: ${new Date(claims.exp * 1000).toISOString()}`);
    }
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

/**
 * Main function
 */
async function main() {
  // Load dotenv first
  await loadDotenv();

  const program = new Command();

  program
    .name('ias-token-cli')
    .description('CLI to get tokens from IAS, run with npx cds bind')
    .version('1.0.0');

  // Client credentials command
  program
    .command('client-credentials')
    .alias('cc')
    .description('Get client credentials token')
    .option('-r, --resource <resource>', 'Add resource (e.g., grant-mcp)')
    .option('-aud, --audience <audience>', 'Add audience, default to binding client id')
    .option('-b, --binding <binding>', 'What binding to use', 'auth')
    .option('-v, --verbose', 'Verbose output')
    .action(async ({ resource, audience, binding, verbose }) => {
      const credentials = cds.env.requires?.[binding]?.credentials;
      const authService = new IdentityService(credentials);
      const { access_token } = await authService.fetchClientCredentialsToken({
        audience: audience || credentials.clientid,
        resource: resource ? `urn:sap:identity:application:provider:name:${resource}` : undefined
      });
      if (verbose) {
        displayTokenInfo(access_token);
      }
      console.log(access_token);
    });

  // Password grant command
  program
    .command('password')
    .alias('pw')
    .description('Get user token using password grant')
    .option('-u, --user <username>', 'Username (or use TEST_USER env var)')
    .option('-p, --password <password>', 'Password (or use TEST_PASSWORD env var)')
    .option('-b, --binding <binding>', 'What binding to use', 'auth')
    .option('-v, --verbose', 'Verbose output')
    .action(async ({ user, password: pwd, binding, verbose }) => {
      try {
        const username = user || process.env.TEST_USER;
        const password = pwd || process.env.TEST_PASSWORD;
        if (!username || !password) {
          console.error("❌ Error: Username and password required");
          console.error("   Use --user/-u and --password/-p flags, or set TEST_USER and TEST_PASSWORD env vars");
          process.exit(1);
        }
        const credentials = cds.env.requires?.[binding]?.credentials;
        const authService = new IdentityService(credentials);
        const tokenResponse = await authService.fetchPasswordToken(username, password, { grant_type: "password" });
        if (verbose) {
          displayTokenInfo(tokenResponse.access_token);
        }
        process.stdout.forEach(line => {
          process.stdout.clearLine(line);
        });
        process.stdout.write(JSON.stringify(tokenResponse));
      } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
      }
    });

  // Token exchange command
  program
    .command('exchange')
    .alias('ex')
    .description('Get token using token exchange grant')
    .requiredOption('-s, --subject_token <subject_token>', 'Subject token to exchange')
    .option('-st --subject_token_type <subject_token_type>', 'Type of subject token to exchange', 'urn:ietf:params:oauth:token-type:access_token')
    .option('-r, --resource <resource>', 'Resource to exchange')
    .option('-a --requested_actor <requested_actor>', 'The unique identifier of the actor for which the client is requesting delegated access on behalf of the user. ')
    .option('-b, --binding <binding>', 'What binding to use', 'auth')
    .option('-v, --verbose', 'Verbose output')

    .action(async ({ subject_token, subject_token_type, resource, requested_actor, binding, verbose }) => {
      const credentials = cds.env.requires?.[binding]?.credentials;
      const authService = new IdentityService(credentials);
      const tokenUrl = await authService.getTokenUrl("urn:ietf:params:oauth:grant-type:token-exchange");
      const response = await fetch(tokenUrl.href, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
          subject_token: subject_token,
          // resource: resource,
          subject_token_type: subject_token_type,
          client_id: credentials.clientid,
          // agentic_context: requested_actor ? {
          //   actor: requested_actor,
          // } : undefined
        }),
        agent: new Agent({ key: credentials.key, cert: credentials.certificate }),
      });
      if (!response.ok) {
        console.error(`Token exchange failed: ${response.status} ${response.statusText}\n ${await response.text()}`, "\n\n", inspect({
          subject_token,
          subject_token_type,
          resource,
          requested_actor,
          client_id: credentials.clientid
        }, true, 1, true));
        throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
      }
      const { access_token } = await response.json();
      if (verbose) {
        displayTokenInfo(access_token);
      }
      console.log(access_token);
    });

  program.parse(process.argv);

  // If no command provided, show help
  if (!process.argv.slice(2).length) {
    program.outputHelp();
    process.exit(1);
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
  (typeof process !== 'undefined' && process.argv[1] &&
    import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')));

if (isMainModule || !process.argv[1] || process.argv[1].includes('ias-token')) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

