import cds from "@sap/cds";
import assert from "node:assert";

const { PUT, GET, POST, axios } = cds.test(process.cwd());
(axios.defaults as any).auth = { username: "alice", password: "" };

async function main() {
  let grantId = "";
  let requestId = "";
  let requestUri = "";

  // PAR
  {
    const { data } = await POST`/oauth-server/par ${{
      response_type: "code",
      client_id: "test-client-basic",
      redirect_uri: "https://client.example.com/callback",
      scope: "openid devops",
      state: "random-state-xyz",
      code_challenge: "test-challenge-basic",
      code_challenge_method: "S256",
      authorization_details: JSON.stringify([
        {
          type: "mcp",
          identifier: "mcp-devops",
          server: "devops-mcp-server",
          transport: "sse",
          tools: {
            metrics: { essential: true },
            logs: { essential: false },
            dashboard: { essential: false },
          },
          actions: ["read", "query"],
          locations: ["analytics"],
        },
      ]),
    }}`;
    assert.ok(data.request_uri);
    assert.match(data.request_uri, /^urn:ietf:params:oauth:request_uri:/);
    requestUri = data.request_uri;
    requestId = requestUri.split(":").pop()!;
    console.log("✓ PAR created:", requestUri);
  }

  // Authorize (consent page)
  {
    const { status, data } = await axios.post(
      "/oauth-server/authorize",
      {
        request_uri: requestUri,
        client_id: "test-client-basic",
      },
      { headers: { Accept: "text/html" } }
    );
    assert.equal(status, 200);
    assert.equal(typeof data, "string");
    console.log("✓ Consent page served");
  }

  // Consent
  {
    const consentResponse = await submitConsent({
      subject: "alice",
      scope: "openid devops",
      request_ID: requestId,
      authorization_details: [
        {
          server: "devops-mcp-server",
          tools: {
            metrics: true,
            logs: true,
            dashboard: true,
          },
          type: "mcp",
          identifier: "mcp-devops",
          transport: "sse",
          locations: ["https://mcp.devops.example.com/analytics"],
        },
      ],
      grant_id: await getGrantIdFromRequest(requestId),
      client_id: "test-client-basic",
    });

    assert.equal(consentResponse.status, 301);
    assert.ok(consentResponse.headers.location?.includes("?code="));
    console.log("✓ Consent submitted");
  }

  // Token
  {
    const { data } = await POST`/oauth-server/token ${{
      grant_type: "authorization_code",
      client_id: "test-client-basic",
      code: requestId,
      code_verifier: "test-challenge-basic",
      redirect_uri: "https://client.example.com/callback",
    }}`;

    assert.ok(data.access_token);
    assert.ok(data.grant_id);
    assert.equal(data.token_type, "Bearer");
    assert.equal(data.scope, "openid devops");
    const mcp = (data.authorization_details || []).find((d: any) => d.type === "mcp");
    assert.ok(mcp);
    grantId = data.grant_id;
    console.log("✓ Token issued for grant:", grantId);
  }

  // Query grant
  {
    const { data } = await GET(`/grants-management/Grants('${grantId}')`, {
      headers: { Accept: "application/json" },
    });
    assert.equal(data.id, grantId);
    assert.equal(data.client_id, "test-client-basic");
    console.log("✓ Queried grant details");
  }

  // Second consent to same grant (fs) with identifier replacement semantics
  {
    const { data: parData } = await POST`/oauth-server/par ${{
      response_type: "code",
      client_id: "test-multi-consent",
      redirect_uri: "https://client.example.com/callback",
      scope: "workspace.fs",
      state: "state-2",
      code_challenge: "challenge-2",
      code_challenge_method: "S256",
      grant_id: grantId,
      authorization_details: JSON.stringify([
        {
          type: "fs",
          identifier: "fs-logs",
          roots: ["/home/workspace/logs", "/var/data/reports"],
          permissions: {
            read: { essential: true },
            write: { essential: true },
            create: null,
            list: null,
          },
        },
      ]),
    }}`;

    const requestId2 = parData.request_uri.split(":").pop()!;

    const { status, headers } = await submitConsent({
      grant_id: grantId,
      subject: "alice",
      scope: "workspace.fs",
      request_ID: requestId2,
      authorization_details: [
        {
          type: "fs",
          identifier: "fs-logs",
          roots: ["/home/workspace/logs", "/var/data/reports"],
          permissions_read: true,
          permissions_write: true,
          permissions_create: false,
          permissions_delete: false,
        },
      ],
    });

    assert.equal(status, 301);
    const code = headers.location?.split("?code=")[1];
    assert.ok(code);

    const token2 = await POST`/oauth-server/token ${{
      grant_type: "authorization_code",
      client_id: "test-client-basic",
      code,
      code_verifier: "test-challenge-basic",
      redirect_uri: "https://client.example.com/callback",
    }}`;

    assert.equal(token2.data.scope, "openid devops workspace.fs");
    const fs = (token2.data.authorization_details || []).find((d: any) => d.type === "fs");
    assert.ok(fs);
    assert.equal(Boolean(fs.permissions?.read), true);
    assert.equal(Boolean(fs.permissions?.write), true);
    console.log("✓ Multi-consent replacement verified");
  }

  console.log("\n✅ OAuth flow tests passed\n");
}

async function submitConsent({ request_ID, ...data }: any) {
  return await PUT(
    `/oauth-server/AuthorizationRequests/${request_ID}/consent`,
    data,
    {
      maxRedirects: 0,
      headers: { Accept: "text/html" },
      validateStatus: (status: number) => status === 301 || status === 201,
    }
  );
}

async function getGrantIdFromRequest(requestId: string): Promise<string> {
  const response = await axios.get(
    `/oauth-server/AuthorizationRequests(${requestId})`
  );
  return response.data.grant_id;
}

main().catch((e) => {
  console.error("❌ OAuth flow tests failed", e);
  process.exit(1);
});
