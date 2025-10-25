import "tsx/esm";
import "tsx/cjs/register";
import cds from "@sap/cds";
import { expect } from "chai";

const { PUT, GET, POST, DELETE, axios } = cds.test(import.meta.dirname + "/..");
axios.defaults.auth = { username: "alice", password: "" };
let grantId;

describe("OAuth 2.0 Basic Authorization Flow", function () {
  this.timeout(60000);

  describe("PAR → Authorize → Consent → Token", () => {
    let requestId;
    let requestUri;
    let authorizationCode;

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

      expect(data).to.have.property("request_uri");
      expect(data.request_uri).to.match(/^urn:ietf:params:oauth:request_uri:/);
      requestUri = data.request_uri;
      requestId = requestUri.split(":").pop();
    });

    it("should get consent page from authorize endpoint", async () => {
      const { status, data } = await axios.post(
        "/oauth-server/authorize",
        {
          request_uri: requestUri,
          client_id: "test-client-basic",
        },
        {
          headers: { Accept: "text/html" },
        }
      );

      expect(status).to.equal(200);
      expect(data).to.be.a("string");
      expect(data).to.match(/Rich Authorization Request/);
    });

    it("should submit consent and get authorization code", async () => {
      const consentResponse = await submitConsent({
        subject: "alice",
        scope: "openid devops",
        request_ID: requestId,
        // Note: authorization_details persisted via PAR; not posted to Consents anymore
        grant_id: await getGrantIdFromRequest(requestId),
        client_id: "test-client-basic",
      });

      expect(consentResponse.status).to.be.oneOf([301, 201]);
      expect(consentResponse.headers.location).to.match(/\?code=/);
      const code = consentResponse.headers.location?.split("?code=")[1];
      expect(code).to.be.a("string");

      authorizationCode = requestId;
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
      expect(data).to.include({ token_type: "Bearer", scope: "openid devops" });
      expect(Array.isArray(data.authorization_details)).to.equal(true);
      const mcp = data.authorization_details.find((d) => d.type === "mcp");
      expect(mcp).to.exist;

      grantId = data.grant_id;
    });

    it("should query grant details after authorization", async () => {
      const { data } = await GET(`/grants-management/Grants('${grantId}')`, {
        headers: { Accept: "application/json" },
      });

      expect(data).to.have.property("id");
      expect(data).to.have.property("client_id");
      expect(data.id).to.equal(grantId);
      expect(data.client_id).to.equal("test-client-basic");
    });
  });
});

async function submitConsent({ request_ID, ...data }) {
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

async function getGrantIdFromRequest(requestId) {
  const response = await axios.get(
    `/oauth-server/AuthorizationRequests(${requestId})`
  );
  return response.data.grant_id;
}
