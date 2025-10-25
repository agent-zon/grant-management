import { test } from "node:test";
import assert from "node:assert";
import cds from "@sap/cds";

// Initialize test context at top level
const { PUT, GET, POST, DELETE, axios } = cds.test(import.meta.dirname + "/..");
axios.defaults.auth = { username: "alice", password: "" };

// Global variables for sharing state across tests
let initialGrantId: string;
let newGrantId: string;

// Helper function to create initial grant
async function createInitialGrant() {
  console.log("🚀 Creating initial grant...");

  // Step 1: Create PAR
  const { data: parData } = await POST`/oauth-server/par ${{
    response_type: "code",
    client_id: "test-client-basic",
    redirect_uri: "https://client.example.com/callback",
    scope: "openid profile",
    state: "setup-state",
    code_challenge: "setup-challenge",
    code_challenge_method: "S256",
    authorization_details: JSON.stringify([
      {
        type: "mcp",
        server: "setup-mcp-server",
        transport: "sse",
        tools: {
          metrics: { essential: true },
        },
        actions: ["read"],
        locations: ["setup"],
      },
    ]),
  }}`;

  const requestId = parData.request_uri.split(":").pop()!;
  console.log("  ✓ Created PAR request:", requestId);

  // Step 2: Call authorize endpoint (this creates/upserts the grant)
  const authorizeResponse = await axios.post(
    "/oauth-server/authorize",
    {
      request_uri: parData.request_uri,
      client_id: "test-client-basic",
    },
    {
      headers: { Accept: "text/html" },
    }
  );
  console.log("  ✓ Called authorize endpoint");

  // Step 3: Get grant_id from authorization request
  const authReqResponse = await axios.get(
    `/oauth-server/AuthorizationRequests(${requestId})`
  );
  const grantId = authReqResponse.data.grant_id;
  console.log("  ✓ Got grant_id:", grantId);

  // Step 4: Submit consent
  const consentResponse = await PUT(
    `/oauth-server/AuthorizationRequests/${requestId}/consent`,
    {
      subject: "alice",
      scope: "openid profile",
      request_ID: requestId,
      authorization_details: [
        {
          server: "setup-mcp-server",
          tools: { metrics: true },
          type: "mcp",
          transport: "sse",
          locations: ["https://mcp.setup.example.com/setup"],
        },
      ],
      grant_id: grantId,
      client_id: "test-client-basic",
    },
    {
      maxRedirects: 0,
      headers: { Accept: "text/html" },
      validateStatus: (status) => status === 301 || status === 201,
    }
  );

  const authCode =
    consentResponse.headers.location?.split("?code=")[1] || requestId;
  console.log("  ✓ Got authorization code:", authCode);

  // Step 5: Exchange code for token
  const { data: tokenData } = await POST`/oauth-server/token ${{
    grant_type: "authorization_code",
    client_id: "test-client-basic",
    code: authCode,
    code_verifier: "setup-challenge",
    redirect_uri: "https://client.example.com/callback",
  }}`;

  console.log("✅ Initial grant created - Grant ID:", tokenData.grant_id);
  return tokenData.grant_id;
}

// Test 1: Setup - Create initial grant
test("Setup: Create initial grant", async () => {
  initialGrantId = await createInitialGrant();
  assert.ok(initialGrantId, "Initial grant ID should exist");
  console.log("✓ Setup complete - grant ID:", initialGrantId);
});

// Test 2: Query the initial grant
test("should query the initial grant", async () => {
  const { data } = await GET(`/grants-management/Grants('${initialGrantId}')`, {
    headers: { Accept: "application/json" },
  });

  assert.strictEqual(data.id, initialGrantId);

  assert.strictEqual(data.scope, "openid profile");
  console.log("✓ Successfully queried initial grant");
});

