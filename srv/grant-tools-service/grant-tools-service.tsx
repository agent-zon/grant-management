import cds from "@sap/cds";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import callback from "./handler.callback";
import tools from "./handler.tools";
import { errorHandler, logHandler } from "./handler.debug";
import mcp from "./handler.mcp";
import meta from "./handler.meta";
import { Agents } from "#cds-models/sap/scai/grants/GrantToolsService";

/**
 * Grant Tools Service
 * Service that provides grant:request tool and allows configuration of available tools schema
 */
export default class Service extends cds.ApplicationService {
  async init() {
    this.on("meta", meta);
    this.on("meta", async (req) => {
      return req.data;
    })
    this.on("mcp", Agents, async (req, next) => {
      //@ts-ignore: req.data.meta is not typed in CAP context
      req.data.meta = {
        agent: req.data.id
      };
      return await next();
    });
    this.on("mcp", Agents, meta);

    this.on("mcp", Agents, tools);
    this.on("mcp", Agents, mcp);
    this.on("mcp", Agents, async (req) => {
      try {
        // @ts-ignore: req._.req is not typed in CAP context
        const request = req._.req;
        // @ts-ignore: req._.res is not typed in CAP context
        const response = req._.res;
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });
        //@ts-ignore: req.data.server is not typed in CAP context
        const server = req.data.server;
        await server.connect(transport);
        delete request.body.meta;
        await transport.handleRequest(request, response, request.body);
        response.on("close", () => {
          transport.close();
          server.close?.();
        });
      } catch (error) {
        console.error("Error handling Grant Tools request:", error);
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


    // Register CRUD handlers for AvailableTools
    this.on("callback", callback);
    this.on("mcp", errorHandler);
    this.on("mcp", meta);
    this.on("mcp", tools);
    this.on("mcp", logHandler);
    this.on("mcp", mcp);
    this.on("mcp", async (req) => {
      try {
        // @ts-ignore: req._.req is not typed in CAP context
        const request = req._.req;
        // @ts-ignore: req._.res is not typed in CAP context
        const response = req._.res;
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });
        const server = req.data.server;
        await server.connect(transport);
        console.log("🚀 MCP Server Connected:", request.body);
        delete request.body.meta;
        await transport.handleRequest(request, response, request.body);
        response.on("close", () => {
          transport.close();
          server.close?.();
        });
      } catch (error) {
        console.error("Error handling Grant Tools request:", error);
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

export type GrantToolsService = Service & typeof cds.ApplicationService;

export type GrantToolsHandler = cds.CRUDEventHandler.On<
  "streaming",
  void | { dest: string } | Error
>;

