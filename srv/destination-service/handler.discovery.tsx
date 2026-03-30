import cds from "@sap/cds";
import { render } from "#cds-ssr";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/**
 * GET /grants/discoverTools(destinationName='...') — fetch MCP tools from a destination via the proxy.
 * Returns JSON for API or HTML fragment for HTMX (Accept: text/html).
 */
export default async function discoverTools(
  req: cds.Request<{ name: string }>
) {
  const { name: destination } = req.params[0] || req.data as any;
  
  const url = new URL(`${req.http?.req.protocol}://${req.http?.req.headers.host}/mcp/${destination}`);
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: {
      headers: { Authorization: `Bearer ${cds.context?.user?.authInfo?.token?.jwt}`},
    }
  });

  const client = new Client({
    name: `discover:${destination}`,
    version: "1.0.0",
    description: `Tool discovery for ${destination}`,
  });

  try {
    await client.connect(transport);
    const { tools } = await client.listTools();

    if (req?.http?.req.accepts("html")) {
      return render(req, <div className="space-y-3">
        <div className="space-y-3">
          <p className="text-xs text-gray-500 font-medium">
            {tools.length} tool{tools.length !== 1 ? "s" : ""} from {destination}
          </p>
          {tools.map((tool, idx: number) => (
            <div
              key={idx}
              className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:border-gray-300"
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
                  <summary className="text-[11px] text-blue-600 cursor-pointer">
                    Input Schema
                  </summary>
                  <pre className="mt-2 text-[11px] font-mono bg-gray-100 rounded-lg p-3 overflow-x-auto">
                    {JSON.stringify(tool.inputSchema, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>);
    }
    return tools;
  }
  catch (error: any) {
    console.error(error);
    if (req?.http?.req.accepts("html")) {
      return render(req,
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <span className="text-red-500">⚠️</span>
          <pre className="text-xs text-red-600 mt-1">{url.toString()}</pre>
          <p className="text-sm font-medium text-red-700">Discovery Error</p>
          <p className="text-xs text-red-600 mt-1">{String(error)}</p>
          <pre className="text-xs text-red-600 mt-1">{error?.stack}</pre>
        </div>
      );
    }
    return req.error(500, "Internal server error");

  }
  finally {
    try {
      await client.close();
    } catch {
      /* ignore */
    }
  }
}
