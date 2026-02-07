#!/usr/bin/env node

/**
 * Grant flow test using MCP SDK client:
 * 1. Get password token, create agent and tools in DB
 * 2. Connect via @modelcontextprotocol/sdk Client + StreamableHTTPClientTransport
 * 3. Call push-authorization-request tool, then consent API, then query grant
 *
 * Uses cds.test() for HTTP and MCP Client for tool calls.
 * Run: npm run test:grant-tools
 *   or: npx cds bind --profile hybrid --exec -- node --import tsx --test --test-concurrency=1 --experimental-vm-modules ./test/grant-tools.test.js
 */

import assert from "node:assert";
import { IdentityService } from "@sap/xssec";
import cds from "@sap/cds";
import { jwtDecode } from "jwt-decode";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Agents } from "#cds-models/sap/scai/grants/GrantToolsService";
import { inspect } from "node:util";
const TEST_USER = process.env.TEST_USER || "agently.io@gmail.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD;

const testInstance = cds.test("serve", "all").in(import.meta.dirname + "/..");
const { PUT, GET, UPSERT, axios } = testInstance;
const tools = [
  {
    name: "test-tool-1",
    schema: JSON.stringify({
      type: "object",
      properties: { field1: { type: "string" }, price: { type: "number" } },
    }),
  },
  {
    name: "test-tool-2",
    schema: JSON.stringify({
      type: "object",
      properties: { name: { type: "string" } },
    }),
  },
  {
    name: "test-tool-3",
    schema: JSON.stringify({
      type: "object",
      properties: { name: { type: "string" } },
    }),
  },
];

const state = {
  passwordToken: null,
  claims: null,
  agentId: null,
  mcp: null,
  server: "my-mcp-server",
  requestId: null,
  grantId: null,
  transport: null,
};

describe("sap.scai.grants.GrantToolsService", () => {
  before(async () => {
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

    const result = await cds.run(cds.ql.UPSERT.into(Agents).entries({
      id: state.agentId,
      description: "Test Agent",
      url: state.mcp,
      tools: tools.map((t) => ({
        name: t.name,
        schema: t.schema,
        enabled: true,
        // agent_id: state.agentId,
      })),
      enabled: true,
    }));

    console.log("[Upsert result]", result, result.statusText, result.status, result.data);
    assert.ok(result, "agent should be created");


    const client = new Client({ name: "grant-flow-test", version: "1.0.0" });
    state.client = client;
    const transport = new StreamableHTTPClientTransport(new URL(state.mcp), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${state.clientToken}`,
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
      },
    });
    await client.connect(transport);
    state.transport = transport;
    state.client = client;
    console.log("🚀 MCP Client Connected:", state.mcp);
  });


  it("obtains password token and agent_id", () => {
    assert.ok(state.passwordToken, "password token should be set");
    assert.ok(state.agentId, "agent_id (azp) should be set");
    assert.ok(state.claims?.sub ?? state.claims?.email, "subject/email should be in claims");
  });


  it("creates agent and tools in DB", async () => {
    const agentResult = await cds.run(cds.ql.SELECT.one.from(Agents, a => {
      a.id, a.description, a.url, a.tools(t => {
        t`*`
      })
    }).where({ id: state.agentId }));


    console.log("[Agent result]", inspect(agentResult, { colors: true, depth: 2, compact: true }));

    assert.ok(agentResult, "agent should be created");
    assert.ok(agentResult.tools, "agent should have tools");
    assert.ok(agentResult.tools.length >= tools.length, "agent should have at least the tools we created");
    assert.ok(agentResult.tools.every((t) => t.name === tools.find((tool) => tool.name === t.name)?.name), "agent tools should match the tools we created");

  });

  it("push-authorization-request returns request_uri", async () => {
    const toolNames = tools.map((t) => t.name);


    const result = await state.client.callTool({
      name: "push-authorization-request",
      arguments: { tools: toolNames },
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

  it("consent can be submitted", async () => {
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
            tools: tools.reduce((acc, t) => {
              acc[t.name] = null;
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
    assert.ok(
      Array.isArray(authDetails),
      "grant should have authorization_details array"
    );

    const grantedTools = authDetails.filter((ad) => ad.type === "mcp")
      .flatMap((ad) => Object.keys(ad.tools));


    assert.ok(isSubset(tools.map((t) => t.name), grantedTools), "grant should have tools");



  });
});


function isSubset(subsetArray, mainArray) {
  // Use Array.prototype.every() to check if all elements in the subset are present
  // in the main array using Array.prototype.includes().
  return subsetArray.every(item => mainArray.includes(item));
}
