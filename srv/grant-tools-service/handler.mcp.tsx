import {
  McpServer,
  RegisteredTool,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import cds from "@sap/cds";
import { MCPRequest } from "@types";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import GrantsManagementService, {
  AuthorizationDetails,
} from "#cds-models/sap/scai/grants/GrantsManagementService";

/** Session state: transport + tools + grant metadata */
interface Session {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  tools: Record<string, RegisteredTool>;
  grant_id: string;
}

const sessions: { [sessionId: string]: Session } = {};

export default async function (req: cds.Request<MCPRequest>, next: Function) {

  const { host, agent, grant_id } = req.data.meta;
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  // @ts-ignore: req._.req is not typed in CAP context
  const request = req._.req;
  // @ts-ignore: req._.res is not typed in CAP context
  const response = req._.res;

  // ── Existing session: forward request
  if (sessionId && sessions[sessionId]) {
    const session = sessions[sessionId];
    return await session.transport.handleRequest(request, response, cleanJsonRpcBody(req.data));
  }

  // ── New session: create server, register tools, THEN connect ──
  const server = new McpServer({
    name: `agent:${agent}`,
    title: "Grant Tools Service",
    description: "Service for managing grant tools with configurable available tools schema",
    version: "1.0.0",
  });

  // Attach server for downstream handlers (destination, tools, filter)
  req.data = { ...req.data, server };

  // Run middleware chain — registers all tools BEFORE connect
  await next();

  // Create transport and connect AFTER tools are registered
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (newSessionId) => {
      sessions[newSessionId] = {
        transport,
        server,
        tools: req.data.tools || {},
        grant_id: grant_id!,
      };
      console.log("MCP session initialized", { sessionId: newSessionId, agent });
    },
  });

  transport.onclose = () => {
    const sid = transport.sessionId;
    if (sid && sessions[sid]) {
      console.log(`Transport closed for session ${sid}, removing`);
      delete sessions[sid];
    }
  };

  await server.connect(transport);

  // Pass clean JSON-RPC body (not the polluted req._.req.body)
  return await transport.handleRequest(request, response, cleanJsonRpcBody(req.data));
}


/** Extract only defined JSON-RPC fields (notifications have no `id`, `params` is optional) */
function cleanJsonRpcBody(body: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  if (body.jsonrpc !== undefined) clean.jsonrpc = body.jsonrpc;
  if (body.id !== undefined) clean.id = body.id;
  if (body.method !== undefined) clean.method = body.method;
  if (body.params !== undefined) clean.params = body.params;
  return clean;
}
