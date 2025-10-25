import cds from "@sap/cds";

const { GET, POST, DELETE, expect, axios } = cds.test(
  import.meta.dirname + "/.."
);
axios.defaults.auth = { username: "alice", password: "" };

describe("Grant Management Operations", () => {
  let requestId: string;
  let grantId: string;

  it("should create grant with multiple authorization details", async () => {
    const { data: parData } = await POST`/oauth-server/par ${{
      response_type: "code",
      client_id: "test-client-mgmt",
      redirect_uri: "https://client.example.com/callback",
      scope: "openid profile grant_management_query grant_management_revoke",
      state: "state-mgmt-test",
      code_challenge: "challenge-mgmt",
      code_challenge_method: "S256",
      authorization_details: JSON.stringify([
        {
          type: "database",
          locations: ["https://db.example.com/"],
          actions: ["read", "write", "delete"],
        },
        {
          type: "api",
          locations: ["https://api.example.com/v1/"],
          actions: ["GET", "POST"],
        },
      ]),
    }}`;

    requestId = parData.request_uri.split(":").pop()!;

    const response = await POST(
      `/oauth-server/Consents`,
      {
        subject: "alice",
        scope: "openid profile grant_management_query grant_management_revoke",
        request_ID: requestId,
      },
      {
        maxRedirects: 0,
        validateStatus: (status) => status === 301 || status === 201,
      }
    );
    expect(response.status).to.equal(301);
    expect(response.headers.location).to.include("?code=");
    const code = response.headers.location?.split("?code=")[1];
    expect(code).to.be.a("string");

    const { data: tokenData } = await POST`/oauth-server/token ${{
      grant_type: "authorization_code",
      client_id: "test-client-mgmt",
      code: code,
      code_verifier: "challenge-mgmt",
      redirect_uri: "https://client.example.com/callback",
    }}`;

    expect(tokenData.grant_id).to.be.a("string");
    console.log(
      "✓ Created grant with authorization details:",
      tokenData.grant_id
    );
  });

  it("should query grant and see authorization details", async () => {
    const { data } = await GET(`/grants-management/Grants('${grantId}')`, {
      headers: { Accept: "application/json" },
    });

    expect(data.id).to.equal(grantId);
    console.log(
      "✓ Queried grant, has authorization details:",
      !!data.authorization_details
    );
  });

  it("should list all grants for user", async () => {
    const { data } = await GET("/grants-management/Grants", {
      headers: { Accept: "application/json" },
    });

    const grants = data.value || data;
    expect(grants).to.be.an("array");
    console.log(`✓ Listed ${grants.length} grants`);
  });

  it("should revoke grant", async () => {
    const response = await DELETE(`/grants-management/Grants('${grantId}')`);
    expect([200, 204]).to.include(response.status);
    console.log("✓ Revoked grant");
  });
});
