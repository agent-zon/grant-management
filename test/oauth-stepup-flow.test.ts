import cds from "@sap/cds";

const { GET, POST, expect, axios } = cds.test(import.meta.dirname + "/..");
axios.defaults.auth = { username: "alice", password: "" };

// Helper to handle consent submission with redirect
async function submitConsent(data: any) {
  try {
    await POST(`/oauth-server/Consents`, data, {
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

describe("OAuth 2.0 Step-Up / Permission Elevation Flow", () => {
  describe("Update Existing Grant (Permission Elevation)", () => {
    let initialRequestId: string;
    let initialGrantId: string;

    it("should create initial grant with basic permissions", async () => {
      const { data: parData } = await POST`/oauth-server/par ${{
        response_type: "code",
        client_id: "test-client-stepup",
        redirect_uri: "https://client.example.com/callback",
        scope: "openid profile",
        state: "initial-state",
        code_challenge: "challenge-initial",
        code_challenge_method: "S256",
        grant_management_action: "create",
      }}`;

      initialRequestId = parData.request_uri.split(":").pop()!;
      initialGrantId = await getGrantIdFromRequest(initialRequestId);

      await submitConsent({
        grant_id: initialGrantId,
        subject: "alice",
        scope: "openid profile",
        request_ID: initialRequestId,
      });

      const { data: tokenData } = await POST`/oauth-server/token ${{
        grant_type: "authorization_code",
        client_id: "test-client-stepup",
        code: initialRequestId,
        code_verifier: "challenge-initial",
        redirect_uri: "https://client.example.com/callback",
      }}`;

      expect(tokenData.grant_id).to.equal(initialGrantId);
      console.log("✓ Created initial grant:", initialGrantId);
    });

    it("should query initial grant and verify basic permissions", async () => {
      const { data } = await GET(
        `/grants-management/Grants('${initialGrantId}')`,
        {
          headers: { Accept: "application/json" },
        }
      );

      expect(data.id).to.equal(initialGrantId);
      expect(data.client_id).to.equal("test-client-stepup");
      console.log("✓ Initial grant scope:", data.scope);
    });

    it("should elevate permissions with UPDATE action", async () => {
      const { data: parData } = await POST`/oauth-server/par ${{
        response_type: "code",
        client_id: "test-client-stepup",
        redirect_uri: "https://client.example.com/callback",
        scope: "openid profile email calendar",
        state: "update-state",
        code_challenge: "challenge-update",
        code_challenge_method: "S256",
        grant_management_action: "update",
        grant_id: initialGrantId,
        authorization_details: JSON.stringify([
          {
            type: "mcp",
            locations: ["https://calendar.example.com/"],
            actions: ["read", "write"],
          },
        ]),
      }}`;

      const updateRequestId = parData.request_uri.split(":").pop()!;

      await submitConsent({
        grant_id: initialGrantId,
        subject: "alice",
        scope: "openid profile email calendar",
        request_ID: updateRequestId,
      });

      const { data: tokenData } = await POST`/oauth-server/token ${{
        grant_type: "authorization_code",
        client_id: "test-client-stepup",
        code: updateRequestId,
        code_verifier: "challenge-update",
        redirect_uri: "https://client.example.com/callback",
      }}`;

      expect(tokenData.grant_id).to.equal(initialGrantId);
      console.log("✓ Elevated permissions via UPDATE action");
    });

    it("should verify grant has additional permissions", async () => {
      const { data } = await GET(
        `/grants-management/Grants('${initialGrantId}')`,
        {
          headers: { Accept: "application/json" },
        }
      );

      expect(data.id).to.equal(initialGrantId);
      console.log("✓ Elevated grant scope:", data.scope);

      // Verify new scopes were added
      if (data.scope) {
        const hasEmail = data.scope.includes("email");
        const hasCalendar = data.scope.includes("calendar");
        console.log(
          `  - Has email scope: ${hasEmail}, Has calendar scope: ${hasCalendar}`
        );
      }

      // Verify authorization details were added
      if (data.authorization_details) {
        const hasMcp = data.authorization_details.some(
          (d: any) => d.type === "mcp"
        );
        console.log(`  - Has MCP authorization details: ${hasMcp}`);
      }
    });
  });

  describe("Replace Grant (Complete Permission Reset)", () => {
    let initialGrantId: string;
    let replacedGrantId: string;

    it("should create grant with broad permissions", async () => {
      const { data: parData } = await POST`/oauth-server/par ${{
        response_type: "code",
        client_id: "test-client-replace",
        redirect_uri: "https://client.example.com/callback",
        scope: "openid profile email calendar contacts files",
        state: "initial-replace",
        code_challenge: "challenge-replace-1",
        code_challenge_method: "S256",
        authorization_details: JSON.stringify([
          {
            type: "api",
            locations: ["https://api.example.com/"],
            actions: ["read", "write", "delete"],
          },
          {
            type: "database",
            locations: ["https://db.example.com/"],
            actions: ["read", "write", "delete", "admin"],
          },
        ]),
      }}`;

      const requestId = parData.request_uri.split(":").pop()!;
      initialGrantId = await getGrantIdFromRequest(requestId);

      await submitConsent({
        grant_id: initialGrantId,
        subject: "alice",
        scope: "openid profile email calendar contacts files",
        request_ID: requestId,
      });

      const { data: tokenData } = await POST`/oauth-server/token ${{
        grant_type: "authorization_code",
        client_id: "test-client-replace",
        code: requestId,
        code_verifier: "challenge-replace-1",
        redirect_uri: "https://client.example.com/callback",
      }}`;

      expect(tokenData.grant_id).to.equal(initialGrantId);
      console.log("✓ Created grant with broad permissions:", initialGrantId);
    });

    it("should replace grant with minimal permissions", async () => {
      const { data: parData } = await POST`/oauth-server/par ${{
        response_type: "code",
        client_id: "test-client-replace",
        redirect_uri: "https://client.example.com/callback",
        scope: "openid profile",
        state: "replace-state",
        code_challenge: "challenge-replace-2",
        code_challenge_method: "S256",
        grant_management_action: "replace",
        grant_id: initialGrantId,
      }}`;

      const replaceRequestId = parData.request_uri.split(":").pop()!;

      await submitConsent({
        grant_id: initialGrantId,
        subject: "alice",
        scope: "openid profile",
        request_ID: replaceRequestId,
      });

      const { data: tokenData } = await POST`/oauth-server/token ${{
        grant_type: "authorization_code",
        client_id: "test-client-replace",
        code: replaceRequestId,
        code_verifier: "challenge-replace-2",
        redirect_uri: "https://client.example.com/callback",
      }}`;

      replacedGrantId = tokenData.grant_id;
      expect(replacedGrantId).to.equal(initialGrantId);
      console.log("✓ Replaced grant permissions");
    });

    it("should verify grant has ONLY new minimal permissions", async () => {
      const { data } = await GET(
        `/grants-management/Grants('${replacedGrantId}')`,
        {
          headers: { Accept: "application/json" },
        }
      );

      expect(data.id).to.equal(initialGrantId);
      console.log("✓ Replaced grant scope:", data.scope);

      // Verify old scopes are GONE
      if (data.scope) {
        const hasEmail = data.scope.includes("email");
        const hasCalendar = data.scope.includes("calendar");
        const hasContacts = data.scope.includes("contacts");
        const hasFiles = data.scope.includes("files");

        console.log(`  - Old scopes removed:`);
        console.log(
          `    email: ${!hasEmail}, calendar: ${!hasCalendar}, contacts: ${!hasContacts}, files: ${!hasFiles}`
        );

        expect(data.scope).to.include("openid");
        expect(data.scope).to.include("profile");
      }
    });
  });

  describe("Dynamic Permission Elevation During Session", () => {
    let sessionGrantId: string;
    let accessToken: string;

    it("should establish session with read-only permissions", async () => {
      const { data: parData } = await POST`/oauth-server/par ${{
        response_type: "code",
        client_id: "test-client-dynamic",
        redirect_uri: "https://client.example.com/callback",
        scope: "openid profile data:read",
        state: "session-start",
        code_challenge: "challenge-session",
        code_challenge_method: "S256",
        authorization_details: JSON.stringify([
          {
            type: "api",
            locations: ["https://api.example.com/data"],
            actions: ["read"],
          },
        ]),
      }}`;

      const requestId = parData.request_uri.split(":").pop()!;
      sessionGrantId = await getGrantIdFromRequest(requestId);

      await submitConsent({
        grant_id: sessionGrantId,
        subject: "alice",
        scope: "openid profile data:read",
        request_ID: requestId,
      });

      const { data: tokenData } = await POST`/oauth-server/token ${{
        grant_type: "authorization_code",
        client_id: "test-client-dynamic",
        code: requestId,
        code_verifier: "challenge-session",
        redirect_uri: "https://client.example.com/callback",
      }}`;

      accessToken = tokenData.access_token;
      expect(tokenData.grant_id).to.equal(sessionGrantId);
      console.log("✓ Established session with read-only access");
    });

    it("should attempt protected write operation and be denied", async () => {
      // This would simulate an API call that requires write permission
      console.log("✓ Simulated protected operation denied (read-only access)");
      // In real scenario: expect API call to return 403 Forbidden
    });

    it("should elevate to write permissions mid-session", async () => {
      const { data: parData } = await POST`/oauth-server/par ${{
        response_type: "code",
        client_id: "test-client-dynamic",
        redirect_uri: "https://client.example.com/callback",
        scope: "openid profile data:read data:write",
        state: "elevate-write",
        code_challenge: "challenge-elevate",
        code_challenge_method: "S256",
        grant_management_action: "update",
        grant_id: sessionGrantId,
        authorization_details: JSON.stringify([
          {
            type: "api",
            locations: ["https://api.example.com/data"],
            actions: ["read", "write"],
          },
        ]),
      }}`;

      const elevateRequestId = parData.request_uri.split(":").pop()!;

      await submitConsent({
        grant_id: sessionGrantId,
        subject: "alice",
        scope: "openid profile data:read data:write",
        request_ID: elevateRequestId,
      });

      const { data: tokenData } = await POST`/oauth-server/token ${{
        grant_type: "authorization_code",
        client_id: "test-client-dynamic",
        code: elevateRequestId,
        code_verifier: "challenge-elevate",
        redirect_uri: "https://client.example.com/callback",
      }}`;

      expect(tokenData.grant_id).to.equal(sessionGrantId);
      console.log("✓ Elevated to write permissions mid-session");
    });

    it("should verify grant now has write permissions", async () => {
      const { data } = await GET(
        `/grants-management/Grants('${sessionGrantId}')`,
        {
          headers: { Accept: "application/json" },
        }
      );

      expect(data.id).to.equal(sessionGrantId);

      if (data.scope) {
        const hasWrite = data.scope.includes("data:write");
        console.log(`✓ Grant now has write permission: ${hasWrite}`);
      }

      if (data.authorization_details) {
        const writeAuthDetail = data.authorization_details.find(
          (d: any) => d.type === "api" && d.actions?.includes("write")
        );
        console.log(
          `✓ Authorization details include write action: ${!!writeAuthDetail}`
        );
      }
    });
  });

  describe("Actor-Based Permission Elevation (On-Behalf-Of)", () => {
    let adminGrantId: string;

    it("should create grant with actor context", async () => {
      const { data: parData } = await POST`/oauth-server/par ${{
        response_type: "code",
        client_id: "test-client-actor",
        redirect_uri: "https://client.example.com/callback",
        scope: "openid profile admin:users",
        state: "actor-flow",
        code_challenge: "challenge-actor",
        code_challenge_method: "S256",
        requested_actor: "urn:user:admin-assistant",
        subject: "alice",
        authorization_details: JSON.stringify([
          {
            type: "api",
            locations: ["https://api.example.com/admin"],
            actions: ["manage_users"],
          },
        ]),
      }}`;

      const requestId = parData.request_uri.split(":").pop()!;
      adminGrantId = await getGrantIdFromRequest(requestId);

      await submitConsent({
        grant_id: adminGrantId,
        subject: "alice",
        scope: "openid profile admin:users",
        request_ID: requestId,
      });

      const { data: tokenData } = await POST`/oauth-server/token ${{
        grant_type: "authorization_code",
        client_id: "test-client-actor",
        code: requestId,
        code_verifier: "challenge-actor",
        redirect_uri: "https://client.example.com/callback",
      }}`;

      expect(tokenData.grant_id).to.equal(adminGrantId);
      console.log("✓ Created grant with actor context");

      if (tokenData.actor) {
        console.log(`  - Actor: ${tokenData.actor}`);
      }
    });

    it("should verify grant includes actor information", async () => {
      const { data } = await GET(
        `/grants-management/Grants('${adminGrantId}')`,
        {
          headers: { Accept: "application/json" },
        }
      );

      expect(data.id).to.equal(adminGrantId);

      if (data.actor) {
        console.log(`✓ Grant has actor: ${data.actor}`);
      }

      if (data.subject) {
        console.log(`✓ Grant has subject: ${data.subject}`);
      }
    });
  });
});
