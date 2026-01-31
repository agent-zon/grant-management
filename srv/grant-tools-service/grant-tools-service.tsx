import cds from "@sap/cds";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import callback from "./handler.callback";
import grant from "./handler.grant";
import { errorHandler, logHandler } from "./handler.debug";
import tools from "./handler.tools";
import mcp from "./handler.mcp";
import { Agents } from "#cds-models/sap/scai/grants/GrantToolsService";

/**
 * Grant Tools Service
 * Service that provides grant:request tool and allows configuration of available tools schema
 */
export default class Service extends cds.ApplicationService {
  async init() {
    this.on("meta", Agents, async (req) => {
      const host = req.headers["x-forwarded-host"] || req.http?.req.headers.host;
      const protocol = req.headers["x-forwarded-proto"] || req.http?.req.protocol;
      const origin = `${protocol}://${host}`;
      const self = `${origin}/${req.path.replace("/meta", "")}`;

      return {
        host: host,
        self: self,
        mcp: `${self}/mcp`,
        tools: `${self}/tools`
      };
    });
    this.on("meta", async (req) => {
      const host = req.headers["x-forwarded-host"] || req.http?.req.headers.host || cds.app?._router?.get("host")  ;
      const protocol = req.headers["x-forwarded-proto"] || req.http?.req.protocol;
      const origin = host ? `${protocol}://${host}/` : undefined;
      req.data.origin = origin;
      req.data.agent = req.data.id;

      return {
        origin,
        mcp: `${origin}mcp`,
        originalUrl: req.http?.req.originalUrl,
         headers: req.http?.req.headers,
       };
    });

    this.on("READ", Agents, async (req, next) => {
      console.log("READ", req.data);
      const host = req.headers["x-forwarded-host"] || req.http?.req.headers.host;
      const protocol = req.headers["x-forwarded-proto"] || req.http?.req.protocol;
      const origin = `${protocol}://${host}`;
      const self = `${origin}${req.data.id ? `/${req.data.id}` : ""}`;
      req.data.links = {
        host: origin,
        self: self,
        mcp: `${self}/mcp`,
        tools: `${origin}/tools`
      };
      return await next(req);
    });



    this.on("mcp", Agents, (req, next) => {
      const host = req.headers["x-forwarded-host"] || req.http?.req.headers.host;
      const protocol = req.headers["x-forwarded-proto"] || req.http?.req.protocol;
      req.data.host = `${protocol}://${host}`;
      req.data.agent = req.data.id;
      req.data["$expand"] = [
        ...(req.data["$expand"]?.split(",") || []),
        "tools"
      ].filter(unique)
        .join(",");
      return next(req);
    });
    this.on("mcp", Agents, grant);
    this.on("mcp", Agents, async (req) => {
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
    this.on("mcp", grant);
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
function unique(value: any, index: number, array: any[]): value is any {
  return array.indexOf(value) === index;
}

