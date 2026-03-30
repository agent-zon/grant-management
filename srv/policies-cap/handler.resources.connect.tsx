import cds from "@sap/cds";
import getOctokit from "./git-handler/git-handler";
import yaml from "js-yaml";
import { render } from "#cds-ssr";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { getAllDestinationsFromDestinationService } from "@sap-cloud-sdk/connectivity";
import type { DestinationWithoutToken } from "@sap-cloud-sdk/connectivity";
import { ensureBranchExists } from "./middleware.policy.push";
import { McpCard } from "../../mcp-card";
import DestinationManagementService, { destination, destinations } from "#cds-models/sap/scai/destinations/DestinationManagementService";

const GIT = { owner: "AIAM", repo: "policies" };

 

function filterMcpServers(destinations: DestinationWithoutToken[]) {
  return destinations.filter((d) => d.url && (d.originalProperties as any)?.kind === "mcp");
}

/** Fetch MCP destinations from BTP. */
export async function getMcpDestinations(jwt?: string) {
  const destinations = await getAllDestinationsFromDestinationService({ jwt });
  return filterMcpServers(destinations);
}

/** Run tool discovery for a destination via /grants/mcp proxy. */
export async function discoverToolsFromDestination(
  destinationName: string,
  baseUrl: string,
  jwt: string
): Promise< destination['tools']> {
  const destinationService = await cds.connect.to(DestinationManagementService, {
    credentials: {
      jwt: jwt,
      headers:{ "Accept":"application/json"}
    },
  });
  try {
    const  destination= await destinationService.read(`destinations`, destinationName) as destination;
    const {tools, name, url, authTokens} = destination || {name:"damm"};
    console.log("🚀 Tools:", tools, url, name, authTokens);
    return tools ?? []  
  } catch (error) {
    console.error("🚀 Error:", error);
    throw new Error(`Failed to discover tools from destination ${destinationName}: ${error}`);
  }
 
  // const transport = new StreamableHTTPClientTransport(url, {
  //   requestInit: {
  //     headers: {
  //       Authorization: `Bearer ${jwt}`,
  //       "x-destination": destinationName,
  //     },
  //   },
  // });

  // const client = new Client({
  //   name: `discover:${destinationName}`,
  //   version: "1.0.0",
  //   description: `Tool discovery for ${destinationName}`,
  // });

  // try {
  //   await client.connect(transport);
  //   const { tools } = await client.listTools();
  //   return tools ?? [];
  // } finally {
  //   try {
  //     await client.close();
  //   } catch {
  //     /* ignore */
  //   }
  // }
}

/** Build MCP card YAML from discovery result. Destination-backed: uses /grants/mcp with x-destination. */
function buildMcpCard(destinationName: string, tools: destination['tools']) {
  const slug = destinationName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "mcp";
  return {
    $schema: "https://static.modelcontextprotocol.io/schemas/2025-12-11/server-card.schema.json",
    version: "1.0",
    protocolVersions: ["2025-11-25"],
    serverInfo: {
      name: slug,
      title: destinationName,
      version: "1.0.0",
      description: `MCP server from destination ${destinationName}`,
    },
    transport: {
      type: "streamable-http",
      endpoint: "/grants/mcp",
      "x-destination": destinationName,
    },
    capabilities: { tools: {}, resources: {} },
    authentication: { required: true, schemas: ["oauth2", "bearer"] },
    _meta: { "sap/destination": destinationName, "sap/enabled": true },
    tools: tools?.map((t) => ({
      name: t.name,
      title: t.name,
      description: t.description ?? "",
      inputSchema: t.inputSchema ?? { type: "object", properties: {} },
    }))
  };
}

/** Create MCP card file and add to manifest. */
export async function connectResourceToAgent( agentId,
  ref, {
 
  tools,
  name,
  url,
  authTokens,
}:{
   tools: destination['tools'],
  name: string,
  url: string,
  authTokens: destination['authTokens']}
): Promise<McpCard> {
  const octokit = await getOctokit();
  await ensureBranchExists(octokit, ref);

 
  const card = buildMcpCard(name, tools);
  const fileName = `${name}.yaml`;
  const refFile = `./mcps/${fileName}`;
  const cardPath = `${agentId}/mcps/${fileName}`;

  const cardContent = yaml.dump(card, { indent: 2 });
  let cardSha: string | undefined;
  try {
    cardSha = ((await octokit.rest.repos.getContent({ ...GIT, path: cardPath, ref })).data as any).sha;
  } catch {
    /* new file, no sha */
  }
  await octokit.rest.repos.createOrUpdateFileContents({
    ...GIT,
    path: cardPath,
    message: `Agent ${agentId}: add MCP resource from destination ${name}`,
    content: Buffer.from(cardContent, "utf8").toString("base64"),
    ...(cardSha ? { sha: cardSha } : {}),
    branch: ref,
  });

  const manifestPath = `${agentId}/agent_manifest.yaml`;
  const manifestResult = await octokit.rest.repos.getContent({ ...GIT, path: manifestPath, ref });
  const manifestRaw = Buffer.from((manifestResult.data as any).content, "base64").toString("utf-8");
  const manifest = yaml.load(manifestRaw) as any;
  const requires = manifest?.requires ?? [];
  const exists = requires.some((r: any) => r.name === name && r.kind === "mcp");
  if (!exists) {
    requires.push({
      name: name,
      kind: "mcp",
      ref: { file: refFile },
    });
    manifest.requires = requires;
    const newManifest = yaml.dump(manifest, { indent: 2 });
    await octokit.rest.repos.createOrUpdateFileContents({
      ...GIT,
      path: manifestPath,
      message: `Agent ${agentId}: add resource ${name} to manifest`,
      content: Buffer.from(newManifest, "utf8").toString("base64"),
      sha: (manifestResult.data as any).sha,
      branch: ref,
    });
  }
  const slug = `agents/${agentId}/versions/${ref}/resources/${encodeURIComponent(name)}`;

  return {   ...card , links: { slug: slug, content: `${slug}/card`, enable: `${slug}/enable`, disable: `${slug}/disable` } } as McpCard;
}

