import cds from "@sap/cds";
import { render } from "#cds-ssr";
import { registerDestination } from "@sap-cloud-sdk/connectivity";
import type { DestinationWithName } from "@sap-cloud-sdk/connectivity";

/** Read optional string from form body (supports both form and JSON field names) */
function str(body: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = body?.[k];
    if (v != null && typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return undefined;
}

/** Build destination payload from form: all Destination service properties */
function buildDestination(body: Record<string, unknown>): DestinationWithName {
  const name = str(body, "name", "Name");
  const url = str(body, "url", "Url");
  const authentication = (str(body, "authentication", "Authentication") as any) || "NoAuthentication";

  const dest: DestinationWithName = {
    name: name!,
    url: url!,
    authentication,
  };

  // Token service / OAuth (OAuth2ClientCredentials, OAuth2JWTBearer, OAuth2Password)
  const tokenServiceUrl = str(body, "tokenServiceUrl", "TokenServiceUrl");
  if (tokenServiceUrl) dest.tokenServiceUrl = tokenServiceUrl;
  const clientId = str(body, "clientId", "ClientId");
  if (clientId) dest.clientId = clientId;
  const clientSecret = str(body, "clientSecret", "ClientSecret");
  if (clientSecret) dest.clientSecret = clientSecret;
  const tokenServiceUser = str(body, "tokenServiceUser", "TokenServiceUser");
  if (tokenServiceUser) dest.tokenServiceUser = tokenServiceUser;
  const tokenServicePassword = str(body, "tokenServicePassword", "TokenServicePassword");
  if (tokenServicePassword) dest.tokenServicePassword = tokenServicePassword;

  // Basic / OAuth2Password
  const username = str(body, "username", "Username");
  if (username) dest.username = username;
  const password = str(body, "password", "Password");
  if (password) dest.password = password;

  // OAuth2SAMLBearerAssertion
  const systemUser = str(body, "systemUser", "SystemUser");
  if (systemUser) dest.systemUser = systemUser;

  // ClientCertificateAuthentication
  const keyStoreName = str(body, "keyStoreName", "KeyStoreName");
  if (keyStoreName) dest.keyStoreName = keyStoreName;
  const keyStorePassword = str(body, "keyStorePassword", "KeyStorePassword");
  if (keyStorePassword) dest.keyStorePassword = keyStorePassword;

  // Optional
  const forwardAuthToken = body?.forwardAuthToken;
  if (forwardAuthToken === true || forwardAuthToken === "true") dest.forwardAuthToken = true;

  return dest;
}

/**
 * Register action handler — dedicated route for HTMX form consumption.
 * POST /dest/register with form fields matching Destination properties (name, url, authentication, username, password, clientId, clientSecret, tokenServiceUrl, tokenServiceUser, tokenServicePassword, systemUser, keyStoreName, keyStorePassword, forwardAuthToken).
 * Returns HTML fragment for hx-swap="innerHTML" into #register-result.
 */
export async function REGISTER(req: cds.Request) {
  const body = (req.data as Record<string, unknown>) || {};
  const name = str(body, "name", "Name");
  const url = str(body, "url", "Url");

  if (!name || !url) {
    if (req?.http?.req.accepts("html")) {
      return render(
        req,
        <RegisterResult type="error" message="Name and URL are required." />
      );
    }
    return req.error?.(400, "Name and URL are required");
  }

  try {
    const destination = buildDestination(body);
    await registerDestination(destination);

    if (req?.http?.req.accepts("html")) {
      return render(
        req,
        <RegisterResult type="success" name={destination.name} />
      );
    }

    return {
      status: "registered",
      name: destination.name,
      url: destination.url,
      authentication: destination.authentication,
    };
  } catch (err: any) {
    console.error("[register] Error registering destination:", err);

    if (req?.http?.req.accepts("html")) {
      return render(
        req,
        <RegisterResult type="error" message={err?.message ?? "Registration failed"} />
      );
    }

    return req.error?.(500, err?.message ?? "Failed to register destination");
  }
}


/** HTMX-consumable fragment: success or error message for #register-result */
function RegisterResult({
  type,
  name,
  message,
}: {
  type: "success" | "error";
  name?: string;
  message?: string;
}) {
  if (type === "success" && name) {
    return (
      <div className="flex items-center space-x-2 text-emerald-700" id="register-result-content">
        <span>✅</span>
        <span className="text-sm font-medium">
          Destination <span className="font-mono">{name}</span> registered successfully
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center space-x-2 text-red-600" id="register-result-content">
      <span>❌</span>
      <span className="text-sm">{message ?? "Registration failed"}</span>
    </div>
  );
}
