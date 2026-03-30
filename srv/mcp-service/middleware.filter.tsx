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
export default createMiddleware<Env>(async (c, next) => {
  console.log(`[filter][${c.req.path}] setting server.initialize`);
  c.set("server.initialize", grantAuthorizationFilter);
  await next();
  
  function grantAuthorizationFilter(
    initializeServer: Parameters<typeof createMcpHandler>[0],
  ): Parameters<typeof createMcpHandler>[0] {
    console.log(`[filter][${c.req.path}] `);
    return async (server) => {
      type RegisterToolParams = Parameters<typeof server["registerTool"]>;

      const registerTools = server.registerTool.bind(server);
      initializeServer(Object.assign({
        registerTool: (name, config, cb: RegisterToolParams) => {
          console.log(`[filter][${c.req.path}] registerTool: ${name}`);
          const tool = registerTools(name, config, cb);
          console.debug("tool", name, "enabled", c.get("authorization_details")[name]);
          if (c.get("authorization_details")[name]) {
            tool.enable();
          } else {
            tool.disable();
          }
          return tool;
        },
      }));
    };
  }
});
export declare function mcpServerMiddleware(
  initializeServer: Parameters<typeof createMcpHandler>[0],
): Parameters<typeof createMcpHandler>[0];

