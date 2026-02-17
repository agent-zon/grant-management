import cds from "@sap/cds";
import { render } from "#cds-ssr";
import {
  useOrFetchDestination,
  subscriberFirst,
  isHttpDestination,
} from "@sap-cloud-sdk/connectivity";
import type { HttpDestination } from "@sap-cloud-sdk/connectivity";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
  DestinationsHandler,
  DestinationManagementService,
} from "./destination-service";

// ----- Helpers -----

interface DiscoveredTool {
  name: string;
  description?: string;
  inputSchema?: object;
  annotations?: object;
}

async function fetchDestination(name: string, jwt?: string) {
  return useOrFetchDestination({
    destinationName: name,
    jwt,
    selectionStrategy: subscriberFirst,
  });
}

async function discoverTools(destination: HttpDestination): Promise<DiscoveredTool[]> {
  const token = destination.authTokens?.[0]?.value;
  const transport = new StreamableHTTPClientTransport(new URL(destination.url), {
    requestInit: {
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
    },
  });

  const client = new Client({
    name: `discover:${destination.name}`,
    version: "1.0.0",
    description: `Tool discovery for ${destination.name}`,
  });

  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: t.annotations,
    }));
  } finally {
    try { await client.close(); } catch { /* ignore */ }
  }
}

// ----- GET single destination (detail page + discover action) -----

export async function GET(
  this: DestinationManagementService,
  ...[req, next]: Parameters<DestinationsHandler>
) {
  // Handle the discover action
  if (req.query?.SELECT?.one) {
    const name = (req.data as any)?.name as string;
    if (!name) return req.error?.(400, "Missing destination name");

    const jwt = req.user?.authInfo?.token?.jwt;
    const destination = await fetchDestination(name, jwt);

    if (!isHttpDestination(destination)) {
      return { error: "Destination not found or not HTTP", name };
    }

    let tools: DiscoveredTool[] = [];
    let discoveryError: string | null = null;
    try {
      tools = await discoverTools(destination);
    } catch (err: any) {
      discoveryError = err?.message || String(err);
      console.error(`[discover] Error discovering tools for ${name}:`, err);
    }

    const result = {
      name: destination.name,
      url: destination.url,
      authentication: destination.authentication,
      authTokens: destination.authTokens?.map((t) => ({
        type: t.type,
        expiresIn: t.expiresIn,
        error: t.error,
        http_header: t.http_header,
      })),
      tools,
      discoveryError,
    };

    if (req?.http?.req.accepts("html")) {
      return render(req, <DiscoverResultView result={result} />);
    }
    return result;
  }

  // Single destination detail — only handle single-entity reads
  if (!req.query?.SELECT?.one) {
    return await next(req);
  }

  const name = (req.data as any)?.name as string;
  if (!name) return;

  const jwt = req.user?.authInfo?.token?.jwt;
  let destination: any = null;
  let tools: DiscoveredTool[] = [];
  let discoveryError: string | null = null;

  try {
    destination = await fetchDestination(name, jwt);
  } catch (err: any) {
    console.error(`[detail] Failed to fetch destination ${name}:`, err);
  }

  if (destination && isHttpDestination(destination)) {
    try {
      tools = await discoverTools(destination);
    } catch (err: any) {
      discoveryError = err?.message || String(err);
    }
  }

  if (req?.http?.req.accepts("html")) {
    return render(
      req,
      <DestinationDetailView
        name={name}
        destination={destination}
        tools={tools}
        discoveryError={discoveryError}
      />
    );
  }

  return {
    ...(destination || {}),
    name,
    tools,
    discoveryError,
  };
}

// ----- UI Components -----

