import cds from "@sap/cds";
import { render } from "#cds-ssr";
import { registerDestination, useOrFetchDestination, subscriberFirst, isHttpDestination } from "@sap-cloud-sdk/connectivity";
import type { DestinationWithName } from "@sap-cloud-sdk/connectivity";
import type { DestinationManagementService } from "./destination-service";

/**
 * Bind agent handler — creates a new destination by copying an existing one with agent:<agent-name> prefix
 * GET /bind(destination='name',agent='agent-name') or POST with form data
 */
export default async function BIND(
  this: DestinationManagementService,
  req: cds.Request<{ destination: string, agent: string }>
) {
  const { name: destination } = req.params[0];
  const { agent } = req.data;


  const jwt = req.user?.authInfo?.token?.jwt;

  try {
    // Fetch the source destination
    const sourceDestination = await useOrFetchDestination({
      destinationName: `agent:${agent}`,
      jwt,
      selectionStrategy: subscriberFirst,
    });

    if (!isHttpDestination(sourceDestination)) {
      if (req?.http?.req.accepts("html")) {
        return render(
          req,
          <BindResult type="error" message={`Destination "${destination}" not found or not HTTP.`} />
        );
      }
      return req.error?.(404, `Destination "${destination}" not found or not HTTP`);
    }



    // Register the new destination
    await registerDestination({
      name: `agent:${agent}`,
      url: sourceDestination.url,
      authentication: sourceDestination.authentication,
      proxyType: sourceDestination.proxyType,
      sapClient: sourceDestination.sapClient,
      username: sourceDestination.username,
      password: sourceDestination.password,
      systemUser: sourceDestination.systemUser,
      keyStoreName: sourceDestination.keyStoreName,
      keyStorePassword: sourceDestination.keyStorePassword,
    });

    if (req?.http?.req.accepts("html")) {
      return render(
        req,
        <BindResult
          type="success"
          sourceName={destination}
          agentName={agent}
          destinationName={`agent:${agent}`}
        />
      );
    }

    return {
      status: "bound",
      source: destination,
      agent,
      destination: `agent:${agent}`,
    };
  } catch (err: any) {
    console.error("[bind] Error binding agent:", err);

    if (req?.http?.req.accepts("html")) {
      return render(
        req,
        <BindResult type="error" message={err?.message ?? "Failed to bind agent"} />
      );
    }

    return req.error?.(500, err?.message ?? "Failed to bind agent");
  }
}

export async function BIND_DRAFT(req: cds.Request) {
  const { name: destination } = req.params[0];
  return render(req,
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
        <span>➕</span>
        <span>Bind Agent</span>
      </h3>
      <form method="POST" action="bind" hx-post="bind" hx-target="#bind-result" hx-swap="innerHTML" className="space-y-4">
        <input type="hidden" name="destination" value={destination} />
        <input type="text" name="agent" placeholder="Agent name" />
        <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm">Bind Agent</button>
      </form>
      <div id="bind-result" className="text-sm"></div>
    </div>
  );
}


/** HTMX-consumable fragment: success or error message */
function BindResult({
  type,
  sourceName,
  agentName,
  destinationName,
  message,
}: {
  type: "success" | "error";
  sourceName?: string;
  agentName?: string;
  destinationName?: string;
  message?: string;
}) {
  if (type === "success" && destinationName) {
    return (
      <div className="flex items-center space-x-2 text-emerald-700" id="bind-result-content">
        <span>✅</span>
        <div className="text-sm">
          <span className="font-medium">
            Bound to <span className="font-mono">{destinationName}</span>
          </span>
          {sourceName && agentName && (
            <span className="text-xs text-emerald-600 block mt-0.5">
              Copied from <span className="font-mono">{sourceName}</span> for agent <span className="font-mono">{agentName}</span>
            </span>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center space-x-2 text-red-600" id="bind-result-content">
      <span>❌</span>
      <span className="text-sm">{message ?? "Binding failed"}</span>
    </div>
  );
}
