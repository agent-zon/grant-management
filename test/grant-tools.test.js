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

import { describe, it, before } from "node:test";
import assert from "node:assert";
import { IdentityService } from "@sap/xssec";
import cds from "@sap/cds";
import { jwtDecode } from "jwt-decode";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const TEST_USER = process.env.TEST_USER || "agently.io@gmail.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD;

const testInstance = cds.test("serve", "all").in(import.meta.dirname + "/..");
const { PUT, GET, axios } = testInstance;

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
];

const state = {
  passwordToken: null,
  claims: null,
  agentId: null,
  mcp: null,
  requestId: null,
  grantId: null,
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
    state.agentId = state.claims.azp || credentials.clientid;

    const db = await cds.connect.to("db");
    const AgentsEntity = "sap.scai.grants.discovery.Agents";
    const ToolsEntity = "sap.scai.grants.discovery.Tools";
    const { INSERT } = cds.ql;

    try {
      await db.run(
        INSERT.into(AgentsEntity).entries({
          id: state.agentId,
          description: "Test Agent",
          url: state.mcp,
          enabled: true,
        })
      );
    } catch (e) {
      if (e.code !== "SQLITE_CONSTRAINT_UNIQUE" && !/UNIQUE|unique/.test(e.message)) throw e;
    }

    for (const tool of tools) {
      try {
        await db.run(
          INSERT.into(ToolsEntity).entries({
            name: tool.name,
            schema: tool.schema,
            enabled: true,
            agent_id: state.agentId,
          })
        );
      } catch (e) {
        if (e.code !== "SQLITE_CONSTRAINT_UNIQUE" && !/UNIQUE|unique/.test(e.message)) throw e;
      }
    }
  });

  it("obtains password token and agent_id", () => {
    assert.ok(state.passwordToken, "password token should be set");
    assert.ok(state.agentId, "agent_id (azp) should be set");
    assert.ok(state.claims?.sub ?? state.claims?.email, "subject/email should be in claims");
  });

  it("creates agent and tools in DB", async () => {
    const db = await cds.connect.to("db");
    const ToolsEntity = "sap.scai.grants.discovery.Tools";
    const toolsResult = await db.run(
      cds.ql.SELECT.from(ToolsEntity).where({ agent_id: state.agentId })
    );
    assert.ok(Array.isArray(toolsResult), "tools result should be array");
    assert.ok(
      toolsResult.length >= tools.length,
      `should have at least ${tools.length} tools for agent`
    );
  });

  it("push-authorization-request returns request_uri", async () => {
    const toolNames = tools.map((t) => t.name);
    const client = new Client({ name: "grant-flow-test", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(state.mcp), {
      fetch1: async (url, options) => {
        const response = await axios(url, {
          data: options.body,
          headers: options.headers,
          method: options.method,
          url,
          responseType: "stream",
          validateStatus: (status) => status === 200 || status === 201 || status === 301,
          timeout: 10000,
        });
        return new Response(response.data, {
          headers: response.headers,
          status: response.status,
        });
      },
      requestInit: {
        headers: {
          Authorization: `Bearer ${state.passwordToken}`,
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
      },
    });

    try {
      await client.connect(transport);
      const result = await client.callTool({
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
    } finally {
      await client.close();
      await transport.close();
    }
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
    const consentData = {
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
    };

    const res = await PUT(
      `/oauth-server/AuthorizationRequests/${state.requestId}/consent`,
      consentData,
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

    const mcpDetails = authDetails.find((ad) => ad.type === "mcp");
    assert.ok(mcpDetails, "grant should have mcp authorization_details");
    const toolsObj = mcpDetails.tools ?? mcpDetails;
    assert.ok(toolsObj && typeof toolsObj === "object", "mcp details should have tools");
    const grantedTools = Object.keys(toolsObj);
    for (const t of tools) {
      assert.ok(
        grantedTools.includes(t.name),
        `granted tools should include ${t.name}, got: ${grantedTools.join(", ")}`
      );
    }
  });
});
