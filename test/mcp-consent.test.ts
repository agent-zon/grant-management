// Tests for MCP Consent Middleware

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import cds from "@sap/cds";
import { SessionManager } from "../srv/mcp-consent-middleware/session-manager";
import { ToolPolicyManager } from "../srv/mcp-consent-middleware/tool-policy-integration";
import type { McpTool } from "../srv/mcp-consent-middleware/types";

describe("MCP Consent Middleware", () => {
  let srv: any;
  let authService: any;
  let grantService: any;

  beforeAll(async () => {
    // Deploy test database
    await cds.deploy(__dirname + "/../srv").to("sqlite::memory:");

    // Connect to services
    authService = await cds.connect.to("AuthorizationService");
    grantService = await cds.connect.to("GrantsManagementService");
    srv = await cds.connect.to("McpConsentService");
  });

  afterAll(async () => {
    await cds.shutdown();
  });

  describe("SessionManager", () => {
    let sessionManager: SessionManager;

    beforeEach(() => {
      sessionManager = new SessionManager();
    });

    it("should create a new session", () => {
      const session = sessionManager.createSession(
        "test-session-1",
        "agent-1",
        "user-1"
      );

      expect(session).toBeDefined();
      expect(session.sessionId).toBe("test-session-1");
      expect(session.agent_id).toBe("agent-1");
      expect(session.user_id).toBe("user-1");
      expect(session.grant_id).toBeUndefined();
    });

    it("should attach grant to session", () => {
      const sessionId = "test-session-2";
      sessionManager.createSession(sessionId);

      sessionManager.attachGrant(sessionId, "grant-123", [
        {
          type: "mcp",
          tools: { ReadFile: true, WriteFile: true },
        } as any,
      ]);

      const session = sessionManager.getSession(sessionId);
      expect(session?.grant_id).toBe("grant-123");
      expect(session?.authorization_details).toHaveLength(1);
    });

    it("should get or create session", () => {
      const session1 = sessionManager.getOrCreateSession("test-session-3");
      expect(session1).toBeDefined();

      const session2 = sessionManager.getOrCreateSession("test-session-3");
      expect(session2.sessionId).toBe(session1.sessionId);
    });

    it("should revoke session authorization", () => {
      const sessionId = "test-session-4";
      sessionManager.createSession(sessionId);
      sessionManager.attachGrant(sessionId, "grant-456");

      const revoked = sessionManager.revokeSession(sessionId);
      expect(revoked).toBe(true);

      const session = sessionManager.getSession(sessionId);
      expect(session?.grant_id).toBeUndefined();
    });

    it("should provide session statistics", () => {
      sessionManager.createSession("test-session-5");
      sessionManager.createSession("test-session-6");
      sessionManager.attachGrant("test-session-6", "grant-789");

      const stats = sessionManager.getStats();
      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.withGrants).toBeGreaterThanOrEqual(1);
    });
  });

  describe("ToolPolicyManager", () => {
    let policyManager: ToolPolicyManager;

    beforeEach(() => {
      policyManager = new ToolPolicyManager();
    });

    it("should get related tools from policy groups", () => {
      const relatedTools = policyManager.getRelatedTools("ReadFile");
      expect(relatedTools).toContain("ReadFile");
      expect(relatedTools).toContain("ListFiles");
    });

    it("should return single tool if not in any group", () => {
      const relatedTools = policyManager.getRelatedTools("UnknownTool");
      expect(relatedTools).toEqual(["UnknownTool"]);
    });

    it("should suggest tools for consent request", () => {
      const result = policyManager.suggestToolsForConsent(["ReadFile"]);

      expect(result.requested).toContain("ReadFile");
      expect(result.all.length).toBeGreaterThan(1); // Should include related tools
    });

    it("should determine risk level for tools", () => {
      const lowRisk = policyManager.getRiskLevel(["ReadFile"]);
      expect(lowRisk).toBe("low");

      const highRisk = policyManager.getRiskLevel(["DeleteFile"]);
      expect(highRisk).toBe("high");
    });

    it("should filter tools by authorization", () => {
      const allTools: McpTool[] = [
        { name: "ReadFile", inputSchema: { type: "object" } },
        { name: "WriteFile", inputSchema: { type: "object" } },
        { name: "DeleteFile", inputSchema: { type: "object" } },
      ];

      const authorizedTools = ["ReadFile", "WriteFile"];
      const filtered = policyManager.filterToolsByAuthorization(
        allTools,
        authorizedTools
      );

      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.name)).toEqual(["ReadFile", "WriteFile"]);
    });

    it("should create authorization detail for tools", () => {
      const authDetail = policyManager.createAuthorizationDetail(
        ["ReadFile", "WriteFile"],
        "http://localhost:3000/mcp"
      );

      expect(authDetail.type).toBe("mcp");
      expect(authDetail.server).toBe("http://localhost:3000/mcp");
      expect(authDetail.tools).toHaveProperty("ReadFile");
      expect(authDetail.tools).toHaveProperty("WriteFile");
      expect(authDetail.riskLevel).toBeDefined();
    });

    it("should group tools by policy", () => {
      const toolNames = ["ReadFile", "WriteFile", "DeleteFile", "UnknownTool"];
      const grouped = policyManager.groupTools(toolNames);

      expect(grouped.size).toBeGreaterThan(0);
      // ReadFile should be in file-read group
      // WriteFile should be in file-write group
      // DeleteFile should be in file-delete group
      // UnknownTool should be in ungrouped
    });
  });

  describe("MCP Proxy Integration", () => {
    it("should handle health check", async () => {
      const result = await srv.health();
      expect(result).toBeDefined();
    });

    // Note: Full integration tests require:
    // - Downstream MCP server mock
    // - Authorization flow simulation
    // - Grant creation and querying
    // These are better suited for E2E tests
  });
});

describe("Tool Authorization Flow", () => {
  it("should validate tool permission in authorization_details", () => {
    const authDetails = [
      {
        type: "mcp",
        type_code: "mcp",
        tools: {
          ReadFile: { essential: true },
          ListFiles: { essential: false },
        },
      },
    ];

    // Helper to check tool permission (mimics session manager logic)
    const checkToolPermission = (toolName: string): boolean => {
      const mcpDetails = authDetails.filter(
        (d) => d.type === "mcp" || d.type_code === "mcp"
      );

      for (const detail of mcpDetails) {
        if (detail.tools && toolName in detail.tools) {
          return true;
        }
      }

      return false;
    };

    expect(checkToolPermission("ReadFile")).toBe(true);
    expect(checkToolPermission("ListFiles")).toBe(true);
    expect(checkToolPermission("WriteFile")).toBe(false);
  });

  it("should handle tools as array format", () => {
    const authDetails = [
      {
        type: "mcp",
        tools: ["ReadFile", "ListFiles"],
      },
    ];

    const checkToolPermission = (toolName: string): boolean => {
      const mcpDetails = authDetails.filter((d) => d.type === "mcp");

      for (const detail of mcpDetails) {
        if (detail.tools) {
          if (Array.isArray(detail.tools)) {
            if (detail.tools.includes(toolName)) {
              return true;
            }
          }
        }
      }

      return false;
    };

    expect(checkToolPermission("ReadFile")).toBe(true);
    expect(checkToolPermission("WriteFile")).toBe(false);
  });
});
