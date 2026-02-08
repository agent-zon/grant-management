import cds from "@sap/cds";
import { MCPRequest } from "@types";
import { GrantToolsService } from "./grant-tools-service";
import { Client } from "@modelcontextprotocol/sdk/client";
import { HttpDestination, isHttpDestination, subscriberFirst, useOrFetchDestination } from "@sap-cloud-sdk/connectivity";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z, ZodRawShape } from "zod";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

export default async function (this: GrantToolsService, req: cds.Request<MCPRequest>, next: Function) {
  const { agent } = req.data.meta;
  req.data = {
    ...req.data,
    tools: req.data.tools || {},
  }

  const destination = await useOrFetchDestination({
    destinationName: `agent:${agent}`,
    jwt: req.user?.authInfo?.token?.jwt,
    selectionStrategy: subscriberFirst,
  });

  if (isHttpDestination(destination)) {
    try {

      console.log("🚀 Creating destination transport for agent:", `agent:${agent}`);
      const transport = new StreamableHTTPClientTransport(new URL(destination.url), {
        requestInit: {
          headers: buildMergedHeaders(req.headers, destination),
        }
      });

      const client = new Client({
        name: `agent:${agent}`,
        version: "1.0.0",
        description: `MCP client for ${`agent:${agent}`} destination`,
      });

      await client.connect(transport);
     
      // req.data.server.on("close", () => {
      //   client.close();
      //   transport.close();
      // });

      const { tools } = await client.listTools(); 

      for (const tool of tools) {
        console.log("🚀 Registering tool:", tool.name);
        req.data.tools[tool.name] = req.data.server.registerTool(tool.name, {
          title: tool.description,
          description: tool.description,
          inputSchema: toZod(tool.inputSchema),
          outputSchema: toZod(tool.outputSchema),
          annotations: tool.annotations,
          _meta: tool._meta,
        }, async (args) => {
          return await client.callTool({
            name: tool.name,
            arguments: args,
          }) as CallToolResult
        })
        console.log("🚀 Tool registered:", tool.name, req.data.tools[tool.name].inputSchema);
      }
      console.debug("🚀 Registered:", tools.length, "tools from destination");
      
    } catch (error) {
      console.error("Error creating destination transport:", error);
    }
  }
  return await next();
}

/**
 * Build merged headers for destination transport.
 * Order (destination wins):
 * 1. Forward inbound headers (exclude content-length)
 * 2. Destination headers
 * 3. Destination authTokens http_header
 */
export function buildMergedHeaders(
  inboundHeaders: Record<string, string | string[] | undefined>,
  destination: HttpDestination
): Record<string, string> {
  // Forward inbound headers (exclude content-length)
  const forwardedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(inboundHeaders)) {
    if (!key) continue;
    if (key.toLowerCase() === "content-length") continue;
    if (typeof value === "undefined") continue;
    forwardedHeaders[key] = Array.isArray(value) ? value.join(", ") : String(value);
  }

  // Destination headers
  const destinationHeaders: Record<string, string> = destination.headers
    ? Object.fromEntries(
      Object.entries(destination.headers).map(([k, v]) => [k, String(v)])
    )
    : {};

  // Auth tokens http_header
  const authFromTokens: Record<string, string> =
    destination.authTokens
      ?.filter((t) => t.http_header)
      .reduce((headers, token) => {
        if (token.http_header) {
          headers[token.http_header.key] = token.http_header.value;
        }
        return headers;
      }, {} as Record<string, string>) || {};

  // Merge: destination wins
  return {
    ...forwardedHeaders,
    ...destinationHeaders,
    ...authFromTokens,
  };
}

function toZod(schema?: {
  [x: string]: unknown;
  type: "object";
  properties?: Record<string, object> | undefined;
  required?: string[] | undefined;
}): ZodRawShape | undefined {
  // @ts-ignore - shape exists at runtime on Zod object schemas
  return schema ? z.fromJSONSchema(schema as unknown as any).shape : undefined;
}

