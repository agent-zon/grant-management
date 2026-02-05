import cds from "@sap/cds";
import { MCPRequest } from "@types";
import { GrantToolsService } from "./grant-tools-service";
import { Agents, Mcps, Tools } from "#cds-models/sap/scai/grants/GrantToolsService";
import { buildMergedHeaders, createDestinationTransport } from "./handler.destination";
import { Client } from "@modelcontextprotocol/sdk/client";
import { inspect } from "node:util";
import { isHttpDestination, subscriberFirst, useOrFetchDestination } from "@sap-cloud-sdk/connectivity";
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