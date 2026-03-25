import cds from "@sap/cds";
import { render } from "#cds-ssr";
import {
  isHttpDestination,
  subscriberFirst,
  useOrFetchDestination,
} from "@sap-cloud-sdk/connectivity";
import type { HttpDestination } from "@sap-cloud-sdk/connectivity";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
  DestinationManagementService,
  DestinationsHandler,
  DestinationsHandlerSingle,
} from "./destination-service";
import {
  destination,
  destinations,
} from "#cds-models/sap/scai/destinations/DestinationManagementService";
import { CdsMap } from "#cds-models/_";

// ----- Helpers -----

interface DiscoveredTool {
  name: string;
  description?: string;
  inputSchema?: object;
  annotations?: object;
}

async function fetchDestination(name: string, jwt?: string) {
  return await useOrFetchDestination({
    destinationName: name,
    jwt,
    selectionStrategy: subscriberFirst,
  }) as destination;
}

export async function Destination(
  this: DestinationManagementService,
  ...[req, next]: Parameters<DestinationsHandlerSingle>
): Promise<void | destination | Error | Response> {
  let { name, destinationName } = {
    ...req.params.reduce((acc, curr) => {
      acc[curr.name] = curr.value;
      return acc;
    }, {} as Record<string, any>),
    ...req.data,
  };
  destinationName ??= name;
  console.log("🚀 Destination Handler-before", destinationName, req.data);
  const jwt = req.user?.authInfo?.token?.jwt;
  if (destinationName) {
    try {
      const destination = await fetchDestination(destinationName, jwt);
      req.data = {
        ...req.data,
        ...destination,
      };
      console.log("🚀 Destination Handler-after", req.data);
    } catch (error: any) {
      console.error("🚀 Destination Handler-error", error);
      req.data.discoveryError = `Destination ${destinationName} error: ${"message" in error
        ? error.message
        : String(error)}`;
    }
  }
  return await next(req);
}

export async function Discovery(
  this: DestinationManagementService,
  ...[req, next]: Parameters<DestinationsHandlerSingle>
): Promise<void | destination | Error | Response> {
  if (req.data?.url) {
    const { authTokens, url, name } = req.data as destination;
    const transport = new StreamableHTTPClientTransport(
      new URL(url!),
      {
        requestInit: {
          headers: Object.fromEntries(
            authTokens?.map((
              t,
            ) => [t.http_header?.key, t.http_header?.value]) || [],
          ),
        },
      },
    );

    const client = new Client({
      name: `discover:${destination.name}`,
      version: "1.0.0",
      description: `Tool discovery for ${destination.name}`,
    });

    try {
      await client.connect(transport);
      const { tools } = await client.listTools();
      req.data.tools = tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        annotations: t.annotations,
        outputSchema: t.outputSchema,
        _meta: t._meta,
      }));
    } catch (error: any) {
      console.error("🚀 Discovery Handler-error", error);
      req.data.discoveryError = "message" in error
        ? error.message
        : String(error);
    } finally {
      try {
        await client?.close();
      } catch { /* ignore */ }
    }
  }
  return await next(req);
}

export async function Tools(
  this: DestinationManagementService,
  ...[req, next]: Parameters<DestinationsHandlerSingle>
): Promise<void | destination | Error | Response> {
  const { name, url, tools, discoveryError, ...destination } =
    req.data as destination || {}; // Handle the discover action
  if (name) {
    return render(
      req,
      <ToolsView name={name} url={url} tools={tools} discoveryError={discoveryError} {...destination} />
    ) as unknown as Response;
  }
  return await next(req);
}

