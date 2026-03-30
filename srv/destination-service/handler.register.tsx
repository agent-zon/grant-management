import cds from "@sap/cds";
import { render } from "#cds-ssr";
import { registerDestination } from "@sap-cloud-sdk/connectivity";

/**
 * Register action handler — dedicated route for HTMX form consumption.
 * POST /dest/register with form fields matching Destination properties (name, url, authentication, username, password, clientId, clientSecret, tokenServiceUrl, tokenServiceUser, tokenServicePassword, systemUser, keyStoreName, keyStorePassword, forwardAuthToken).
 * Returns HTML fragment for hx-swap="innerHTML" into #register-result.
 */
export async function REGISTER(req: cds.Request) {

  try {
    await registerDestination(req.data);

    if (req?.http?.req.accepts("html")) {
      return render(
        req, <div className="flex items-center space-x-2 text-emerald-700" id="register-result-content">
        <span>✅</span>
        <span className="text-sm font-medium">
          Destination <span className="font-mono">{req.data.name}</span> registered successfully
        </span>
      </div>
      )
    }

    return {
      status: "registered",
      name: req.data.name,
      url: req.data.url,
      authentication: req.data.authentication,
    };
  } catch (err: any) {
    console.error("[register] Error registering destination:", err);

    if (req?.http?.req.accepts("html")) {
      return render(
        req, <div className="flex items-center space-x-2 text-red-600" id="register-result-content">
        <span>❌</span>
        <span className="text-sm">{(err?.message || err?.toString()) || "Registration failed"}</span>
      </div>
      );
    }
    return req.error?.(500, err?.message ?? "Failed to register destination");
  }
}


