import cds from "@sap/cds";
import { render } from "#cds-ssr";

const AUTH_TYPES = [
  "NoAuthentication",
  "BasicAuthentication",
  "OAuth2ClientCredentials",
  "OAuth2SAMLBearerAssertion",
  "OAuth2JWTBearer",
  "OAuth2Password",
  "ClientCertificateAuthentication",
] as const;

/**
 * CDS function draft() — GET /draft() returns the register form UI for HTMX hx-get.
 * Consumed by list page as hx-get="/draft()".
 */
export async function DRAFT(req: cds.Request) {
  return render(req, (
    <div className="space-y-6">
      {/* Bind Existing Destination Section — loaded via hx-get from bind handler */}
      <div
        id="bind-agent-container-draft"
        hx-get="destinations/bind"
        hx-trigger="load"
        hx-swap="innerHTML"
        className="bg-blue-50 border border-blue-200 rounded-xl p-5"
      >
        <p className="text-sm text-blue-700">Loading bind agent form…</p>
      </div>

      {/* Register New Destination Section */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <span>➕</span>
          <span>Register New Destination</span>
        </h4>
        <form
          method="POST"
          action="./register"
          hx-post="./register"
          hx-target="#register-result"
          hx-swap="innerHTML"
          hx-headers='{"Accept": "text/html"}'
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-medium">
                Destination Name
              </label>
              <input
                type="text"
                name="name"
                placeholder="e.g. mcp-weather-service"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-medium">
                MCP Server URL
              </label>
              <input
                type="url"
                name="url"
                placeholder="https://mcp-server.example.com/mcp"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-medium">
                Authentication
                <input type="select" name="authentication" id="auth-type-value" value="NoAuthentication">
                  ${Object.keys("authentication").map(a =>
                    <option value={a}
                      hx-get={`destinations/authentication?type=${a}`}
                      hx-trigger="click"
                      hx-target="#auth-params"
                      hx-swap="innerHTML" />
                  )}
                </input>
              </label>

            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 uppercase tracking-wider font-medium">
                Description
              </label>
              <input
                type="text"
                name="description"
                placeholder="Weather tool MCP server"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 transition-colors"
              />
            </div>
          </div>

          <div
            id="auth-params"
            className="space-y-4"
            hx-get="destinations/authentication?type=NoAuthentication"
            hx-trigger="load"
            hx-swap="innerHTML"
          >
            <span className="text-sm text-gray-400">Loading…</span>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" name="forwardAuthToken" value="true" className="rounded border-gray-300 text-blue-600" />
              Forward auth token to destination
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div id="register-result" className="text-sm"></div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
            >
              Register Destination
            </button>
          </div>
        </form>
      </div>
    </div>
  ));
}