// Test 3: Grant Elevation - Add consent to existing grant
test("Grant Elevation: Add consent to existing grant", async (t) => {
  let elevationRequestId: string;
  let elevationAuthCode: string;

  await t.test(
    "PAR: Create elevation request with existing grant_id",
    async () => {
      const { data: parData } = await POST`/oauth-server/par ${{
        response_type: "code",
        client_id: "test-client-basic",
        redirect_uri: "https://client.example.com/callback",
        scope: "workspace.fs admin",
        state: "elevation-state",
        code_challenge: "elevation-challenge",
        code_challenge_method: "S256",
        grant_id: initialGrantId, // Reuse existing grant
        authorization_details: JSON.stringify([
          {
            type: "fs",
            roots: ["/workspace/data", "/workspace/logs"],
            permissions: {
              read: { essential: true },
              write: { essential: true },
              delete: { essential: false },
            },
          },
        ]),
      }}`;

      assert.ok(parData.request_uri, "PAR request URI should exist");
      elevationRequestId = parData.request_uri.split(":").pop()!;
      console.log("  ✓ Created elevation PAR:", elevationRequestId);
    }
  );

  await t.test("Authorize: Get consent page for elevation", async () => {
    const { status, data } = await axios.post(
      "/oauth-server/authorize",
      {
        request_uri: `urn:ietf:params:oauth:request_uri:${elevationRequestId}`,
        client_id: "test-client-basic",
      },
      {
        headers: { Accept: "text/html" },
      }
    );

    assert.strictEqual(status, 200);
    assert.ok(data.includes("Rich Authorization Request"));
    console.log("  ✓ Got elevation consent page");
  });

  await t.test("Consent: Submit elevation consent", async () => {
    const authReqResponse = await axios.get(
      `/oauth-server/AuthorizationRequests(${elevationRequestId})`
    );
    const grantId = authReqResponse.data.grant_id;
    assert.strictEqual(grantId, initialGrantId, "Should reuse same grant");

    const consentResponse = await PUT(
      `/oauth-server/AuthorizationRequests/${elevationRequestId}/consent`,
      {
        subject: "alice",
        scope: "workspace.fs admin",
        request_ID: elevationRequestId,
        authorization_details: [
          {
            type: "fs",
            roots: ["/workspace/data", "/workspace/logs"],
            permissions_read: true,
            permissions_write: true,
            permissions_delete: false,
          },
        ],
        grant_id: grantId,
        client_id: "test-client-basic",
      },
      {
        maxRedirects: 0,
        headers: { Accept: "text/html" },
        validateStatus: (status) => status === 301 || status === 201,
      }
    );

    assert.strictEqual(consentResponse.status, 301);
    elevationAuthCode =
      consentResponse.headers.location?.split("?code=")[1] ||
      elevationRequestId;
    console.log("  ✓ Submitted elevation consent, code:", elevationAuthCode);
  });

  await t.test("Token: Exchange code for elevated token", async () => {
    const { data } = await POST`/oauth-server/token ${{
      grant_type: "authorization_code",
      client_id: "test-client-basic",
      code: elevationAuthCode,
      code_verifier: "elevation-challenge",
      redirect_uri: "https://client.example.com/callback",
    }}`;

    assert.strictEqual(data.grant_id, initialGrantId);
    assert.ok(data.scope.includes("openid"));
    assert.ok(data.scope.includes("profile"));
    assert.ok(data.scope.includes("workspace.fs"));
    assert.ok(data.scope.includes("admin"));
    assert.strictEqual(data.authorization_details.length, 2);
    console.log("  ✓ Got elevated token with combined scopes:", data.scope);
  });

  await t.test("Query: Verify grant has combined permissions", async () => {
    const { data } = await GET(
      `/oauth-server/Grants/${initialGrantId}?$expand=authorization_details`,
      { headers: { Accept: "application/json" } }
    );

    assert.strictEqual(data.id, initialGrantId);
    assert.ok(data.scope.includes("openid profile workspace.fs admin"));
    assert.ok(data.authorization_details, "Should have authorization_details");
    assert.strictEqual(data.authorization_details.length, 2);

    // Verify both authorization details are present
    const hasMCP = data.authorization_details.some(
      (d: any) => d.type === "mcp"
    );
    const hasFS = data.authorization_details.some((d: any) => d.type === "fs");
    assert.ok(hasMCP, "Should have MCP authorization detail");
    assert.ok(hasFS, "Should have FS authorization detail");

    console.log("  ✓ Grant has combined permissions from both consents");
  });
});

