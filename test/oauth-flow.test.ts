import cds from "@sap/cds";

const { PUT, GET, POST, DELETE, axios } = cds.test(import.meta.dirname + "/..");
axios.defaults.auth = { username: "alice", password: "" };
let grantId: string;

describe("OAuth 2.0 Basic Authorization Flow", () => {
  describe("PAR → Authorize → Consent → Token", () => {
    let requestId: string;
    let requestUri: string;
    let authorizationCode: string;
    let accessToken: string;

    it("should create pushed authorization request (PAR)", async () => {
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

      expect(data).toHaveProperty("request_uri");
      expect(data.request_uri).toMatch(/^urn:ietf:params:oauth:request_uri:/);
      requestUri = data.request_uri;
      requestId = requestUri.split(":").pop()!;
      console.log("✓ Created PAR request URI:", requestUri);
    });

    it("should get consent page from authorize endpoint", async () => {
      const { status, data, statusText } = await axios.post(
        "/oauth-server/authorize",
        {
          request_uri: requestUri,
          client_id: "test-client-basic",
        },
        {
          headers: { Accept: "text/html" },
        }
      );

      expect(status).toBe(200);
      expect(data).toBeInstanceOf(String);
      expect(data).toMatch(/Rich Authorization Request/);
      console.log("✓ Got consent page");
    });

    it("should submit consent and get authorization code", async () => {
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
            transport: "sse",
            locations: ["https://mcp.devops.example.com/analytics"],
          },
        ],
        grant_id: await getGrantIdFromRequest(requestId),
        client_id: "test-client-basic",
      });

      expect(consentResponse.status).toBe(301);
      expect(consentResponse.headers.location).toMatch(/\?code=/);
      const code = consentResponse.headers.location?.split("?code=")[1];
      expect(code).toBeInstanceOf(String);

            authorizationCode = requestId;
            console.log("✓ Created consent, authorization code:", authorizationCode);
        });

        it("should exchange authorization code for tokens", async () => {
            const {data} = await POST`/oauth-server/token ${{
                grant_type: "authorization_code",
                client_id: "test-client-basic",
                code: authorizationCode,
                code_verifier: "test-challenge-basic",
                redirect_uri: "https://client.example.com/callback",
            }}`;

      expect(data).toHaveProperty("access_token");
      expect(data).toHaveProperty("grant_id");
      expect(data.access_token).toBeTruthy();
      expect(data.grant_id).toBeTruthy();

      expect(data).toMatchObject({
        token_type: "Bearer",
        scope: "openid devops",
      });
      expect(data.authorization_details).toMatchObject([
        {
          type: "mcp",
          server: "devops-mcp-server",
          transport: "sse",
          tools: {
            metrics: true,
            logs: true,
            dashboard: true,
          },
          locations: ["https://mcp.devops.example.com/analytics"],
        },
      ]);

            accessToken = data.access_token;
            grantId = data.grant_id;
            console.log("✓ Got access token for grant:", data.grant_id);
        });

        it("should query grant details after authorization", async () => {
            const {data} = await GET(`/grants-management/Grants('${grantId}')`, {
                headers: {Accept: "application/json"},
            });

      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("client_id");
      console.log("Grant Data:", grantId, data.id);
      expect(data.id).toBe(grantId);
      expect(data.client_id).toBe("test-client-basic");
      console.log("✓ Queried grant details");
    });
  });

    describe("Server Metadata", () => {
        it("should return OAuth server metadata", async () => {
            const {data} = await POST`/oauth-server/metadata ${{}}`;

      expect(data).toBeInstanceOf(Object);
      expect(data).toHaveProperty("issuer");
      expect(data).toHaveProperty("authorization_endpoint");
      expect(data).toHaveProperty("token_endpoint");
      expect(data).toHaveProperty("pushed_authorization_request_endpoint");
      console.log("✓ Got server metadata");
    });
  });

  describe("Multiple Consents per Grant", () => {
    let authorizationCode: string;
    it("2nd: should add second consent to same grant", async () => {
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

      const { status, data, headers } = await submitConsent({
        grant_id: grantId,
        subject: "alice",
        scope: "workspace.fs",
        request_ID: requestId2,
        authorization_details: [
          {
            type: "fs",
            roots: ["/home/workspace/logs", "/var/data/reports"],
            permissions_read: true,
            permissions_write: true,
            permissions_create: false,
            permissions_delete: false,
          },
        ],
      });

      expect(status).toBe(301);
      expect(headers.location).toMatch(/\?code=/);
      const code = headers.location?.split("?code=")[1];
      expect(code).toBeInstanceOf(String);

      authorizationCode = code;
      console.log("✓ Created consent, authorization code:", authorizationCode);
    });

    it("2nd: should exchange authorization code for tokens", async () => {
      const { data } = await POST`/oauth-server/token ${{
        grant_type: "authorization_code",
        client_id: "test-client-basic",
        code: authorizationCode,
        code_verifier: "test-challenge-basic",
        redirect_uri: "https://client.example.com/callback",
      }}`;

      expect(data).toMatchObject({
        token_type: "Bearer",
        scope: "openid devops workspace.fs",
        grant_id: grantId,
      });
      expect(data.authorization_details).toMatchObject([
        {
          type: "mcp",
          server: "devops-mcp-server",
          transport: "sse",
          tools: {
            metrics: true,
            logs: true,
            dashboard: true,
          },
          locations: ["https://mcp.devops.example.com/analytics"],
        },
        {
          type: "fs",
          roots: ["/home/workspace/logs", "/var/data/reports"],
          permissions_read: true,
          permissions_write: true,
          permissions_create: false,
          permissions_delete: false,
        },
      ]);

      grantId = data.grant_id;
      console.log("✓ Got access token for grant:", data.grant_id);
    });

    it("2nd: should query grant and see combined scopes", async () => {
      const { data } = await GET(
        `/oauth-server/Grants/${grantId}?$expand=authorization_details`,
        {
          headers: { Accept: "application/json" },
        }
      );
      expect(data).toMatchObject({
        scope: "openid devops workspace.fs",
        id: grantId,
        status: "active",
        createdBy: "alice",
      });
      expect(data.authorization_details).toMatchObject([
        {
          type: "mcp",
          server: "devops-mcp-server",
          transport: "sse",
          tools: {
            metrics: true,
            logs: true,
            dashboard: true,
          },
          locations: ["https://mcp.devops.example.com/analytics"],
        },
        {
          type: "fs",
          roots: ["/home/workspace/logs", "/var/data/reports"],
          permissions_read: true,
          permissions_write: true,
          permissions_create: false,
          permissions_delete: false,
        },
      ]);
      console.log("✓ Grant scopes from multiple consents:", data.scope);
    });
  });
});

// Helper to handle consent submission with redirect
async function submitConsent({ request_ID, ...data }: any) {
  return await PUT(
    `/oauth-server/AuthorizationRequests/${request_ID}/consent`,
    data,
    {
      maxRedirects: 0,
      headers: { Accept: "text/html" },
      validateStatus: (status) => status === 301 || status === 201,
    }
  );
}

// Helper function to get grant_id from authorization request
async function getGrantIdFromRequest(requestId: string): Promise<string> {
  const response = await axios.get(
    `/oauth-server/AuthorizationRequests(${requestId})`
  );
  console.log("🔍 Fetched Authorization Request:", response.data);
  return response.data.grant_id;
}
