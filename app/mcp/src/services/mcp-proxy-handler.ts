// MCP Proxy Handler - Intercepts and enforces consent on MCP tool calls

import type {
  McpRequest,
  McpResponse,
  McpToolCallParams,
  McpInitializeParams,
  McpServerCapabilities,
  McpTool,
  AuthorizationResult,
} from "../types";
import { sessionManager } from "./session-manager";
import { toolPolicyManager } from "./tool-policy-integration";
import fetch from "node-fetch";

/**
 * MCP Proxy Handler
 * Intercepts MCP JSON-RPC requests and enforces tool-level authorization
 */
export class McpProxyHandler {
  private downstreamUrl: string;

  constructor(downstreamUrl: string) {
    this.downstreamUrl = downstreamUrl;
  }

  /**
   * Handle incoming MCP JSON-RPC request
   */
  async handleRequest(
    request: McpRequest,
    sessionId: string
  ): Promise<McpResponse> {
    console.log(
      `[McpProxy] Handling ${request.method} for session ${sessionId}`
    );

    try {
      switch (request.method) {
        case "initialize":
          return await this.handleInitialize(request, sessionId);

        case "tools/list":
          return await this.handleToolsList(request, sessionId);

        case "tools/call":
          return await this.handleToolCall(request, sessionId);

        case "resources/list":
        case "resources/read":
        case "prompts/list":
        case "prompts/get":
          // Pass through other MCP methods without authorization
          return await this.forwardToDownstream(request);

        default:
          return {
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`,
            },
          };
      }
    } catch (error) {
      console.error("[McpProxy] Error handling request:", error);
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message: "Internal error",
          data: {
            error: error instanceof Error ? error.message : String(error),
          },
        },
      };
    }
  }

  /**
   * Handle MCP initialize request
   * Filter tools based on session's grant authorization_details
   */
  private async handleInitialize(
    request: McpRequest,
    sessionId: string
  ): Promise<McpResponse> {
    console.log(`[McpProxy] Initialize request for session ${sessionId}`);

    // Forward to downstream MCP server
    const response = await this.forwardToDownstream(request);

    // If downstream returned error, pass it through
    if (response.error) {
      return response;
    }

    // Get session and authorized tools
    const authorizedTools = await sessionManager.getAuthorizedTools(sessionId);

    console.log(
      `[McpProxy] Session ${sessionId} has ${authorizedTools.length} authorized tools:`,
      authorizedTools
    );

    // Filter server capabilities based on authorization
    if (response.result && response.result.capabilities) {
      // Note: Initialize response doesn't include tools list
      // Tools are returned by tools/list method
      // We just pass through the capabilities here
      console.log("[McpProxy] Initialize succeeded, capabilities advertised");
    }

    return response;
  }

  /**
   * Handle tools/list request
   * Filter tools based on session's authorization
   */
  private async handleToolsList(
    request: McpRequest,
    sessionId: string
  ): Promise<McpResponse> {
    console.log(`[McpProxy] Tools list request for session ${sessionId}`);

    // Forward to downstream MCP server
    const response = await this.forwardToDownstream(request);

    if (response.error) {
      return response;
    }

    // Get authorized tools for this session
    const authorizedToolNames =
      await sessionManager.getAuthorizedTools(sessionId);

    if (authorizedToolNames.length === 0) {
      console.log(
        `[McpProxy] No authorized tools for session ${sessionId}, returning empty list`
      );
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          tools: [],
        },
      };
    }

    // Filter tools based on authorization
    if (response.result && response.result.tools) {
      const allTools: McpTool[] = response.result.tools;
      const filteredTools = toolPolicyManager.filterToolsByAuthorization(
        allTools,
        authorizedToolNames
      );

      console.log(
        `[McpProxy] Filtered tools from ${allTools.length} to ${filteredTools.length} for session ${sessionId}`
      );

      return {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          tools: filteredTools,
        },
      };
    }

    return response;
  }

  /**
   * Handle tools/call request
   * Validate authorization before forwarding
   */
  private async handleToolCall(
    request: McpRequest,
    sessionId: string
  ): Promise<McpResponse> {
    const params = request.params as McpToolCallParams;
    const toolName = params?.name;

    if (!toolName) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32602,
          message: "Invalid params: tool name required",
        },
      };
    }

    console.log(
      `[McpProxy] Tool call request: ${toolName} for session ${sessionId}`
    );

    // Validate tool authorization
    const authResult = await sessionManager.validateToolAccess(
      sessionId,
      toolName
    );

    if (!authResult.authorized) {
      console.log(
        `[McpProxy] Tool ${toolName} not authorized for session ${sessionId}: ${authResult.reason}`
      );

      // Return consent required error
      return this.createConsentRequiredError(
        request.id,
        sessionId,
        toolName,
        authResult
      );
    }

    console.log(
      `[McpProxy] Tool ${toolName} authorized, forwarding to downstream`
    );

    // Forward to downstream MCP server
    return await this.forwardToDownstream(request);
  }

  /**
   * Forward request to downstream MCP server
   */
  private async forwardToDownstream(request: McpRequest): Promise<McpResponse> {
    try {
      const response = await fetch(this.downstreamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(
          `Downstream server error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return data as McpResponse;
    } catch (error) {
      console.error("[McpProxy] Error forwarding to downstream:", error);
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message: "Failed to communicate with downstream MCP server",
          data: {
            error: error instanceof Error ? error.message : String(error),
          },
        },
      };
    }
  }

