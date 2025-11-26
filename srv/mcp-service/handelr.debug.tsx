import cds from "@sap/cds";
import { MCPRequest } from "@types";
import { McpService } from "@/mcp-service/mcp-service.tsx";

export async function logHandler(
  this: McpService,
  req: cds.Request<MCPRequest>,
  next: Function
) {
  const start = Date.now();
  try {
    const sessionId = req.headers["mcp-session-id"];
    console.log(
      `[MCP] - ${req.data?.method} - Grant Id:`,
      req.data?.grant_id,
      "sessionId:",
      sessionId,
      "user:",
      req.user?.id,
      "serverId:",
      req.data?.serverId,
      "origin:",
      req.data?.origin,
      "authHeader",
      req.headers.authorization?.slice(0, 5) + "...",
      "params:",
      req.data?.params,
      "tools:",
      Object.keys(req.data?.tools || {}).join(", "),
      "authorizationDetails:",
      req.data?.authorizationDetails.tools,
      "grant:",
      req.data?.grant
    );
    return await next();
  } finally {
    console.log(
      `[MCP Service] ${req.data?.method} handled in ${Date.now() - start} ms for user: ${req.user?.id} sid: ${req.user?.authInfo?.token.payload["sid"]} jti: ${req.user?.authInfo?.token.payload.jti}`,
      "response",
      req.http?.res?.statusCode
    );
  }
}

export async function errorHandler(
  this: McpService,
  req: cds.Request<MCPRequest>,
  next: Function
) {
  try {
    return await next();
  } catch (error: any) {
    console.error(
      "[MCP Service Error]",
      "\tmethod:",
      req.data?.method,
      "\tuser:",
      req.user?.id,
      "\tsid:",
      req.user?.authInfo?.token.payload["sid"],
      "\tjti:",
      req.user?.authInfo?.token.payload.jti,
      "\nerror:",
      error.message,
      error.stack
    );
    throw error;
  }
}
