import { Context, Hono } from "hono";
import { serve } from "@hono/node-server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import xsenv from "@sap/xsenv";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  type Tool,
  type Resource,
  type Prompt,
  type ResourceTemplate,
  type ListToolsResult,
  type ListResourcesResult,
  type ListPromptsResult,
  type ListResourceTemplatesResult,
} from "@modelcontextprotocol/sdk/types.js";
import { TransportProvider } from "./transport";
import {
  alwaysProvider,
  useOrFetchDestination,
} from "@sap-cloud-sdk/connectivity";

// Helper to create a fresh client + transport for each request (simple approach).
async function createClient(c: Context) {
  console.log(
    "Creating MCP client with auth:",
    c.req.header("Authorization"),
    c.req.raw.headers
  );

  const destination = await useOrFetchDestination({
    destinationName: "mcp-example",
    jwt: c.req.header("Authorization")?.replace("Bearer ", ""),
    selectionStrategy: alwaysProvider,
  });
  const auth = destination?.authTokens
    ?.filter((t) => t.http_header)
    .reduce((headers, token) => {
      headers[token.http_header.key] = token.http_header.value;
      return headers;
    }, {} as Record<string, string>);

  console.debug("Destination:", destination, auth);
  const transport = new StreamableHTTPClientTransport(
    new URL(`${destination?.url || c.env.MCP_URL}/mcp/streaming`),
    {
      requestInit: {
        headers: {
      
          ...auth,
        },
      },
    }
  );
  const client = new Client({
    name: "hono-tester",
    version: "1.0.0",
  });

  // Add connection / ping timeout of 10 seconds, 5 seconds respectively
  await Promise.race([
    client.connect(transport),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Connection timeout")), 10_000)
    ),
  ]);

  return { client, transport };
}

// Pagination helpers (copied / simplified from the main client code)

// Create the Hono app.
const app = new Hono();

app.use("*", async (c, next) => {
  try {
    console.log(`[MCP Client] Incoming request: ${c.req.method} ${c.req.url}`);
    await next();
  } catch (e) {
    console.error("[MCP Client] Error in request:", e);
    return c.json({ ok: false, error: e.message || String(e) }, 500);
  }
});
app.get("/ping", async (c) => {
  try {
    const { client, transport } = await createClient(c);
    const caps = await client.getServerCapabilities();
    await client.close();
    await transport.close();
    return c.json({ ok: true, capabilities: caps });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message || String(e) }, 500);
  }
});
app.get("/tools", async (c) => {
  try {
    const { client, transport } = await createClient(c);
    const tools = await fetchTools(client);
    await client.close();
    await transport.close();
    return c.json({ ok: true, tools });
  } catch (e: any) {
    return c.json(
      { ok: false, error: e.message || String(e), stack: e.stack },
      500
    );
  }
  async function fetchTools(client: Client): Promise<Tool[]> {
    let all: Tool[] = [];
    let res: ListToolsResult = { tools: [] } as any;
    do {
      res = await client.listTools({ cursor: res.nextCursor });
      all = all.concat(res.tools);
    } while (res.nextCursor);
    return all;
  }
});

app.get("/health", async (c) => {
  return c.json({ status: "ok" });
});
app.get("/resources", async (c) => {
  try {
    const { client, transport } = await createClient(c);
    const resources = await fetchResources(client);
    await client.close();
    await transport.close();
    return c.json({ ok: true, resources });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message || String(e) }, 500);
  }
  async function fetchResources(client: Client): Promise<Resource[]> {
    let all: Resource[] = [];
    let res: ListResourcesResult = { resources: [] } as any;
    do {
      res = await client.listResources({ cursor: res.nextCursor });
      all = all.concat(res.resources);
    } while (res.nextCursor);
    return all;
  }
});

app.get("/resource/:name", async (c) => {
  const name = c.req.param("name");
  try {
    const { client, transport } = await createClient(c);
    const resources = await fetchResources(client);
    const resource = resources.find((r) => r.name === name);
    if (!resource) {
      await client.close();
      await transport.close();
      return c.json({ ok: false, error: "Resource not found" }, 404);
    }
    const data = await client.readResource({ uri: resource.uri });
    await client.close();
    await transport.close();
    return c.json({ ok: true, resource: data });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message || String(e) }, 500);
  }
  async function fetchResources(client: Client): Promise<Resource[]> {
    let all: Resource[] = [];
    let res: ListResourcesResult = { resources: [] } as any;
    do {
      res = await client.listResources({ cursor: res.nextCursor });
      all = all.concat(res.resources);
    } while (res.nextCursor);
    return all;
  }
});

app.get("/prompts", async (c) => {
  try {
    const { client, transport } = await createClient(c);
    const prompts = await fetchPrompts(client);
    await client.close();
    await transport.close();
    return c.json({ ok: true, prompts });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message || String(e) }, 500);
  }

  async function fetchPrompts(client: Client): Promise<Prompt[]> {
    let all: Prompt[] = [];
    let res: ListPromptsResult = { prompts: [] } as any;
    do {
      res = await client.listPrompts({ cursor: res.nextCursor });
      all = all.concat(res.prompts);
    } while (res.nextCursor);
    return all;
  }
});

app.get("/resource-templates", async (c) => {
  try {
    const { client, transport } = await createClient(c);
    const templates = await fetchResourceTemplates(client);
    await client.close();
    await transport.close();
    return c.json({ ok: true, resourceTemplates: templates });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message || String(e) }, 500);
  }

  async function fetchResourceTemplates(
    client: Client
  ): Promise<ResourceTemplate[]> {
    let all: ResourceTemplate[] = [];
    let res: ListResourceTemplatesResult = { resourceTemplates: [] } as any;
    do {
      res = await client.listResourceTemplates({ cursor: res.nextCursor });
      all = all.concat(res.resourceTemplates);
    } while (res.nextCursor);
    return all;
  }
});
app.get("/tools/:name", async (c) => {
  const name = c.req.param("name");
  try {
    const { client, transport } = await createClient(c);
    const result = await client.callTool({ name });
    await client.close();
    await transport.close();
    return c.json({ ok: true, result });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message || String(e) }, 500);
  }
});

app.post("/tools/:name", async (c) => {
  const name = c.req.param("name");
  const args = await c.req.json();
  try {
    const { client, transport } = await createClient(c);
    const result = await client.callTool({ name, arguments: args });
    await client.close();
    await transport.close();
    return c.json({ ok: true, result });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message || String(e) }, 500);
  }
});

app.post("/complete", async (c) => {
  const body = await c.req.json();
  try {
    const { client, transport } = await createClient(c);
    const result = await client.complete(body);
    await client.close();
    await transport.close();
    return c.json({ ok: true, result });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message || String(e) }, 500);
  }
});

// Start the server only if this module is executed directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 5005);
  const hostname = process.env.HOST || "0.0.0.0";
  console.log(`[MCP Client] Running on ${hostname}:${port}`);

  serve({ fetch: app.fetch, port, hostname });
}

export default app;
