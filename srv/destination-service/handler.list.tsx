import cds from "@sap/cds";
import { render } from "#cds-ssr";
import type {
  DestinationsHandler,
  DestinationManagementService,
} from "./destination-service";
import { DestinationWithoutToken, getAllDestinationsFromDestinationService } from "@sap-cloud-sdk/connectivity";

export async function LIST(
  this: DestinationManagementService,
  ...[req, next]: Parameters<DestinationsHandler>
) {
  // Only handle collection reads
  if (!req.query?.SELECT?.one) {


    // Destinations are runtime-resolved, not DB-stored. 
    // Collect registered destinations from the in-memory registry.
    const destinations = filterMcpServers(await getAllDestinationsFromDestinationService({
      jwt: req.user?.authInfo?.token?.jwt,
    }));


    if (req?.http?.req.accepts("html")) {
      return render(
        req,
        <div className="min-h-screen bg-gray-50 text-gray-900">
          <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  MCP Server Desinations
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage destination-backed MCP servers, discover tools, and inspect tokens
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-emerald-600 font-medium">Connected</span>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-blue-50 rounded-xl">
                    <span className="text-xl">🌐</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total Destinations</p>
                    <p className="text-2xl font-bold text-gray-900">{destinations.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-emerald-50 rounded-xl">
                    <span className="text-xl">🔐</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Authenticated</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {destinations.filter((d) => d.authentication && d.authentication !== "NoAuthentication").length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-purple-50 rounded-xl">
                    <span className="text-xl">🔧</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">MCP Servers</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {destinations.filter((d) => d.url).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Register New Destination — form loaded via hx-get from register handler */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <span>➕</span>
                <span>Register MCP Server</span>
              </h3>
              <div
                id="register-form-container"
                hx-get="destinations/draft"
                hx-trigger="load"
                hx-swap="innerHTML"
                className="space-y-4"
              >
                <p className="text-sm text-gray-500">Loading form…</p>
              </div>
            </div>

            {/* Destinations Table */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Registered Destinations
                </h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200 font-medium">
                  {destinations.length} destination{destinations.length !== 1 ? "s" : ""}
                </span>
              </div>

              {destinations.length > 0 ? (
                <div className="space-y-3">
                  {destinations.map((dest, idx) => (
                    <div
                      key={dest.name || idx}
                      className="group bg-gray-50 hover:bg-gray-100/80 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dest.authentication && dest.authentication !== "NoAuthentication"
                            ? "bg-emerald-50 border border-emerald-200"
                            : "bg-gray-100 border border-gray-200"
                            }`}>
                            <span className="text-lg">
                              {dest.authentication && dest.authentication !== "NoAuthentication" ? "🔐" : "🌐"}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900">{dest.name}</p>
                              <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full uppercase tracking-wider ${dest.authentication && dest.authentication !== "NoAuthentication"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-gray-100 text-gray-500 border border-gray-200"
                                }`}>
                                {dest.authentication || "None"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">
                              {dest.url || "No URL configured"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 opacity-70 group-hover:opacity-100 transition-opacity">
                          <a
                            href={`destinations/${encodeURIComponent(dest.name || "")}`}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition-colors border border-blue-200"
                          >
                            Details & Tools
                          </a>
                          <a
                            href={`destinations/${encodeURIComponent(dest.name || "")}/discovery`}
                            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-medium rounded-lg transition-colors border border-purple-200"
                          >
                            Discover
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
                    <span className="text-3xl">🌐</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    No destinations registered
                  </h3>
                  <p className="text-sm text-gray-400 max-w-md mx-auto">
                    Register an MCP server destination above to start discovering tools and managing access tokens.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
  }

  return await next(req);
}
function filterMcpServers(destinations: DestinationWithoutToken[]) {
  return destinations.filter((d) => d.url && d.originalProperties?.kind === "mcp");
}

