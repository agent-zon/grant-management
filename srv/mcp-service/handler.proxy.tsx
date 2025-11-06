import cds from "@sap/cds";
import fetch from "node-fetch";
import type { McpService } from "./mcp-service.tsx";
import { getDestination } from "./utils/destination.tsx";
import { executeHttpRequest } from "@sap-cloud-sdk/http-client";
import type { McpDestination } from "#cds-models/sap/scai/mcp/McpDestination";
import {
  IdentityService,
  IdentityServiceToken,
  SecurityContext,
} from "@sap/xssec";
import {HttpDestination} from "@sap-cloud-sdk/connectivity";

/**
 * Proxy handler - forwards MCP JSON-RPC requests to downstream server
 * with tool filtering based on authorization
 */
export default async function proxy(
  this: McpService,
  req: cds.Request<McpDestination>,
) {
  try {

    // Get body from request data or raw body
    let body = req.data?.body;
    if (!body && req.http?.req.body) {
      body =
        typeof req.http.req.body === "string"
          ? req.http.req.body
          : JSON.stringify(req.http.req.body);
    }

    if (!body) {
      return cds.error("Request body required", { code: 400 });
    }

    // Parse JSON-RPC request
    let mcpRequest: any;
    try {
      mcpRequest = typeof body === "string" ? JSON.parse(body) : body;
    } catch (e) {
      return cds.error("Invalid JSON-RPC request", { code: 400 });
    }

    // Validate JSON-RPC structure
    if (!mcpRequest.jsonrpc || mcpRequest.jsonrpc !== "2.0") {
      return cds.error("Invalid JSON-RPC version", { code: 400 });
    }

    const destName = destinationName || "mcp";
    console.log(
      `[McpProxy] Proxying ${mcpRequest.method} request to destination: ${destName}`
    );

    // Get MCP server URL from destination
    const destination = await getDestination(destName, req.user.authInfo);

    // Forward to downstream MCP server
    const response = await executeHttpRequest(destination, {
      method: "POST",
      headers: {
        ...(req.http?.req.headers["mcp-session-id"]
          ? {
              "mcp-session-id": req.http.req.headers[
                "mcp-session-id"
              ] as string,
            }
          : {}),
        ...(req.http?.req.headers["last-event-id"]
          ? { "last-event-id": req.http.req.headers["last-event-id"] as string }
          : {}),
        ...(req.http?.req.headers["content-type"]
          ? {
              "content-type": req.http.req.headers["content-type"] as string,
            }
          : {}),
        ...(req.http?.req.headers["accept"]
          ? { accept: req.http.req.headers["accept"] as string }
          : {}),
        ...(req.http?.req.headers["user-agent"]
          ? { "user-agent": req.http.req.headers["user-agent"] as string }
          : {}),
        ...(req.http?.req.headers["x-custom-auth-header"]
          ? {
              "x-custom-auth-header": req.http.req.headers[
                "x-custom-auth-header"
              ] as string,
            }
          : {}),
        ...(req.http?.req.headers["x-mcp-proxy"]
          ? { "x-mcp-proxy": req.http.req.headers["x-mcp-proxy"] as string }
          : {}),
        ...(req.http?.req.headers["x-session-id"]
          ? { "x-session-id": req.http.req.headers["x-session-id"] as string }
          : {}),
        ...(req.http?.req.headers["x-agent-id"]
          ? { "x-agent-id": req.http.req.headers["x-agent-id"] as string }
          : {}),
        ...(req.http?.req.headers["x-user-id"]
          ? { "x-user-id": req.http.req.headers["x-user-id"] as string }
          : {}),
        ...destination.headers,
      },
      body: JSON.stringify(mcpRequest),
    });

    if (!response.ok) {
      throw new Error(
        `Downstream server error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Forward MCP-specific response headers
    const responseHeaders = response.headers;
    for (const [key, value] of responseHeaders.entries()) {
      req.http?.res.setHeader(key, value);
    }
    req.http?.res.status(response.status);
    req.http?.res.json(data);
  } catch (error) {
    console.error("[McpProxy] Error in proxy:", error);
    return {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32603,
        message: "Internal server error",
        data: { error: error instanceof Error ? error.message : String(error) },
      },
    };
  }
}

declare module "@sap/cds" {
  interface User {
    authInfo?: SecurityContext<IdentityService, IdentityServiceToken>;
  }
}
