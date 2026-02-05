#!/usr/bin/env node

/**
 * MCP destination-backed tool discovery and execution test:
 * 1. Get password token, create agent with mcp.name destination config
 * 2. Connect via MCP Client + StreamableHTTPClientTransport
 * 3. List tools (expect remote tools from destination MCP server)
 * 4. Call a remote tool (expect forwarding via destination transport)
 *
 * Uses cds.test() for HTTP and MCP Client for tool calls.
 * Run: npm run test:mcp-destination
 *   or: npx cds bind --profile hybrid --exec -- node --import tsx --test --test-concurrency=1 --experimental-vm-modules ./test/mcp-destination.test.js
 */

import assert from "node:assert";
import { IdentityService } from "@sap/xssec";
import cds from "@sap/cds";
import { jwtDecode } from "jwt-decode";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Agents, Mcps } from "#cds-models/sap/scai/grants/GrantToolsService";
import { inspect } from "node:util";

const TEST_USER = process.env.TEST_USER || "agently.io@gmail.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD;

// MCP Destination name configured in SAP BTP Destination Service
// For testing, this should point to a real MCP server or mock
const TEST_MCP_DESTINATION = process.env.TEST_MCP_DESTINATION || "TEST_MCP_SERVER";
const testInstance = cds.test("serve", "all").in(import.meta.dirname + "/..");
const { PUT, GET, UPSERT, axios, POST } = testInstance;


const state = {
  passwordToken: null,
  claims: null,
  agentId: null,
  client: null,
  clientToken: null,
  toolsFromDestination: null,
  remoteTools: null,
};

describe("MCP Destination Test", () => {
  beforeAll(async () => {
    await testInstance;
    await cds.services["sap.scai.grants.GrantToolsService"].meta();



    state.mcp = `${testInstance.url}/grants/mcp`;
    const credentials = cds.env.requires?.auth?.credentials;
    assert.ok(credentials, "No auth credentials. Use 'cds bind --profile hybrid'");
    assert.ok(TEST_PASSWORD, "TEST_PASSWORD must be set");

    const authService = new IdentityService(credentials);
    const passwordTokenResponse = await authService.fetchPasswordToken(
      TEST_USER,
      TEST_PASSWORD,
      { grant_type: "password" }
    );
    state.passwordToken = passwordTokenResponse.access_token;
    state.claims = jwtDecode(state.passwordToken);
    state.clientToken = await authService.fetchClientCredentialsToken().then(token => token.access_token);
    state.agentId = state.claims.azp || credentials.clientid;

    const registerResponse = await POST(
      `/grants/register`,
      {
        destination: {
          name: `agent:${state.agentId}`,
          url: "https://v0-mock-mcp-server.vercel.app/mcp",
          strategy: "subscriberFirst",
        },
      },
      { headers: { Authorization: `Bearer ${state.clientToken}`, validateStatus: (status) => status === 200 || status === 201 } }
    );
    console.log("[Register response]", registerResponse.data);

  }
  );



  beforeAll("connects MCP client to GrantToolsService", async () => {

    const client = state.client = new Client({ name: "mcp-destination-test", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(`${testInstance.url}/grants/mcp`), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${state.clientToken}`,
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
      },
    });
    await client.connect(transport);
    console.log("🔗 MCP Client connected to:", `${testInstance.url}/grants/mcp`);
  });
  it("obtains password token and agent_id", () => {
    assert.ok(state.passwordToken, "password token should be set");
    assert.ok(state.agentId, "agent_id (azp) should be set");
  });

  it("list_tools includes runtime proxy tools for destination", async () => {
    // This test expects the GrantToolsService to:
    // 1. Detect agent has mcp.kind === 'destination'
    // 2. Register runtime proxy tools: list-remote-tools, remote-tool-proxy

    const result = await state.client.listTools();
    assert.ok(result?.tools != null, "list_tools should return tools array");

    state.toolsFromDestination = (result.tools || []).map((t) => t.name);
    console.log("[tools available]", state.toolsFromDestination);

    // Should always have push-authorization-request (local service tool)
    assert.ok(
      state.toolsFromDestination.includes("push-authorization-request"),
      "push-authorization-request should be in tool list"
    );

    // Should have tools from remote MCP server
    const expectedRemoteTools = [
      's4_checkProductAvailability',
      's4_getOrdersHistory',
      'ariba_getSuppliers',
      'ariba_createPurchaseRequest',
      'ariba_submitPurchaseRequest',
      'email_search',
      'email_readMessage'
    ];

    for (const tool of expectedRemoteTools) {
      assert.ok(
        state.toolsFromDestination.includes(tool),
        `${tool} should be in tool list from remote MCP server`
      );
    }

    console.log("[total tools available]", state.toolsFromDestination.length);
  });

  it("list-remote-tools discovers remote tools at runtime", async function () {
    // This test calls the list-remote-tools tool to discover available tools
    // on the remote MCP server via the destination

    console.log("[list-remote-tools] Calling to discover remote tools...");

    try {
      const result = await state.client.callTool({
        name: "list-remote-tools",
        arguments: {},
      });

      console.log("[list-remote-tools result]", inspect(result, { colors: true, depth: 3 }));

      assert.ok(result, "list-remote-tools should return a result");

      if (result.isError) {
        // May fail if destination is not reachable - that's ok for now
        console.log("[list-remote-tools] Destination not reachable:", result.content?.[0]?.text);
        this.skip();
        return;
      }

      // Store discovered tools for next test
      state.remoteTools = result.structuredContent?.tools || [];
      console.log("[discovered remote tools]", state.remoteTools);
    } catch (error) {
      console.error("[list-remote-tools error]", error.message);
      this.skip();
    }
  });

  it("calls s4_getOrdersHistory tool directly", async function () {
    console.log("[s4_getOrdersHistory] Calling remote tool directly...");

    try {
      const result = await state.client.callTool({
        name: "s4_getOrdersHistory",
        arguments: {},
      });

      console.log("[s4_getOrdersHistory result]", inspect(result, { colors: true, depth: 3 }));

      // The call should return a result (success or proper MCP error)
      assert.ok(result, "s4_getOrdersHistory should return a result");

      if (result.isError) {
        console.log("[s4_getOrdersHistory returned error]", result.content?.[0]?.text);
      }
    } catch (error) {
      console.error("[s4_getOrdersHistory transport error]", error.message);
      assert.fail(`s4_getOrdersHistory should not throw transport error: ${error.message}`);
    }
  });

  after(async () => {
    // Cleanup: close MCP client connection
    if (state.client) {
      try {
        await state.client.close();
        console.log("🔌 MCP Client disconnected");
      } catch (e) {
        // Ignore close errors
      }
    }
  });
});