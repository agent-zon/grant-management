import cds from "@sap/cds";
// import proxy from "./handler.proxy.tsx";
// import authorize from "./handler.authorize.tsx";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import callback from "./handler.callback";
import grant from "./handler.grant";
import { errorHandler, logHandler } from "@/mcp-service/handelr.debug";
import mcp from "./handler.mcp";

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

/**
 * MCP Service
 * Thin JSON-RPC handler that transport requests to  MCP server
 * and provides authorization tools for agents
 */
export default class Service extends cds.ApplicationService {
  async init() {
    this.on("callback", callback);
    this.on("streaming", errorHandler);
    this.on("streaming", grant);
    this.on("streaming", logHandler);
    this.on("streaming", mcp);
    // this.on("streaming", filter);
    this.on("streaming", async (req) => {
      try {
        // @ts-ignore: req._.req is not typed in CAP context
        const request = req._.req;
        // @ts-ignore: req._.res is not typed in CAP context
        const response = req._.res;
        const transport = new StreamableHTTPServerTransport({
          // sessionIdGenerator: ()=> grant_id || randomUUID(),
          sessionIdGenerator: undefined,
        });
        const server = req.data.server;
        await server.connect(transport);
        await transport.handleRequest(request, response, request.body);
        response.on("close", () => {
          transport.close();
          server.close?.();
        });
      } catch (error) {
        console.error("Error handling MCP request:", error);
        // @ts-ignore: req._.res is not typed in CAP context
        const response = req._.res;
        if (!response.headersSent) {
          response.status(500).json({
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: "Internal server error",
            },
            id: null,
          });
        }
      }
    });
  }
}

export type McpService = Service & typeof cds.ApplicationService;

export type McpHandler = cds.CRUDEventHandler.On<
  "proxy",
  void | { dest: string } | Error
>;