// Test 4: Create New Grant - Without grant_id (new grant flow)
test("Create New Grant: Complete flow without existing grant_id", async (t) => {
  let newRequestId: string;
  let newAuthCode: string;

  await t.test("PAR: Create new grant request (no grant_id)", async () => {
    const { data: parData } = await POST`/oauth-server/par ${{
      response_type: "code",
      client_id: "test-client-new",
      redirect_uri: "https://newclient.example.com/callback",
      scope: "api.read api.write",
      state: "new-grant-state",
      code_challenge: "new-challenge",
      code_challenge_method: "S256",
      // No grant_id - server will create new one
      authorization_details: JSON.stringify([
        {
          type: "mcp",
          server: "new-mcp-server",
          transport: "stdio",
          tools: {
            deploy: { essential: true },
            monitor: { essential: true },
          },
          actions: ["execute", "read"],
          locations: ["production"],
        },
      ]),
    }}`;

    assert.ok(parData.request_uri, "PAR request URI should exist");
    newRequestId = parData.request_uri.split(":").pop()!;
    console.log("  ✓ Created new grant PAR:", newRequestId);
  });

  await t.test("Authorize: Get consent page for new grant", async () => {
    const { status, data } = await axios.post(
      "/oauth-server/authorize",
      {
        request_uri: `urn:ietf:params:oauth:request_uri:${newRequestId}`,
        client_id: "test-client-new",
      },
      {
        headers: { Accept: "text/html" },
      }
    );

    assert.strictEqual(status, 200);
    assert.ok(data.includes("Rich Authorization Request"));
    console.log("  ✓ Got consent page for new grant");
  });

  await t.test("Consent: Submit consent for new grant", async () => {
    const authReqResponse = await axios.get(
      `/oauth-server/AuthorizationRequests(${newRequestId})`
    );
    const grantId = authReqResponse.data.grant_id;
    assert.ok(grantId, "Grant ID should be generated");
    assert.notStrictEqual(
      grantId,
      initialGrantId,
      "Should be different from initial grant"
    );

    const consentResponse = await PUT(
      `/oauth-server/AuthorizationRequests/${newRequestId}/consent`,
      {
        subject: "alice",
        scope: "api.read api.write",
        request_ID: newRequestId,
        authorization_details: [
          {
            type: "mcp",
            server: "new-mcp-server",
            transport: "stdio",
            tools: {
              deploy: true,
              monitor: true,
            },
            locations: ["https://mcp.prod.example.com/production"],
          },
        ],
        grant_id: grantId,
        client_id: "test-client-new",
      },
      {
        maxRedirects: 0,
        headers: { Accept: "text/html" },
        validateStatus: (status) => status === 301 || status === 201,
      }
    );

    assert.strictEqual(consentResponse.status, 301);
    newAuthCode =
      consentResponse.headers.location?.split("?code=")[1] || newRequestId;
    console.log("  ✓ Submitted consent for new grant, code:", newAuthCode);
  });

  await t.test("Token: Exchange code for new grant token", async () => {
    const { data } = await POST`/oauth-server/token ${{
      grant_type: "authorization_code",
      client_id: "test-client-new",
      code: newAuthCode,
      code_verifier: "new-challenge",
      redirect_uri: "https://newclient.example.com/callback",
    }}`;

    assert.ok(data.grant_id, "Should have grant_id");
    assert.notStrictEqual(data.grant_id, initialGrantId, "Should be new grant");
    assert.strictEqual(data.scope, "api.read api.write");
    assert.strictEqual(data.authorization_details.length, 1);
    assert.strictEqual(data.authorization_details[0].type, "mcp");

    newGrantId = data.grant_id;
    console.log("  ✓ Got token for new grant:", newGrantId);
  });

  await t.test("Query: Verify new grant exists", async () => {
    const { data } = await GET(`/grants-management/Grants('${newGrantId}')`, {
      headers: { Accept: "application/json" },
    });

    assert.strictEqual(data.id, newGrantId);
    assert.strictEqual(data.scope, "api.read api.write");
    assert.strictEqual(data.status, "active");
    console.log("  ✓ New grant verified");
  });
});

// Test 5: Query Grant List - Verify both grants exist
test("Query Grant List: Verify all grants are present", async () => {
  const { data } = await GET("/grants-management/Grants", {
    headers: { Accept: "application/json" },
  });

  // The grants-management service returns an array directly
  assert.ok(Array.isArray(data), "Should return array of grants");

  console.log(`  Found ${data.length} grant(s):`);
  data.forEach((g: any) =>
    console.log(`    - ${g.id} (client: ${g.client_id})`)
  );
  console.log(`  Expected:`);
  console.log(`    - ${initialGrantId} (test-client-basic)`);
  console.log(`    - ${newGrantId} (test-client-new)`);

  assert.ok(
    data.length >= 2,
    `Should have at least 2 grants, got ${data.length}`
  );

  const grantIds = data.map((g: any) => g.id);
  assert.ok(grantIds.includes(initialGrantId), "Should include initial grant");
  assert.ok(grantIds.includes(newGrantId), "Should include new grant");

  console.log(
    `✓ Grant list contains ${data.length} grants including both test grants`
  );
  console.log("  - Initial grant:", initialGrantId);
  console.log("  - New grant:", newGrantId);
});
