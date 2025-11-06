import cds from "@sap/cds";
import type { McpProxyService } from "./mcp-proxy-service.tsx";
import { getDestinationUrl } from "./utils/destination.tsx";
import { getAllAvailableTools } from "./utils/mcp-client.tsx";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";
import GrantsManagementService, {
  Grants,
  AuthorizationDetail,
} from "#cds-models/sap/scai/grants/GrantsManagementService";

/**
 * Authorize handler - allows agents to request authorization URLs
 * Uses PAR to create request URI and returns authorization URL
 */
export default async function authorize(
  this: McpProxyService,
  req: cds.Request<{
    destinationName?: string;
    tools?: string;
    session_id?: string;
    grant_id?: string;
    agent_id?: string;
    user_id?: string;
  }>
) {
  try {
    const {
      destinationName,
      tools: toolsParam,
      session_id,
      grant_id,
      agent_id,
      user_id,
    } = req.data;

    // Parse tools from JSON string or array
    let requestedTools: string[] = [];
    if (toolsParam) {
      try {
        requestedTools =
          typeof toolsParam === "string" ? JSON.parse(toolsParam) : toolsParam;
      } catch (e) {
        return cds.error("Invalid tools format. Expected JSON array.", {
          code: 400,
        });
      }
    }

    if (!Array.isArray(requestedTools)) {
      return cds.error("Tools must be an array", { code: 400 });
    }

    const destName = destinationName || "MCP_SERVER";

    // Get all available tools from downstream MCP server
    const mcpServerUrl = await getDestinationUrl(destName);
    const availableTools = await getAllAvailableTools(mcpServerUrl);
    const availableToolNames = availableTools.map((t: any) => t.name);

    // Get currently authorized tools if grant_id is provided
    let authorizedTools: string[] = [];
    if (grant_id) {
      authorizedTools = await getAuthorizedTools(grant_id);
    }

    // If no tools requested, return what's available and authorized
    if (requestedTools.length === 0) {
      return {
        authorization_url: null,
        request_uri: null,
        expires_in: 0,
        tools_requested: JSON.stringify([]),
        tools_available: JSON.stringify(availableToolNames),
        tools_authorized: JSON.stringify(authorizedTools),
      };
    }

    // Validate requested tools exist
    const invalidTools = requestedTools.filter(
      (t) => !availableToolNames.includes(t)
    );
    if (invalidTools.length > 0) {
      return cds.error(
        `Invalid tools: ${invalidTools.join(", ")}. Available tools: ${availableToolNames.join(", ")}`,
        { code: 400 }
      );
    }

    // Create authorization detail for MCP tools
    const authDetail = {
      type: "mcp",
      server: mcpServerUrl,
      transport: "sse",
      tools: requestedTools.reduce(
        (acc, tool) => {
          acc[tool] = { essential: true };
          return acc;
        },
        {} as Record<string, { essential: boolean }>
      ),
      riskLevel: calculateRiskLevel(requestedTools),
      category: "mcp-integration",
      description: `Access to ${requestedTools.length} MCP tool(s): ${requestedTools.slice(0, 3).join(", ")}${requestedTools.length > 3 ? "..." : ""}`,
    };

   

    // Create PAR request
    const parRequest = {
      response_type: "code",
      client_id: process.env.MCP_CLIENT_ID || "mcp-agent-client",
      redirect_uri:  `${req.http?.req.protocol}://${req.http?.req.headers.host}/mcp/callback`,
      grant_management_action: grant_id ? "merge" : "create",
      grant_id: grant_id,
      authorization_details: JSON.stringify([{
        type: "mcp",
        server: mcpServerUrl,
        transport: "sse",
        tools: {
          [tool]: { essential: true }
        },
        category: "mcp-integration",
        description: `Access to ${requestedTools.length} MCP tool(s): ${requestedTools.slice(0, 3).join(", ")}${requestedTools.length > 3 ? "..." : ""}`,
      }]),
      requested_actor: agent_id || `urn:mcp:agent:${session_id || "anonymous"}`,
      subject: user_id || cds.context?.user?.id ,
      scope: "mcp:tools",
      state: `state_${Date.now()}`,
      subject_token_type: "urn:ietf:params:oauth:token-type:basic",
    };

    console.log("[McpProxy] Creating PAR request:", {
      ...parRequest,
      authorization_details: [authDetail],
    });

    // Call PAR endpoint using local AuthorizationService
    const authService = await cds.connect.to(AuthorizationService);
    const parResponse = await authService.send("par", parRequest);

    if (!parResponse || !parResponse.request_uri) {
      return cds.error("Failed to create authorization request", {
        code: 500,
      });
    }

    // Get authorization server URL
    const authServerUrl =
      (await cds.connect.to(AuthorizationService).then((service: any) => {
        return service.baseUrl || "/oauth-server";
      })) || "/oauth-server";

    // Build authorization URL
    const authUrl = `${authServerUrl}/authorize?client_id=${encodeURIComponent(parRequest.client_id)}&request_uri=${encodeURIComponent(parResponse.request_uri)}${session_id ? `&session_id=${encodeURIComponent(session_id)}` : ""}`;

    return {
      authorization_url: authUrl,
      request_uri: parResponse.request_uri,
      expires_in: parResponse.expires_in || 90,
      tools_requested: JSON.stringify(requestedTools),
      tools_available: JSON.stringify(availableToolNames),
      tools_authorized: JSON.stringify(authorizedTools),
    };
  } catch (error) {
    console.error("[McpProxy] Error in authorize:", error);
    return cds.error(
      `Authorization error: ${error instanceof Error ? error.message : String(error)}`,
      { code: 500 }
    );
  }
}

