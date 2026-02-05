import cds from "@sap/cds";
import { MCPRequest } from "@types";
import { GrantToolsService } from "./grant-tools-service";
import { Client } from "@modelcontextprotocol/sdk/client";
import { HttpDestination, isHttpDestination, subscriberFirst, useOrFetchDestination } from "@sap-cloud-sdk/connectivity";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export default async function (this: GrantToolsService, req: cds.Request<MCPRequest>, next: Function) {
  const { agent } = req.data.meta;

  const destination = await useOrFetchDestination({
    destinationName: `agent:${agent}`,
    jwt: req.user?.authInfo?.token?.jwt,
    selectionStrategy: subscriberFirst,
  });

  if (isHttpDestination(destination)) {

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
    const { tools } = await client.listTools();
    console.log("🚀 Tools from destination:", tools.length);
    req.data = {
      ...req.data,
      transport,
      client,
      tools: tools
        // .concat(localTools)
        .reduce((acc, t) => {
          acc[t.name] = {
            description: t.description,
            inputSchema: t.inputSchema,
            outputSchema: t.outputSchema,
            _meta: t._meta,
            //TODO: enable based on grant
            enabled: true,
          };
          return acc;
        }, {})
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

