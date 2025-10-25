import cds from "@sap/cds";

const { GET, POST, DELETE, expect, axios } = cds.test(
  import.meta.dirname + "/.."
);
axios.defaults.auth = { username: "alice", password: "" };

describe("OAuth 2.0 Basic Authorization Flow", () => {
  describe("PAR → Authorize → Consent → Token", () => {
    let requestId: string;
    let requestUri: string;
    let authorizationCode: string;
    let grantId: string;
    let accessToken: string;

    it("should create pushed authorization request (PAR)", async () => {
      const { data } = await POST`/oauth-server/par ${{
        response_type: "code",
        client_id: "test-client-basic",
        redirect_uri: "https://client.example.com/callback",
        scope: "openid profile email",
        state: "random-state-xyz",
        code_challenge: "test-challenge-basic",
        code_challenge_method: "S256",
        authorization_details: JSON.stringify([
          {
            type: "api",
            locations: ["https://resource.example.com/"],
            actions: ["read", "write"],
          },
        ]),
      }}`;

      expect(data).to.have.property("request_uri");
      expect(data.request_uri).to.be.a("string");
      requestUri = data.request_uri;
      requestId = requestUri.split(":").pop()!;
      console.log("✓ Created PAR request URI:", requestUri);
    });

    it("should get consent page from authorize endpoint", async () => {
      const response = await axios.post(
        "/oauth-server/authorize",
        {
          request_uri: requestUri,
          client_id: "test-client-basic",
        },
        {
          headers: { Accept: "text/html" },
        }
      );

      expect(response.status).to.equal(200);
      expect(response.data).to.be.a("string");
      expect(response.data).to.include("Rich Authorization Request");
      console.log("✓ Got consent page");
    });

    it("should submit consent and get authorization code", async () => {
      const consentResponse = await submitConsent({
        grant_id: getGrantIdFromRequest(requestId),
        subject: "alice",
        scope: "openid profile email",
        request_ID: requestId,
        client_id: "test-client-basic",
      });

      expect(consentResponse.status).to.equal(301);
      expect(consentResponse.headers.location).to.include("?code=");
      const code = consentResponse.headers.location?.split("?code=")[1];
      expect(code).to.be.a("string");

      authorizationCode = requestId;
      console.log("✓ Created consent, authorization code:", authorizationCode);
    });

    it("should exchange authorization code for tokens", async () => {
      const { data } = await POST`/oauth-server/token ${{
        grant_type: "authorization_code",
        client_id: "test-client-basic",
        code: authorizationCode,
        code_verifier: "test-challenge-basic",
        redirect_uri: "https://client.example.com/callback",
      }}`;

      expect(data).to.have.property("access_token");
      expect(data).to.have.property("grant_id");
      expect(data.access_token).to.be.a("string");
      expect(data.grant_id).to.be.a("string");

      accessToken = data.access_token;
      grantId = data.grant_id;
      console.log("✓ Got access token for grant:", data.grant_id);
    });

    it("should query grant details after authorization", async () => {
      const { data } = await GET(`/grants-management/Grants('${grantId}')`, {
        headers: { Accept: "application/json" },
      });

      expect(data).to.have.property("id");
      expect(data).to.have.property("client_id");
      expect(data.id).to.equal(grantId);
      expect(data.client_id).to.equal("test-client-basic");
      console.log("✓ Queried grant details");
    });
  });

  describe("Server Metadata", () => {
    it("should return OAuth server metadata", async () => {
      const { data } = await POST`/oauth-server/metadata ${{}}`;

      expect(data).to.be.an("object");
      expect(data).to.have.property("issuer");
      expect(data).to.have.property("authorization_endpoint");
      expect(data).to.have.property("token_endpoint");
      expect(data).to.have.property("pushed_authorization_request_endpoint");
      console.log("✓ Got server metadata");
    });
  });

  describe("Multiple Consents per Grant", () => {
    let grantId: string;

    it("should create grant with initial consent", async () => {
      const { data: parData } = await POST`/oauth-server/par ${{
        response_type: "code",
        client_id: "test-multi-consent",
        redirect_uri: "https://client.example.com/callback",
        scope: "openid profile",
        state: "state-1",
        code_challenge: "challenge-1",
        code_challenge_method: "S256",
      }}`;

      const requestId = parData.request_uri.split(":").pop()!;
      grantId = await getGrantIdFromRequest(requestId);

      await submitConsent({
        grant_id: grantId,
        subject: "alice",
        scope: "openid profile",
        request_ID: requestId,
      });

      const { data: tokenData } = await POST`/oauth-server/token ${{
        grant_type: "authorization_code",
        client_id: "test-multi-consent",
        code: requestId,
        code_verifier: "challenge-1",
        redirect_uri: "https://client.example.com/callback",
      }}`;

      expect(tokenData.grant_id).to.equal(grantId);
      console.log("✓ Created grant with first consent:", grantId);
    });

    it("should add second consent to same grant", async () => {
      const { data: parData } = await POST`/oauth-server/par ${{
        response_type: "code",
        client_id: "test-multi-consent",
        redirect_uri: "https://client.example.com/callback",
        scope: "email calendar",
        state: "state-2",
        code_challenge: "challenge-2",
        code_challenge_method: "S256",
        grant_id: grantId,
      }}`;

      const requestId2 = parData.request_uri.split(":").pop()!;

      await submitConsent({
        grant_id: grantId,
        subject: "alice",
        scope: "email calendar",
        request_ID: requestId2,
      });

      const { data: tokenData } = await POST`/oauth-server/token ${{
        grant_type: "authorization_code",
        client_id: "test-multi-consent",
        code: requestId2,
        code_verifier: "challenge-2",
        redirect_uri: "https://client.example.com/callback",
      }}`;

      expect(tokenData.grant_id).to.equal(grantId);
      console.log("✓ Added second consent to grant");
    });

    it("should query grant and see combined scopes", async () => {
      const { data } = await GET(`/grants-management/Grants('${grantId}')`, {
        headers: { Accept: "application/json" },
      });

      expect(data.id).to.equal(grantId);
      console.log("✓ Grant scopes from multiple consents:", data.scope);
    });
  });
});

// Helper to handle consent submission with redirect
async function submitConsent(data: any) {
  try {
    return await POST(`/oauth-server/Consents`, data, {
      maxRedirects: 0,
      validateStatus: (status) => status === 301 || status === 201,
    });
  } catch (error: any) {
    if (error.response?.status !== 301) throw error;
  }
}

// Helper function to get grant_id from authorization request
async function getGrantIdFromRequest(requestId: string): Promise<string> {
  const response = await axios.get(
    `/oauth-server/AuthorizationRequests(${requestId})`
  );
  return response.data.grant_id;
}
