#!/usr/bin/env node

/**
 * MCP service grant flow test using MCP SDK client:
 * 1. Get password token (no DB agent/tools; MCP service uses local tools)
 * 2. Connect via @modelcontextprotocol/sdk Client + StreamableHTTPClientTransport
 * 3. List tools (before consent: local tools are disabled, only grant:request available)
 * 4. Call grant:request tool, consent API, then list tools again
 * 5. Assert tool list changed: approved tools now appear (enable/disable logic)
 *
 * Uses cds.test() for HTTP and MCP Client for tool calls.
 * Run: npm run test:mcp-service
 *   or: npx cds bind --profile hybrid --exec -- node --import tsx --test --test-concurrency=1 --experimental-vm-modules ./test/mcp-service.test.js
 */

import assert from "node:assert";
import { IdentityService } from "@sap/xssec";
import cds from "@sap/cds";
import { jwtDecode } from "jwt-decode";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const TEST_USER = process.env.TEST_USER || "agently.io@gmail.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD;

const testInstance = cds.test("serve", "all").in(import.meta.dirname + "/..");
const { PUT, axios } = testInstance;

/** Tool names to request via grant:request (from tools.todo). */
const REQUESTED_TOOLS = ["messages_search", "messages_read"];

const state = {
  passwordToken: null,
  claims: null,
  mcpUrl: null,
  mcpHost: null,
  requestId: null,
  grantId: null,
  client: null,
  toolsBeforeConsent: null,
  toolsAfterConsent: null,
};

describe("sap.scai.grants.mcp.McpService", () => {
  before(async () => {
    await testInstance;
    state.mcpUrl = `${testInstance.url}/mcp/streaming`;
    state.mcpHost = testInstance.url;

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
    console.log("🚀 MCP Service test: token obtained, mcpUrl=", state.mcpUrl);
  });

  it("obtains password token", () => {
    assert.ok(state.passwordToken, "password token should be set");
    assert.ok(state.claims?.sub ?? state.claims?.email, "subject/email should be in claims");
  });

  it("list_tools before consent (local tools disabled until grant)", async () => {
    const client = new Client({ name: "mcp-flow-test", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(state.mcpUrl), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${state.passwordToken}`,
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
      },
    });
    await client.connect(transport);
    state.client = client;

    const result = await client.listTools();
    assert.ok(result?.tools != null, "list_tools should return tools array");
    state.toolsBeforeConsent = (result.tools || []).map((t) => t.name);
    // Before consent: grant:request is always enabled; other local tools disabled until grant
    assert.ok(
      state.toolsBeforeConsent.includes("grant:request"),
      "grant:request should be listed (always enabled for auth flow)"
    );
    assert.equal(state.toolsBeforeConsent.length, 1, "tools before consent should be 1");
    console.log("[tools before consent]", state.toolsBeforeConsent);
  });

  it("grant:request returns request_uri", async () => {
    const result = await state.client.callTool({
      name: "grant:request",
      arguments: { tools: REQUESTED_TOOLS },
    });
    if (result.isError) {
      throw new Error(result.content?.[0]?.text ?? result.message ?? "MCP tool call failed");
    }
    const requestUri = result.structuredContent?.request_uri;
    assert.ok(requestUri, "grant:request should return request_uri");
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
            server: state.mcpHost,
            tools: REQUESTED_TOOLS.reduce((acc, name) => {
              acc[name] = true; // truthy = approved so list_tools enables them
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

  it("list_tools after consent includes approved tools (list changed)", async () => {
     const clientAfter = state.client;
    const result = await clientAfter.listTools();
    assert.ok(result?.tools != null, "list_tools after consent should return tools");
    state.toolsAfterConsent = (result.tools || []).map((t) => t.name);
    console.log("[tools after consent]", state.toolsAfterConsent);

    for (const name of REQUESTED_TOOLS) {
      assert.ok(
        state.toolsAfterConsent.includes(name),
        `approved tool "${name}" should appear in list after consent`
      );
    }
    assert.ok(
      state.toolsAfterConsent.length > state.toolsBeforeConsent.length,
      "tool list should grow after consent (approved tools enabled)"
    );
  });
});