function DestinationDetailView({
  name,
  destination,
  tools,
  discoveryError,
}: {
  name: string;
  destination: any;
  tools: DiscoveredTool[];
  discoveryError: string | null;
}) {
  const authTokens = destination?.authTokens || [];
  const isAuthenticated = destination?.authentication && destination.authentication !== "NoAuthentication";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <a
              href="/mcps/destinations"
              className="w-10 h-10 bg-white hover:bg-gray-100 rounded-xl flex items-center justify-center transition-colors border border-gray-200 shadow-sm"
            >
              <span className="text-lg text-gray-600">←</span>
            </a>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Destination Details</h1>
              <p className="text-sm text-gray-500 font-mono">{name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${destination ? "bg-emerald-500" : "bg-red-500"}`}></div>
            <span className="text-sm text-gray-600 font-medium">
              {destination ? "Resolved" : "Not Found"}
            </span>
          </div>
        </div>

        {/* Destination Info */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border ${isAuthenticated
              ? "bg-emerald-50 border-emerald-200"
              : "bg-gray-100 border-gray-200"
              }`}>
              <span className="text-2xl">{isAuthenticated ? "🔐" : "🌐"}</span>
            </div>
            <div className="flex-1 space-y-3">
              <h2 className="text-lg font-bold text-gray-900">{name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium">URL</p>
                  <p className="text-sm text-gray-900 font-mono break-all">{destination?.url || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium">Authentication</p>
                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${isAuthenticated
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}>
                    {destination?.authentication || "None"}
                  </span>
                </div>
                {destination?.proxyType && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1 font-medium">Proxy Type</p>
                    <p className="text-sm text-gray-900">{destination.proxyType}</p>
                  </div>
                )}
                {destination?.forwardAuthToken !== undefined && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1 font-medium">Forward Auth Token</p>
                    <p className="text-sm text-gray-900">{destination.forwardAuthToken ? "Yes" : "No"}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Auth Tokens */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>🔑</span>
              <span>Auth Tokens</span>
            </h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200 font-medium">
              {authTokens.length} token{authTokens.length !== 1 ? "s" : ""}
            </span>
          </div>

          {authTokens.length > 0 ? (
            <div className="space-y-3">
              {authTokens.map((token: any, idx: number) => (
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
                      <p className="text-xs text-gray-500 mb-1">Value (truncated)</p>
                      <code className="block text-xs text-blue-700 font-mono bg-blue-50 rounded-lg p-2 border border-blue-200 break-all">
                        {token.value.slice(0, 64)}...
                      </code>
                    </div>
                  )}
                  {token.http_header && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 mb-1">HTTP Header</p>
                      <code className="text-xs text-purple-700 font-mono">
                        {token.http_header.key || token.http_header.name}: {(token.http_header.value || "").slice(0, 40)}...
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
          ) : (
            <div className="text-center py-8">
              <span className="text-2xl mb-2 block">🔒</span>
              <p className="text-sm text-gray-500">No auth tokens available for this destination</p>
            </div>
          )}
        </div>

        {/* Discovered MCP Tools */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>🔧</span>
              <span>MCP Tools</span>
            </h3>
            <div className="flex items-center space-x-3">
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200 font-medium">
                {tools.length} tool{tools.length !== 1 ? "s" : ""} discovered
              </span>
              <a
                href={`destinations/discover?name=${encodeURIComponent(name)}`}
                hx-get={`destinations/discover?name=${encodeURIComponent(name)}`}
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
                    <p className="text-sm font-medium text-red-700">Discovery Error</p>
                    <p className="text-xs text-red-600 mt-1">{discoveryError}</p>
                  </div>
                </div>
              </div>
            )}

            {tools.length > 0 ? (
              <div className="space-y-3">
                {tools.map((tool, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm">⚡</span>
                          <h4 className="text-sm font-semibold text-gray-900">{tool.name}</h4>
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
            ) : !discoveryError ? (
              <div className="text-center py-8">
                <span className="text-2xl mb-2 block">🔍</span>
                <p className="text-sm text-gray-500">
                  No tools discovered yet. Click "Re-discover" to connect to the MCP server.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <a
            href="/mcps/destinations"
            className="flex items-center space-x-2 px-5 py-2.5 bg-white hover:bg-gray-100 text-gray-600 rounded-xl transition-colors border border-gray-200 text-sm shadow-sm"
          >
            <span>←</span>
            <span>Back to Registry</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function DiscoverResultView({ result }: { result: any }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <a
            href="/mcps/destinations"
            className="w-10 h-10 bg-white hover:bg-gray-100 rounded-xl flex items-center justify-center transition-colors border border-gray-200 shadow-sm"
          >
            <span className="text-lg text-gray-600">←</span>
          </a>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tool Discovery</h1>
            <p className="text-sm text-gray-500">
              <span className="font-mono">{result.name}</span> — {result.url}
            </p>
          </div>
        </div>

        {result.discoveryError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start space-x-2">
              <span className="text-red-500">⚠️</span>
              <div>
                <p className="text-sm font-medium text-red-700">Connection Failed</p>
                <p className="text-xs text-red-600 mt-1">{result.discoveryError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tokens Summary */}
        {result.authTokens && result.authTokens.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
              <span>🔑</span>
              <span>Tokens Used</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {result.authTokens.map((t: any, i: number) => (
                <span
                  key={i}
                  className={`px-3 py-1 text-xs rounded-full border font-medium ${t.error
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                >
                  {t.type || "token"} {t.error ? `(${t.error})` : `(expires ${t.expiresIn}s)`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Discovered Tools */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {result.tools?.length || 0} Tools Discovered
          </h3>

          {result.tools && result.tools.length > 0 ? (
            <div className="space-y-3">
              {result.tools.map((tool: DiscoveredTool, idx: number) => (
                <div
                  key={idx}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm">⚡</span>
                    <h4 className="text-sm font-semibold text-gray-900">{tool.name}</h4>
                  </div>
                  {tool.description && (
                    <p className="text-xs text-gray-500 mt-1">{tool.description}</p>
                  )}
                  {tool.inputSchema && (
                    <details className="mt-3">
                      <summary className="text-[11px] text-blue-600 cursor-pointer hover:text-blue-700 font-medium">
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
          ) : !result.discoveryError ? (
            <div className="text-center py-8">
              <span className="text-2xl mb-2 block">📭</span>
              <p className="text-sm text-gray-500">This MCP server didn't expose any tools.</p>
            </div>
          ) : null}
        </div>

        <a
          href="/dest/Destinations"
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-white hover:bg-gray-100 text-gray-600 rounded-xl transition-colors border border-gray-200 text-sm shadow-sm"
        >
          <span>←</span>
          <span>Back to Registry</span>
        </a>
      </div>
    </div>
  );
}