  /**
   * Create consent required error response
   * This tells the agent they need to get user consent for the tool
   */
  private createConsentRequiredError(
    requestId: string | number,
    sessionId: string,
    toolName: string,
    authResult: AuthorizationResult
  ): McpResponse {
    return {
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: -32001, // Custom code for consent required
        message: "Consent required",
        data: {
          sessionId,
          toolName,
          reason: authResult.reason,
          missingTools: authResult.missingTools,
          grant_id: authResult.grant_id,
          message: `Tool '${toolName}' requires user consent before it can be used.`,
          // The authorization URL will be added by the service layer
        },
      },
    };
  }

  /**
   * Filter tools by authorization details
   * Helper method to match tools against authorization_details
   */
  filterToolsByAuthDetails(allTools: McpTool[], authDetails: any[]): McpTool[] {
    const mcpDetails = authDetails.filter(
      (d) => d.type === "mcp" || d.type_code === "mcp"
    );

    if (mcpDetails.length === 0) {
      return [];
    }

    const allowedToolNames = new Set<string>();

    for (const detail of mcpDetails) {
      if (detail.tools) {
        if (typeof detail.tools === "object" && !Array.isArray(detail.tools)) {
          // Tools as object: { toolName: true, ... }
          Object.keys(detail.tools).forEach((tool) =>
            allowedToolNames.add(tool)
          );
        } else if (Array.isArray(detail.tools)) {
          // Tools as array: ["toolName1", "toolName2"]
          detail.tools.forEach((tool: string) => allowedToolNames.add(tool));
        }
      }
    }

    return allTools.filter((tool) => allowedToolNames.has(tool.name));
  }

  /**
   * Get downstream URL
   */
  getDownstreamUrl(): string {
    return this.downstreamUrl;
  }

  /**
   * Update downstream URL
   */
  setDownstreamUrl(url: string): void {
    this.downstreamUrl = url;
    console.log(`[McpProxy] Downstream URL updated to: ${url}`);
  }
}

/**
 * Extract session ID from request headers or generate one
 */
export function extractSessionId(
  headers: Record<string, string | string[] | undefined>
): string {
  const sessionId =
    (headers["mcp-session-id"] as string) ||
    (headers["x-session-id"] as string) ||
    (headers["session-id"] as string);

  if (sessionId) {
    return Array.isArray(sessionId) ? sessionId[0] : sessionId;
  }

  // Generate new session ID
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Extract agent ID from request headers
 */
export function extractAgentId(
  headers: Record<string, string | string[] | undefined>
): string | undefined {
  const agentId =
    (headers["mcp-agent-id"] as string) ||
    (headers["x-agent-id"] as string) ||
    (headers["agent-id"] as string);

  if (agentId) {
    return Array.isArray(agentId) ? agentId[0] : agentId;
  }

  return undefined;
}

/**
 * Extract user ID from request headers or context
 */
export function extractUserId(
  headers: Record<string, string | string[] | undefined>
): string | undefined {
  const userId =
    (headers["mcp-user-id"] as string) ||
    (headers["x-user-id"] as string) ||
    (headers["user-id"] as string);

  if (userId) {
    return Array.isArray(userId) ? userId[0] : userId;
  }

  return undefined;
}
