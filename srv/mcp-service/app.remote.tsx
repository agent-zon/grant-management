import { createMcpHandler } from "mcp-handler";
import { Context, Hono } from "hono";
import { RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { HttpDestination } from "@sap-cloud-sdk/connectivity";
import { inspect } from "node:util";
import { toZod } from "./middleware.destination";
import type { SessionMeta } from "./middleware.meta";
import { Env } from "./type";

// ---------------------------------------------------------------------------
// Hono sub-app — mounted at /:destination/remote (or /:destination/debug)
//
// Expects upstream middleware to have set:
//   c.get("meta")        — SessionMeta
//   c.get("client")      — connected MCP Client (from destination middleware)
//   c.get("destination") — resolved HttpDestination (from destination middleware)
// ---------------------------------------------------------------------------

const app = new Hono<Env>();
 
// ---------------------------------------------------------------------------
// Route — expects meta + destination middlewares to have run upstream
// ---------------------------------------------------------------------------

app.all("/", async (c) => {
  debug(c); 
  const pathname = new URL(c.req.raw.url).pathname;
  const handler = c.get("server.create")(async (server) => {
    const start = Date.now();
    console.log(`[remote] [${c.req.path}] `);

    if (!c.get("client")) {
      console.error(`[remote] [${c.req.path}] No client found`);
      return;
    }
    // ── Discover and register remote tools ───────────────────────────────
    for (const [name, tool] of Object.entries(c.get("client").tools)) {
      console.log("[remote] Registering remote tool:", name);

      server.registerTool(
        name,
        {
          title: tool.description,
          description: tool.description,
          inputSchema: toZod(tool.inputSchema),
          outputSchema: toZod(tool.outputSchema),
          annotations: tool.annotations,
          _meta: tool._meta,
        },
        async (args) => {
          return (await c.get("client").callTool({
            name: tool.name,
            arguments: args,
          })) as CallToolResult;
        },
      );
    }

    console.log(
      `[remote] Registered ${
        Object.keys(c.get("client").tools).length
      } tools from ${c.get("destination").name}`,
    );

    console.log(
      `[remote] Ready in ${Date.now() - start}ms — ${
        Object.keys(c.get("client").tools).length
      } tools`,
      `\n  tools: ${
        inspect(Object.keys(c.get("client").tools), {
          colors: true,
          compact: true,
        })
      }`,
    );
  }, {
    serverInfo: {
      name: `remote:${c.get("destination").name}`,
      version: "1.0.0",
    },
  }, {
    streamableHttpEndpoint: pathname,
    sseEndpoint: `${pathname}/sse`,
    sseMessageEndpoint: `${pathname}/message`,
    redisUrl: process.env.REDIS_URL,
  });
  return handler(c.req.raw);
});

export default app;
function debug(c) {
  console.log(
    `[remote] [${c.req.path}] `,
    `\n  destination: ${c.get("destination").name}`,
    `\n  url: ${c.get("destination").url}`,
    `\n  agent: ${c.get("meta").agent}`,
    `\n raw pathname: ${new URL(c.req.raw.url).pathname}`
  );
}

