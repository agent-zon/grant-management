// @ts-nocheck
import cds from "@sap/cds";
import { test, expect } from "@playwright/test";

const projectRoot = new URL("..", import.meta.url).pathname;

// Helper to handle consent submission with redirect
async function submitConsent(PUT: any, { request_ID, ...data }: any) {
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

// Helper function to get grant_id from authorization request
async function getGrantIdFromRequest(axios: any, requestId: string): Promise<string> {
  const response = await axios.get(`/oauth-server/AuthorizationRequests(${requestId})`);
  return response.data.grant_id;
}

test.describe("Permissions flattening - single grant flow", () => {
  let grantId: string;
  let requestId: string;
  let requestUri: string;
  let authorizationCode: string;

  test("PAR → Authorize → Consent → Token and verify Permissions", async () => {
    const { PUT, GET, POST, axios } = cds.test(projectRoot);
    axios.defaults.auth = { username: "alice", password: "" };

    // PAR
    const { data: par } = await POST`/oauth-server/par ${{
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

    expect(par).toHaveProperty("request_uri");
    expect(par.request_uri).toMatch(/^urn:ietf:params:oauth:request_uri:/);
    requestUri = par.request_uri;
    requestId = requestUri.split(":").pop()!;

    // Authorize (consent page)
    const authPage = await axios.post(
      "/oauth-server/authorize",
      { request_uri: requestUri, client_id: "test-client-basic" },
      { headers: { Accept: "text/html" } }
    );
    expect(authPage.status).toBe(200);
    expect(typeof authPage.data).toBe("string");
    expect(authPage.data).toMatch(/Rich Authorization Request/);

    // Consent
    const consentResponse = await submitConsent(PUT, {
      subject: "alice",
      scope: "openid devops",
      request_ID: requestId,
      authorization_details: [
        {
          server: "devops-mcp-server",
          tools: { metrics: true, logs: true, dashboard: true },
          type: "mcp",
          transport: "sse",
          locations: ["https://mcp.devops.example.com/analytics"],
        },
      ],
      grant_id: await getGrantIdFromRequest(axios, requestId),
      client_id: "test-client-basic",
    });
    expect(consentResponse.status).toBe(301);
    expect(consentResponse.headers.location).toMatch(/\?code=/);
    authorizationCode = requestId; // server uses request_ID as code

    // Token
    const { data: token } = await POST`/oauth-server/token ${{
      grant_type: "authorization_code",
      client_id: "test-client-basic",
      code: authorizationCode,
      code_verifier: "test-challenge-basic",
      redirect_uri: "https://client.example.com/callback",
    }}`;

    expect(token).toHaveProperty("access_token");
    expect(token).toHaveProperty("grant_id");
    expect(token).toMatchObject({ token_type: "Bearer", scope: "openid devops" });
    grantId = token.grant_id;

    // Verify Permissions flattening
    const { data: perms } = await GET(
      `/grants-management/Permissions?$filter=grant_id eq '${grantId}'`
    );
    expect(Array.isArray(perms)).toBeTruthy();
    // Must include type row
    expect(perms.some((p: any) => p.attribute === "type" && p.value === "mcp")).toBeTruthy();
    // Must include tool rows from consent
    expect(perms.some((p: any) => p.attribute === "tool:metrics" && p.value === "true")).toBeTruthy();
    expect(perms.some((p: any) => p.attribute === "tool:logs" && p.value === "true")).toBeTruthy();
    expect(perms.some((p: any) => p.attribute === "tool:dashboard" && p.value === "true")).toBeTruthy();
    // Must include location from consent
    expect(
      perms.some(
        (p: any) => p.attribute === "location" && p.value === "https://mcp.devops.example.com/analytics"
      )
    ).toBeTruthy();
  });
});