function DestinationInfo({ name, url, tools, discoveryError, ...destination } : destination) {
  return   <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
    <div className="flex items-start space-x-4">
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
          destination?.authentication && destination?.authentication !== "NoAuthentication"
            ? "bg-emerald-50 border-emerald-200"
            : "bg-gray-100 border-gray-200"
        }`}
      >
        <span className="text-2xl">{destination?.authentication && destination?.authentication !== "NoAuthentication" ? "🔐" : "🌐"}</span>
      </div>
      <div className="flex-1 space-y-3">
        <h2 className="text-lg font-bold text-gray-900">{name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1 font-medium">URL</p>
            <p className="text-sm text-gray-900 font-mono break-all">
              {url || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1 font-medium">
              Authentication
            </p>
            <span
              className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
                destination?.authentication && destination?.authentication !== "NoAuthentication"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-gray-100 text-gray-500 border border-gray-200"
              }`}
            >
              {destination?.authentication || "None"}
            </span>
          </div>
          {destination?.proxyType && (
            <div>
              <p className="text-xs text-gray-500 mb-1 font-medium">
                Proxy Type
              </p>
              <p className="text-sm text-gray-900">
                {destination.proxyType}
              </p>
            </div>
          )}
          {destination?.forwardAuthToken !== undefined && (
            <div>
              <p className="text-xs text-gray-500 mb-1 font-medium">
                Forward Auth Token
              </p>
              <p className="text-sm text-gray-900">
                {destination.forwardAuthToken ? "Yes" : "No"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>

}
 
function  ToolsView({ name, url, tools, discoveryError, ...destination } : destination) {
  return <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
        <span>🔧</span>
        <span>MCP Tools</span>
      </h3>
      <div className="flex items-center space-x-3">
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200 font-medium">
          {tools?.length} tool{tools?.length !== 1 ? "s" : ""} discovered
        </span>
        <a
          href={`${encodeURIComponent(name)}/discover`}
          hx-get={`${encodeURIComponent(name)}/discover`}
          hx-target="#tools-container"
          hx-swap="innerHTML"
          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-medium rounded-lg transition-colors border border-purple-200"
        >
          Re-discover
        </a>
      </div>
    </div>

    <div id="tools-container">
      {discoveryError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <div className="flex items-start space-x-2">
            <span className="text-red-500">⚠️</span>
            <div>
              <p className="text-sm font-medium text-red-700">
                Discovery Error
              </p>
              <p className="text-xs text-red-600 mt-1">
                {discoveryError}
              </p>
            </div>
          </div>
        </div>
      )}

      {tools?.length && tools?.length > 0
        ? (
          <div className="space-y-3">
            {tools?.map((tool, idx) => (
              <div
                key={idx}
                className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm">⚡</span>
                      <h4 className="text-sm font-semibold text-gray-900">
                        {tool.name}
                      </h4>
                    </div>
                    {tool.description && (
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        {tool.description}
                      </p>
                    )}
                  </div>
                </div>

                {tool.inputSchema && (
                  <details className="mt-3">
                    <summary className="text-[11px] text-blue-600 cursor-pointer hover:text-blue-700 transition-colors font-medium">
                      Input Schema
                    </summary>
                    <pre className="mt-2 text-[11px] text-gray-700 font-mono bg-gray-100 rounded-lg p-3 border border-gray-200 overflow-x-auto">
                    {JSON.stringify(tool.inputSchema, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )
        : !discoveryError
        ? (
          <div className="text-center py-8">
            <span className="text-2xl mb-2 block">🔍</span>
            <p className="text-sm text-gray-500">
              No tools discovered yet. Click "Re-discover" to connect to the
              MCP server.
            </p>
          </div>
        )
        : null}
    </div>
  </div>  
}

// ----- GET single destination (detail page + discover action) -----

export async function GET(
  this: DestinationManagementService,
  ...[req, next]: Parameters<DestinationsHandlerSingle>
): Promise<void | destination | Error | Response> {
  // Single destination detail — only handle single-entity reads

  const { name, tools, discoveryError, authTokens, url, ...destination } =
    req.data as destination || {}; // Handle the discover action

  if (name) {
    return render(
      req,
      <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <a
            href="/inspect/destinations"
            className="w-10 h-10 bg-white hover:bg-gray-100 rounded-xl flex items-center justify-center transition-colors border border-gray-200 shadow-sm"
          >
            <span className="text-lg text-gray-600">←</span>
          </a>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tool Discovery</h1>
            <p className="text-sm text-gray-500">
              <span className="font-mono">{name}</span> — {url}
            </p>
          </div>
        </div>

        <DestinationInfo name={name} url={url} tools={tools} discoveryError={discoveryError} {...destination} />

         {/* Auth Tokens */}
         <AuthInfo authTokens={authTokens} />

        {/* Discovered Tools */}
        <ToolsView name={name} url={url} tools={tools} discoveryError={discoveryError} {...destination} />

        <a
          href="/inspect/destinations"
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-white hover:bg-gray-100 text-gray-600 rounded-xl transition-colors border border-gray-200 text-sm shadow-sm"
        >
          <span>←</span>
          <span>Back to Registry</span>
        </a>
      </div>
    </div>,
    ) as unknown as Response;
  }
  return await next(req);
}
 
 
type Request<
  TOneOrMany extends destinations | destination = destinations | destination,
> = cds.Request<TOneOrMany>;
function AuthInfo({ authTokens }: { authTokens: { type?: string | null; value?: string | null; expiresIn?: string | null; error?: string | null; http_header?: CdsMap | null; }[] | undefined }) {
  return <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
        <span>🔑</span>
        <span>Auth Tokens</span>
      </h3>
      <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200 font-medium">
        {authTokens?.length} token{authTokens?.length !== 1 ? "s" : ""}
      </span>
    </div>

    {authTokens?.length && authTokens?.length > 0
      ? (
        <div className="space-y-3">
          {authTokens?.map((token: any, idx: number) => (
            <div
              key={idx}
              className="bg-gray-50 rounded-xl p-4 border border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-amber-700 uppercase tracking-wider">
                  {token.type || "Unknown"} Token
                </span>
                {token.expiresIn && (
                  <span className="text-[11px] text-gray-500">
                    Expires in: {token.expiresIn}s
                  </span>
                )}
              </div>
              {token.value && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">
                    Value (truncated)
                  </p>
                  <code className="block text-xs text-blue-700 font-mono bg-blue-50 rounded-lg p-2 border border-blue-200 break-all">
                    {token.value.slice(0, 64)}...
                  </code>
                </div>
              )}
              {token.http_header && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">
                    HTTP Header
                  </p>
                  <code className="text-xs text-purple-700 font-mono">
                    {token.http_header.key || token.http_header.name}:
                    {" "}
                    {(token.http_header.value || "").slice(0, 40)}...
                  </code>
                </div>
              )}
              {token.error && (
                <div className="mt-2 text-xs text-red-600 font-medium">
                  Error: {token.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )
      : (
        <div className="text-center py-8">
          <span className="text-2xl mb-2 block">🔒</span>
          <p className="text-sm text-gray-500">
            No auth tokens available for this destination
          </p>
        </div>
      )}
  </div>;
}

function isSingle<T extends cds.Request<destination | destinations>>(
  req: T,
): req is T & cds.Request<destination> {
  return req.query?.SELECT?.one && req.params?.[0]?.name;
}
