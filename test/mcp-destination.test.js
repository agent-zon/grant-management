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
import { inspect } from "node:util";

const TEST_USER = process.env.TEST_USER || "agently.io@gmail.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD;

// MCP Destination name configured in SAP BTP Destination Service
// For testing, this should point to a real MCP server or mock
const TEST_MCP_DESTINATION = process.env.TEST_MCP_DESTINATION || "TEST_MCP_SERVER";
const testInstance = cds.test("serve", "all").in(import.meta.dirname + "/..");
const { PUT, GET, UPSERT, axios, POST } = testInstance;

const expectedRemoteTools = [
  's4_checkProductAvailability',
  's4_getOrdersHistory',
  'ariba_getSuppliers',
  'ariba_createPurchaseRequest',
  'ariba_submitPurchaseRequest',
  'email_search',
  'email_readMessage'
];

// Subset consented in the test: only these are granted; others must not appear in list_tools and must fail at runtime
const grantedToolsOnly = [
  's4_checkProductAvailability',
  's4_getOrdersHistory',
  'ariba_getSuppliers',
];
const notGrantedTools = expectedRemoteTools.filter((t) => !grantedToolsOnly.includes(t));

const state = {
  passwordToken: null,
  claims: null,
  agentId: null,
  client: null,
  clientToken: null,
  toolsFromDestination: null,
  remoteTools: null,
  requestId: null,
  grantId: null,
  waitForToolListChanged: null,
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

  it("list_tools does not include remote tools for destination before granted", async () => {
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

    // Remote tools should not be included before grant (enabled only after consent)
    const included = expectedRemoteTools.filter((t) => state.toolsFromDestination.includes(t));
    assert.ok(included.length === 0, `remote tools should not be included before granted; found: ${included.join(", ") || "none"}`);

  });

  it("calls s4_getOrdersHistory before granted", async function () {

    const result = await state.client.callTool({
      name: "s4_getOrdersHistory",
      arguments: {},
    });

    console.log("[s4_getOrdersHistory result]", inspect(result, { colors: true, depth: 3 }));

    // The call should return a result (success or proper MCP error)
    assert.ok(result, "s4_getOrdersHistory should return a result");
    assert.equal(result.isError, true, "s4_getOrdersHistory should return an error before granted");

    // state.waitForToolListChanged = new Promise((resolve) => {
    //   state.client.setNotificationHandler("tools/list_changed", async (notification) => {
    //     resolve(notification);
    //   });
    // });
  });


  it("push-authorization-request returns request_uri", async () => {
    const result = await state.client.callTool({
      name: "push-authorization-request",
      arguments: { tools: expectedRemoteTools },
    });
    if (result.isError) {
      throw new Error(result.content?.[0]?.text ?? result.message ?? "MCP tool call failed");
    }
    const requestUri = result.structuredContent?.request_uri;
    assert.ok(requestUri, "push-authorization-request should return request_uri");
    state.requestId = requestUri.split(":").pop();
    assert.ok(state.requestId, "requestId should be parsed from request_uri");
  });

  it("AuthorizationRequest has grant_id", async () => {
    const authReqResponse = await axios.get(
      `/oauth-server/AuthorizationRequests(${state.requestId})`,
      { headers: { Authorization: `Bearer ${state.passwordToken}` } }
    );
    state.grantId = authReqResponse.data.grant_id;
    assert.ok(state.grantId, "AuthorizationRequest should have grant_id");
  });

  it("consent can be submitted (only some tools enabled)", async () => {
    const res = await PUT(
      `/oauth-server/AuthorizationRequests/${state.requestId}/consent`,
      {
        subject: state.claims.sub || state.claims.email || "alice",
        scope: "openid profile",
        request_ID: state.requestId,
        authorization_details: [
          {
            type: "mcp",
            server: state.mcp,
            tools: grantedToolsOnly.reduce((acc, t) => {
              acc[t] = true;
              return acc;
            }, {}),
          },
        ],
        grant_id: state.grantId,
        client_id: state.claims.azp || "test-client",
      },
      {
        headers: { Authorization: `Bearer ${state.passwordToken}` },
        validateStatus: (status) => status === 200 || status === 201 || status === 301,
      }
    );
    assert.ok(res, "consent PUT should succeed");
  });

  it("grant query returns grant with authorization_details", async () => {
    const res = await GET(
      `/grants-management/Grants('${state.grantId}')?$expand=authorization_details`,
      {
        headers: {
          Authorization: `Bearer ${state.passwordToken}`,
          Accept: "application/json",
        },
      }
    );
    const grant = res?.data ?? res?.body ?? res;
    assert.ok(grant != null && typeof grant === "object", "grant should be returned as object");
    const grantIdFromResponse = grant.id ?? grant.ID ?? grant.grant_id;
    if (grantIdFromResponse) {
      assert.strictEqual(String(grantIdFromResponse), String(state.grantId), "grant id should match");
    }
    assert.ok(
      grant.status ?? grant.authorization_details ?? grant.authorizationDetails,
      "grant should have status or authorization_details"
    );
    const authDetails = grant.authorization_details ?? grant.authorizationDetails;
    assert.ok(Array.isArray(authDetails), "grant should have authorization_details array");
    const grantedTools = authDetails.filter((ad) => ad.type === "mcp").flatMap((ad) => Object.entries(ad.tools || {}));
    const grantedNames = grantedTools.map(([name, _]) => name);
    console.log("grant-id", state.grantId, "[grantedTools] ", grantedNames);
    assert.ok(
      grantedToolsOnly.every((t) => grantedNames.includes(t)),
      `grant should include only consented tools; granted: ${grantedNames.join(", ")}`
    );
    const notInGrant = notGrantedTools.filter((t) => grantedNames.includes(t));
    assert.ok(notInGrant.length === 0, `grant must not include non-consented tools; found: ${notInGrant.join(", ") || "none"}`);
  });

  it("list_tools includes only granted tools after consent", async () => {
    const result = await state.client.listTools();
    assert.ok(result?.tools != null, "list_tools should return tools array");

    state.remoteTools = (result.tools || []).map((t) => t.name);
    console.log("[tools after grant]", state.remoteTools);

    assert.ok(
      state.remoteTools.includes("push-authorization-request"),
      "push-authorization-request should still be in tool list"
    );

    const includedGranted = grantedToolsOnly.filter((t) => state.remoteTools.includes(t));
    assert.ok(
      includedGranted.length === grantedToolsOnly.length,
      `list_tools should include all consented tools; expected ${grantedToolsOnly.join(", ")}, found: ${includedGranted.join(", ") || "none"}`
    );

    const includedNotGranted = notGrantedTools.filter((t) => state.remoteTools.includes(t));
    assert.ok(
      includedNotGranted.length === 0,
      `list_tools must not return non-consented tools; found: ${includedNotGranted.join(", ") || "none"}`
    );
  });

  // it("should raise tool list changed event after granted", async () => {
  //   await Promise.race([state.waitForToolListChanged, new Promise((resolve) => setTimeout(resolve, 10000))]);

  //   assert.equal(state.waitForToolListChanged.isError, false, "tool list changed event should be raised after granted");
  // });

  it("calls s4_getOrdersHistory after granted", async function () {
    assert.ok(state.clientToken, "clientToken must be set ");

    const result = await state.client.callTool({
      name: "s4_getOrdersHistory",
      arguments: {},
    });

    console.log("[s4_getOrdersHistory result]", inspect(result, { colors: true, depth: 3 }));
    assert.notEqual(result.isError, true, "s4_getOrdersHistory should succeed after granted");
  });

  it("calls non-granted tool returns error and is not accessible at runtime", async function () {
    const toolNotGranted = notGrantedTools[0];
    assert.ok(toolNotGranted, "at least one tool must be non-granted for this test");

    const result = await state.client.callTool({
      name: toolNotGranted,
      arguments: {},
    });

    console.log(`[${toolNotGranted} result (expect error)]`, inspect(result, { colors: true, depth: 3 }));
    assert.equal(result.isError, true, `${toolNotGranted} should return error when not consented`);
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