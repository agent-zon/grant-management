import cds from "@sap/cds";
// import proxy from "./handler.proxy.tsx";
// import authorize from "./handler.authorize.tsx";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import server from "./mcp.server";
 import { randomUUID } from "node:crypto";
import filter from "./handler.filter";
import callback from "./handler.callback";

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

/**
 * MCP Service
 * Thin JSON-RPC handler that transport requests to  MCP server
 * and provides authorization tools for agents
 */
export default class Service extends cds.ApplicationService {
  async init() {
    this.on("callback", callback);
    this.on("streaming", filter);
    this.on("streaming", async (request) => {
      const sessionId = request.headers["mcp-session-id"] as string | undefined;
      const transport =
        (sessionId && transports[sessionId]) || (await newTransport(sessionId));
      const { req, res } = request.http!;

      try {
        // Handle the request
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        cds.log.Logger?.error("Error handling MCP request:", error);
        console.error("Error handling MCP request:", error);
        // @ts-ignore: req._.res is not typed in CAP context
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: "Internal server error",
            },
            id: null,
          });
        }
      }

      async function newTransport(sessionId?: string) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => sessionId || randomUUID(),
          onsessioninitialized: (sessionId) => {
            // Store the transport by session ID
            transports[sessionId] = transport;
          },
          // DNS rebinding protection is disabled by default for backwards compatibility. If you are running this server
          // locally, make sure to set:
          // enableDnsRebindingProtection: true,
          // allowedHosts: ['127.0.0.1'],
        });

        // Clean up transport when closed
        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
          }
        };
        // Connect to the MCP server
        await server.connect(transport);
        return transport;
      }
    });
 
   }
}

export type McpService = Service & typeof cds.ApplicationService;

export type McpHandler = cds.CRUDEventHandler.On<
  "proxy",
  void | { dest: string } | Error
>;
