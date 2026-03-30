import { createMiddleware } from "hono/factory";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { HttpDestination } from "@sap-cloud-sdk/connectivity";
import type { SessionMeta } from "./middleware.meta";

// ---------------------------------------------------------------------------
// Middleware — connects an MCP client to the resolved destination and
// discovers remote tools.
//
// Sets on the Hono context:
//   c.set("client", Client | null)   — connected MCP client
//   c.set("remoteTools", Tool[])     — discovered tools from the remote server
//
// Expects upstream middleware to have set:
//   c.get("meta")          — SessionMeta
//   c.get("destination")   — HttpDestination | null  (from destination middleware)
//   c.get("destination.headers") — Record<string, string>  (from destination middleware)
// ---------------------------------------------------------------------------

export default createMiddleware(async (c, next) => {
  const meta = c.get("meta") as SessionMeta;
  const destination = c.get("destination") as HttpDestination | null;
  const mergedHeaders = (c.get("destination.headers") || {}) as Record<string, string>;

  if (!destination) {
    console.error(`[client] [${c.req.path}] No destination found`);
    c.set("client", null);
    c.set("remoteTools", []);
    return await next();
  }

  try {
    console.log(
      `[client] [${c.req.path}] Connecting to:`,
      destination.name,
      destination.url,
    );

    const transport = new StreamableHTTPClientTransport(
      new URL(destination.url),
      {
        requestInit: {
          headers: mergedHeaders,
        },
      },
    );

    const client = new Client({
      name: meta.agent || "mcp-remote",
      version: "1.0.0",
      description: `MCP client for ${destination.name} destination`,
    });

    await client.connect(transport);
    c.set("client", client);

    console.log(`[client] Connected to ${destination.name}`);

    // ── Discover remote tools ────────────────────────────────────────────
    const { tools: remoteTools } = await client.listTools();
    c.set("client", Object.assign(client, { tools:remoteTools.reduce((acc, tool) => {
      acc[tool.name] = {
        ...tool 
      };
      return acc;
    }, {} as Record<string, Tool>) }));

    console.log(
      `[client] [${c.req.path}] Discovered ${Object.keys(remoteTools).length} tools from ${destination.name}`,
    );
  } catch (err: any) {
    console.error(
      `[client] [${c.req.path}] Failed to connect or list tools:`,
      err.message,
      err.stack,
    );
  }

  return await next();
});


export type McpClientEnv = {
  Variables: {
    client: Client & {
      tools: Record<string, Tool>;
    };

  };
}