/** POST versions/connect → discovery, create card, update manifest, return refreshed pane. */
export async function ADD_RESOURCE(this: any, req: cds.Request) {
  const { agentId, version, ref } = req.data || {};
  console.log("🚀 ADD_RESOURCE", req.data);
  const {tools, name, url, authTokens} = req.data as destination || {};
  // if (!agentId || !name) {
  //   return req.reject(400, "Missing agentId or destinationName /n \n" + JSON.stringify(req.data,null,2));
  // }
  try {
    req.data.resource = await connectResourceToAgent(agentId, ref,  req.data as any);
  } catch (err) {
    if (req.http?.req.accepts("html")) {
      req.http?.res?.setHeader("HX-Retarget", "#connect-status-slot");
      req.http?.res?.setHeader("HX-Reswap", "innerHTML");
      return render(req, (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm">
          <span>❌</span>
          <span>Connect failed: {String(err)}</span>
        </div>
      ));
    }
    return req.reject(500, String(err));
  }
  req.data.agentId = agentId;
  req.data.ref = version;
  req.data.version = version;
  req.http?.res?.setHeader("HX-Trigger", JSON.stringify({ "resource-updated": { agent: agentId, version: version } }));
  return render(req, (
      <span>✅</span>
  ));
}

/** GET .../resources/connect → destination picker (MCP destinations to connect). */
export async function RESOURCES_CONNECT_PICKER(this: any, req: cds.Request) {
  const { agentId, version } = req.data || {};
  const jwt = (req as any).user?.authInfo?.token?.jwt;
  if (!jwt) {
    return render(req, (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
        Sign in to connect resources from destinations.
      </div>
    ));
  }
  let destinations: { name?: string | null; url?: string; authentication?: string }[] = [];
  try {
    destinations = await getMcpDestinations(jwt);
  } catch (err) {
    return render(req, (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
        Failed to load destinations: {String(err)}
      </div>
    ));
  }
  return render(req, (
    <div id="connect-picker" className="space-y-3 content-fade-in"      
    hx-get="agents/{agent}/versions/{version}/resources/connecter"
    hx-trigger="connect from:body"
    hx-swap="morph:outerHTML"
    hx-vals="js:{ agent: event?.detail?.agent, version: event?.detail?.version }"
>
      <div id="connect-error-slot" className="min-h-0 shrink-0" />
      <p className="text-xs font-medium text-gray-600">Select an MCP destination to connect</p>
      {destinations.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">No MCP destinations registered. Register one at MCP Destinations first.</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {destinations.map((d) => (
            <button
              key={d.name}
              type="button"
              hx-post={`agents/${agentId}/versions/${version}/resources/connect`}
              hx-vals={JSON.stringify({ destinationName: d.name })}
              hx-swap="innerHTML"
              hx-target={`#connect-${d.name}`}
              hx-ext="json-enc"
              hx-indicator="this"
              hx-params="destinationName"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 text-left transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                <span className="text-sm">🌐</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{d.name}</p>
                <p className="text-xs text-gray-500 font-mono truncate">{d.url || "No URL"}</p>
              </div>
              <span id={`connect-${d.name}`} className="text-xs text-indigo-600 font-medium shrink-0 cursor-pointer hover:text-indigo-800 transition-colors hover:underline hover:underline-offset-2 hover:underline-thickness-2 hover:underline-color-indigo-800 hover:underline-style-solid hover:underline-decoration-indigo-800 hover:underline-width-2 hover:underline-offset-2 hover:underline-offset-2 hover:underline-thickness-2 hover:underline-color-indigo-800 hover:underline-style-solid hover:underline-decoration-indigo-800 hover:underline-width-2 ">Connect</span>
            </button>
          ))}
        </div>
      )}
    </div>
  ));
}


