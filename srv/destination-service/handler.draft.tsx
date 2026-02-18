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
  return render(req, <RegisterForm />);
}



/**
 * CDS function authParams(authentication) — GET /authParams('BasicAuthentication') (parameter in path).
 * See https://htmx.org/docs/#parameters — auth type in path.
 */
export async function AUTH_PARAMS(req: cds.Request) {
  const data = (req.data as Record<string, unknown>) || {};
  const q = (req as any).query || {};
  const pathParam = getAuthTypeFromPath(req?.http?.req?.url);
  const type =
    (typeof data?.authentication === "string" && data.authentication) ||
    (typeof q?.authentication === "string" && q.authentication) ||
    (typeof pathParam === "string" && pathParam) ||
    "NoAuthentication";
  const safeType = AUTH_TYPES.includes(type as any) ? type : "NoAuthentication";
  return render(req, <AuthParamsResponse type={safeType} />);
}

/** Extract authentication from path e.g. /authParams('BasicAuthentication'). */
function getAuthTypeFromPath(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.match(/authParams\s*\(\s*['"]([^'"]+)['"]\s*\)/);
  return match ? match[1] : null;
}

/** Response: fragment for #auth-params + OOB hidden input for form submit. */
function AuthParamsResponse({ type }: { type: string }) {
  return (
    <>
      <AuthParamsFragment type={type} />
      <input type="hidden" id="auth-type-value" name="authentication" value={type} hx-swap-oob="true" />
    </>
  );
}

/** Auth-type–specific fragment: server returns the right HTML for the selected type (HATEOAS). */
function AuthParamsFragment({ type }: { type: string }) {
  const input = (name: string, props: Record<string, unknown> = {}) => (
    <input
      {...props}
      name={name}
      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900"
    />
  );
  const label = (children: React.ReactNode) => (
    <label className="block text-xs text-gray-500 mb-1.5">{children}</label>
  );

  if (type === "NoAuthentication") return <div className="space-y-4 border-t border-gray-200 pt-4 mt-4" />;

  if (type === "BasicAuthentication")
    return (
      <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Basic auth</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>{label("Username")}{input("username", { type: "text", placeholder: "user" })}</div>
          <div>{label("Password")}{input("password", { type: "password", placeholder: "••••••••" })}</div>
        </div>
      </div>
    );

  if (type === "OAuth2ClientCredentials")
    return (
      <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Token service</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>{label("Token Service URL")}{input("tokenServiceUrl", { type: "url", placeholder: "https://.../oauth/token" })}</div>
          <div>{label("Client ID")}{input("clientId", { placeholder: "client-id" })}</div>
          <div>{label("Client Secret")}{input("clientSecret", { type: "password", placeholder: "••••••••" })}</div>
          <div>{label("Token Service User (optional)")}{input("tokenServiceUser", { placeholder: "user" })}</div>
          <div>{label("Token Service Password (optional)")}{input("tokenServicePassword", { type: "password", placeholder: "••••••••" })}</div>
        </div>
      </div>
    );

  if (type === "OAuth2SAMLBearerAssertion")
    return (
      <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">SAML Bearer</p>
        <div>{label("System User")}{input("systemUser", { placeholder: "system-user" })}</div>
      </div>
    );

  if (type === "OAuth2JWTBearer")
    return (
      <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">JWT Bearer</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>{label("Token Service URL")}{input("tokenServiceUrl", { type: "url", placeholder: "https://.../oauth/token" })}</div>
          <div>{label("Client ID")}{input("clientId", { placeholder: "client-id" })}</div>
          <div>{label("Client Secret (optional)")}{input("clientSecret", { type: "password", placeholder: "••••••••" })}</div>
        </div>
      </div>
    );

  if (type === "OAuth2Password")
    return (
      <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">OAuth2 Password</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>{label("Token Service URL")}{input("tokenServiceUrl", { type: "url", placeholder: "https://.../oauth/token" })}</div>
          <div>{label("Username")}{input("username", { placeholder: "user" })}</div>
          <div>{label("Password")}{input("password", { type: "password", placeholder: "••••••••" })}</div>
        </div>
      </div>
    );

  if (type === "ClientCertificateAuthentication")
    return (
      <div className="space-y-4 border-t border-gray-200 pt-4 mt-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Client certificate</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>{label("Key Store Name")}{input("keyStoreName", { placeholder: "key-store-name" })}</div>
          <div>{label("Key Store Password")}{input("keyStorePassword", { type: "password", placeholder: "••••••••" })}</div>
        </div>
      </div>
    );

  return <div className="space-y-4 border-t border-gray-200 pt-4 mt-4" />;
}

/** Register form UI — full form; auth params loaded via hx-get (HATEOAS). */
function RegisterForm() {
  return (
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
              </label>
              <input type="hidden" name="authentication" id="auth-type-value" value="NoAuthentication" />
              <div className="flex flex-wrap gap-2 mt-1.5" role="tablist" aria-label="Authentication type">
                {AUTH_TYPES.map((authType) => (
                  <button
                    type="button"
                    role="tab"
                    className="auth-tab px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    hx-get={`destinations/authParams('${authType}')`}
                    hx-trigger="click"
                    hx-target="#auth-params"
                    hx-swap="innerHTML"
                  >
                    {authType === "NoAuthentication" ? "None" : authType.replace(/^(OAuth2|Basic|ClientCertificate)/, "").replace(/([A-Z])/g, " $1").trim()}
                  </button>
                ))}
              </div>
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
            hx-get="authParams('NoAuthentication')"
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
  );
}
