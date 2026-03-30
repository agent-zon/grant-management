import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import type {
    McpServer,
    RegisteredTool,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Env } from "./type";
import { createMcpHandler } from "mcp-handler";

/**
 * Runs during each MCP initializeServer callback, after tools are registered and before connect/handleRequest.
 * Stack these via createMcpToolFilterMiddleware; routes without that middleware leave tools unchanged (e.g. /debug).
 */
export type McpToolFilter = (
    c: Context<Env>,
    tools: Record<string, RegisteredTool>,
) => void | Promise<void>;

/**
 * Hono middleware: append filters to c.var.toolFilters for this request.
 * Safe to call multiple times — filters run in registration order.
 *
 * Tool filtering cannot run after `next()` (mcp-handler already serialized tools/list).
 * The remote handler must invoke runMcpToolFilters from inside initializeServer.
 */

export type McpServerEnv = {
    Variables: {
        "server.create": typeof createMcpHandler;
        "server.initialize": typeof mcpServerMiddleware;
        "server": McpServer & { tools: Record<string, RegisteredTool> };
    };
};

export default createMiddleware<McpServerEnv>(async (c, next) => {
    const initialize = c.get("server.initialize")? c.get("server.initialize") :  (initializeServer:Parameters<typeof createMcpHandler>[0])=>initializeServer
    console.log(`[mcp server][${c.req.path}] setting server.create`);
    c.set(
        "server.create",
        function (
            ...[initializeServer, ...args]: Parameters<typeof createMcpHandler>
        ): ReturnType<typeof createMcpHandler> {
             return createMcpHandler(...[toolsPersist(initialize(initializeServer)), ...args]);
        },
    );
    await next();


   function toolsPersist(initializeServer:Parameters<typeof createMcpHandler>[0]):  Parameters<typeof createMcpHandler>[0] {
    const tools = {} as Record<string, RegisteredTool>;
     return async (server) => {
        c.set("server", Object.assign(server, { tools }));
        const registerTools = server.registerTool.bind(server);
        initializeServer(Object.assign({
          registerTool: (name, tool, handler) => {
            tools[name] = registerTools(name, tool, handler);
            return tools[name];
           }
        }))
        
      }
    } 
})


createMiddleware<McpServerEnv>(async (c, next) => {
    c.set(
        "server.initialize",
        function (initializeServer: Parameters<typeof createMcpHandler>[0]): Parameters<typeof createMcpHandler>[0] {
            const tools = {} as Record<string, RegisteredTool>;
     return async (server) => {
        const registerTools = server.registerTool.bind(server);
        initializeServer(Object.assign({
          registerTool: (name, tool, handler) => {
            tools[name] = registerTools(name, tool, handler);
            return tools;
           }
        }))
      }
        },
    );
    await next();
});
 
export declare function mcpServerMiddleware(
    initializeServer: Parameters<typeof createMcpHandler>[0],
): Parameters<typeof createMcpHandler>[0];
