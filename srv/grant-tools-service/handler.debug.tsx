import cds from "@sap/cds";
import { MCPRequest } from "@types";
import { GrantToolsService } from "./grant-tools-service";

export async function logHandler(
  this: GrantToolsService,
  req: cds.Request<MCPRequest>,
  next: Function
) {
  const start = Date.now();
  try {
    const sessionId = req.headers["mcp-session-id"];
    const { grant_id, agent, host } = await req.data.meta;
    console.log(
      `[Grant Tools] - [${req.data?.method}] -DATA \n`,
      `\n grant_id: ${grant_id}`,
      `\n agent: ${agent}`,
      `\n params: ${req.data?.params}`,
      `\n tools: ${Object.keys(req.data?.tools || {}).join(", ")}`,
      `\n mcp-session-id: ${sessionId}`,
      `\n host: ${host}`,
      `\n azp: ${req.user?.authInfo?.token?.payload?.azp}`,
      `\n authorization: ${req.headers.authorization?.slice(0, 5) + "..."}`,


    );
    return await next();
  } finally {
    console.log(
      `[Grant Tools Service] ${req.data?.method} handled in ${Date.now() - start} ms for user: ${req.user?.id} sid: ${req.user?.authInfo?.token.payload["sid"]} jti: ${req.user?.authInfo?.token.payload.jti}`,
      "response",
      req.http?.res?.statusCode
    );
  }
}

export async function errorHandler(
  this: GrantToolsService,
  req: cds.Request<MCPRequest>,
  next: Function
) {
  try {
    return await next();
  } catch (error: any) {
    console.error(
      "[Grant Tools Service Error]",
      "\tmethod:",
      req.data?.method,
      "\tuser:",
      req.user?.id,
      "\tsid:",
      req.user?.authInfo?.token.payload["sid"],
      "\tjti:",
      req.user?.authInfo?.token.payload.jti,
      "\tazp:",
      req.user?.authInfo?.token.payload.azp,
      "\client_id:",
      req.user?.authInfo?.token.clientId,
      "\tapp_tid:",
      req.user?.authInfo?.token.appTid,
      "\nerror:",
      error.message,
      error.stack
    );
    throw error;
  }
}
