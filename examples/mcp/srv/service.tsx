import cds from "@sap/cds";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import server from "./mcp";
import filter from "./filter";
import callback from "./callback";


/**
 * MCP Proxy Service
 * Thin JSON-RPC middleware that proxies requests to downstream MCP server
 * and provides authorization tools for agents
 */
export default class Service extends cds.ApplicationService {
  async init() {
    console.log("🔧 Initializing McpProxyService...");

    this.on("callback", callback);
    this.on("streaming", filter);
    this.on("streaming", async (req) => {
      try {
        // @ts-ignore: req._.req is not typed in CAP context
        const request = req._.req;
        // @ts-ignore: req._.res is not typed in CAP context
        const response = req._.res;
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });
        await server.connect(transport);
        await transport.handleRequest(
            request,
            response,
            request.body,
        );
        response.on('close', () => {
          transport.close();
          server.close?.();
        });
      } catch (error) {
        console.error('Error handling MCP request:', error);
        // @ts-ignore: req._.res is not typed in CAP context
        const response = req._.res;
        if (!response.headersSent) {
          response.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          });
        }
      }
    });
  }
}

export type McpService = Service & typeof cds.ApplicationService;