/**
 * Get authorized tools from grant
 */
async function getAuthorizedTools(grant_id: string): Promise<string[]> {
  try {
    const grantService = await cds.connect.to(GrantsManagementService);
    const Grants = grantService.entities("Grants") as any;
    const AuthorizationDetail = grantService.entities(
      "AuthorizationDetail"
    ) as any;

    // Get grant
    const grant = await grantService.run(
      cds.ql.SELECT.one.from(Grants).where({ id: grant_id })
    );

    if (!grant) {
      return [];
    }

    // Get authorization details
    const authDetails = await grantService.run(
      cds.ql.SELECT.from(AuthorizationDetail).where({
        consent_grant_id: grant_id,
      })
    );

    const tools: string[] = [];

    if (authDetails && Array.isArray(authDetails)) {
      for (const detail of authDetails) {
        if (detail.type_code === "mcp" || detail.type === "mcp") {
          if (detail.tools) {
            if (
              typeof detail.tools === "object" &&
              !Array.isArray(detail.tools)
            ) {
              // Tools as object: { toolName: true/false, ... }
              Object.keys(detail.tools).forEach((tool) => {
                if (detail.tools[tool] === true) {
                  tools.push(tool);
                }
              });
            } else if (Array.isArray(detail.tools)) {
              // Tools as array: ["toolName1", "toolName2"]
              tools.push(...detail.tools);
            }
          }
        }
      }
    }

    return [...new Set(tools)]; // Deduplicate
  } catch (error) {
    console.error("[McpProxy] Error getting authorized tools:", error);
    return [];
  }
}

/**
 * Calculate risk level based on tool names
 */
function calculateRiskLevel(tools: string[]): "low" | "medium" | "high" {
  const highRiskKeywords = ["delete", "admin", "write", "create", "modify"];
  const mediumRiskKeywords = ["read", "view", "list", "get"];

  const toolNames = tools.join(" ").toLowerCase();

  if (highRiskKeywords.some((keyword) => toolNames.includes(keyword))) {
    return "high";
  }
  if (mediumRiskKeywords.some((keyword) => toolNames.includes(keyword))) {
    return "medium";
  }
  return "low";
}
