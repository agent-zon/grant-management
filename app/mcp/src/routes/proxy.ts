import { Router, Request, Response } from "express";
import { sessionManager } from "../services/session-manager";
import { McpProxyHandler } from "../services/mcp-proxy-handler";
import { toolPolicyManager } from "../services/tool-policy-integration";
import { authorizationClient } from "../services/authorization-client";
import { config } from "../config";
import type { McpRequest, ConsentRequestPayload } from "../types";
import {
  extractSessionId,
  extractAgentId,
  extractUserId,
} from "../middleware/session-extractor";

const router = Router();
const mcpProxyHandler = new McpProxyHandler(config.mcpServerUrl);

/**
 * Main MCP JSON-RPC proxy endpoint
 * POST /proxy
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    // Extract or generate session ID
    const sessionId = extractSessionId(req.headers);
    const agentId = extractAgentId(req.headers);
    const userId = extractUserId(req.headers);

    console.log(`[Proxy] Request from session ${sessionId}`);

    // Ensure session exists
    sessionManager.getOrCreateSession(sessionId, agentId, userId);

    // Parse MCP request
    const mcpRequest: McpRequest = req.body;

    if (!mcpRequest || !mcpRequest.method) {
      return res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Invalid request" },
        id: null,
      });
    }

    // Handle the request through the proxy
    const mcpResponse = await mcpProxyHandler.handleRequest(
      mcpRequest,
      sessionId
    );

    // Check if consent is required
    if (mcpResponse.error && mcpResponse.error.code === -32001) {
      // Consent required - trigger authorization flow
      const toolName = mcpResponse.error.data?.toolName;
      const grant_id = mcpResponse.error.data?.grant_id;

      if (toolName) {
        const authUrl = await triggerConsentFlow(
          sessionId,
          toolName,
          agentId,
          userId,
          grant_id,
          req
        );

        if (authUrl) {
          mcpResponse.error.data.authorizationUrl = authUrl;
          mcpResponse.error.data.instructions =
            "Please visit the authorization URL to grant consent for this tool.";
        }
      }
    }

    // Set session ID in response header
    res.setHeader("mcp-session-id", sessionId);
    res.json(mcpResponse);
  } catch (error) {
    console.error("[Proxy] Error in proxy handler:", error);
    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal server error",
        data: {
          error: error instanceof Error ? error.message : String(error),
        },
      },
      id: null,
    });
  }
});

/**
 * Trigger consent flow via Authorization API
 */
async function triggerConsentFlow(
  sessionId: string,
  toolName: string,
  agentId?: string,
  userId?: string,
  existingGrantId?: string,
  req?: Request
): Promise<string | null> {
  try {
    console.log(`[Proxy] Triggering consent flow for tool: ${toolName}`);

    // Get related tools from policy
    const relatedTools = toolPolicyManager.getRelatedTools(toolName);
    console.log(`[Proxy] Requesting consent for tools:`, relatedTools);

    // Create authorization detail for MCP tools
    const authDetail = toolPolicyManager.createAuthorizationDetail(
      relatedTools,
      config.mcpServerUrl
    );

    // Get base URL for callback
    const protocol = req?.protocol || "http";
    const host = req?.get("host") || "localhost:8080";
    const baseUrl = `${protocol}://${host}`;
    const redirectUri = `${baseUrl}/callback`;

    // Build PAR request
    const parRequest: ConsentRequestPayload = {
      response_type: "code",
      client_id: config.clientId,
      redirect_uri: redirectUri,
      grant_management_action: existingGrantId ? "merge" : "create",
      grant_id: existingGrantId,
      authorization_details: JSON.stringify([authDetail]),
      requested_actor: agentId || `urn:mcp:agent:${sessionId}`,
      subject: userId || "anonymous",
      scope: "mcp:tools",
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
    };

    console.log("[Proxy] Sending PAR request:", {
      ...parRequest,
      authorization_details: JSON.parse(parRequest.authorization_details),
    });

    // Call PAR endpoint
    const parResponse = await authorizationClient.createPAR(parRequest);

    if (!parResponse || !parResponse.request_uri) {
      console.error("[Proxy] PAR failed:", parResponse);
      return null;
    }

    console.log("[Proxy] PAR succeeded:", parResponse);

    // Build authorization URL
    const authUrl = authorizationClient.getAuthorizationUrl(
      parResponse.request_uri,
      sessionId
    );

    return authUrl;
  } catch (error) {
    console.error("[Proxy] Error triggering consent flow:", error);
    return null;
  }
}

export { router as proxyRouter };
