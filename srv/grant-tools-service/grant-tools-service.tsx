import cds from "@sap/cds";
import callback from "./handler.callback";
import filter from "./handler.filter";
import destination from "./handler.destination";
import { errorHandler, logHandler } from "./handler.debug";
import mcp from "./handler.mcp";
import meta from "./handler.meta";
import { registerDestination } from "@sap-cloud-sdk/connectivity";
import tools from "./handler.tools";

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

    this.on("register", meta);

    this.on("register", async (req) => {
      const { meta, destination } = req.data;
      const { agent, grant_id, host } = meta;
      console.log("🚀 Registering destination:", `agent:${agent}`);
      try {
        await registerDestination({
          ...destination,
          name: `agent:${agent}`,
        });

        req.reply(200)

        return {
          status: 200,
          message: "Destination registered",
          name: `agent:${agent}`,
          agent: agent,
          url: destination.url,
          strategy: destination.strategy,
        }
      } catch (error) {
        console.error("Error registering destination:", error);
        throw error;
      }
    });

    // Register handlers
    this.on("callback", callback);

    // MCP handler chain: errorHandler → meta → logHandler → mcp → destination → tools → filter
    // mcp creates the McpServer + transport (stateful sessions)
    // destination/tools/filter register tools BEFORE connect (only on initialize)
    // Existing sessions skip the chain entirely and forward to the stored transport
    this.on("mcp", errorHandler);
    this.on("mcp", meta);
    this.on("mcp", logHandler);
    this.on("mcp", mcp);
    this.on("mcp", destination);
    this.on("mcp", tools);
    this.on("mcp", filter);
  }
}

export type GrantToolsService = Service & typeof cds.ApplicationService;

export type GrantToolsHandler = cds.CRUDEventHandler.On<
  "streaming",
  void | { dest: string } | Error
>;

