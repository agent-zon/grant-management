import cds from "@sap/cds";
import { renderToString } from "react-dom/server";
import type { DemoService } from "./demo-service.tsx";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";
import { htmlTemplate } from "../middleware/htmx.tsx";
import React from "react";
import { SCOPE_CONFIGS } from "./scope-config.tsx";

function AuthorizationRequestButton({
  authServerUrl,
  request_uri,
  client_id,
  scopeName,
  scopeConfig,
}: {
  authServerUrl: string;
  request_uri: string;
  client_id: string;
  scopeName: string;
  scopeConfig: any;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
        <div className="flex items-center space-x-3 mb-3">
          <span className="text-3xl">{scopeConfig.icon}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{scopeConfig.displayName}</h3>
            <p className="text-sm text-gray-400">
              Requesting {scopeConfig.scope} permissions
            </p>
          </div>
        </div>
        <div className="text-gray-400 text-sm text-center text-pretty">
          The server pushed an authorization request to the authorization server
          and received `request_uri` to use in the authorization request
        </div>
        <div className="text-gray-500 text-sm text-center text-pretty font-mono">
          Endpoint: {`${authServerUrl}/par`}
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Endpoint</div>
          <div className="text-sm text-purple-400 font-mono">GET /authorize</div>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Parameters</div>
          <div className="text-sm text-white">
            client_id: {client_id}
            <br />
            request_uri: {request_uri}
            <br />
            scope: {scopeConfig.scope}
          </div>
        </div>
      </div>

      <form action={`${authServerUrl}/authorize`} method="post">
        <input type="hidden" name="client_id" value={client_id} />
        <input type="hidden" name="request_uri" value={request_uri} />
        <button
          type="submit"
          className={`w-full px-4 py-3 bg-${scopeConfig.color}-600 hover:bg-${scopeConfig.color}-700 text-white rounded-lg font-medium transition-colors`}
        >
          🔗 Authorize {scopeConfig.displayName} Request
        </button>
      </form>
    </div>
  );
}

export async function GET(this: DemoService, scope_name?: string, grant_id?: string) {
  try {
    console.log("🔍 Scope Request - Starting", { scope_name, grant_id });

    if (!scope_name) {
      throw new Error("scope_name is required");
    }

    const scopeConfig = SCOPE_CONFIGS[scope_name];
    if (!scopeConfig) {
      throw new Error(`Unknown scope: ${scope_name}`);
    }

    const authorizationService = await cds.connect.to(AuthorizationService);

    const request = {
      response_type: "code",
      client_id: "demo-client-app",
      redirect_uri: new URL(
        `/demo/callback?requesting_scope=${scope_name}`,
        cds.context?.http?.req.headers.referer
      ).href,
      grant_management_action: grant_id ? "update" : "create",
      grant_id: grant_id || undefined,
      authorization_details: JSON.stringify(scopeConfig.authorization_details),
      requested_actor: `urn:agent:${scope_name}-bot-v1`,
      scope: scopeConfig.scope,
      subject: cds.context?.user?.id,
      subject_token_type: grant_id 
        ? "urn:ietf:params:oauth:token-type:access_token"
        : "urn:ietf:params:oauth:token-type:basic",
    };

    console.log("🔍 Scope Request - PAR request:", JSON.stringify(request, null, 2));

    const response = await authorizationService.par(request);

    if (!response) {
      console.log("❌ Scope Request - No response from PAR");
      return cds.context?.http?.res.send(
        renderToString(<div><h1>Authorization failed</h1></div>)
      );
    }

    const authServerUrl =
      (await cds.connect.to(AuthorizationService).then((service: any) => {
        return service.baseUrl;
      })) || "/oauth-server";

    cds.context?.http?.res.setHeader("Content-Type", "text/html");
    
    const htmlResponse = htmlTemplate(
      renderToString(
        <AuthorizationRequestButton
          authServerUrl={authServerUrl}
          request_uri={response.request_uri!}
          client_id={request.client_id}
          scopeName={scope_name}
          scopeConfig={scopeConfig}
        />
      )
    );

    console.log(`✅ Scope Request - Sending HTML response for ${scope_name}`);
    return cds.context?.http?.res.send(htmlResponse);
  } catch (e) {
    const error = e as { message: string; stack: string };
    console.error("❌ Scope Request - Error:", error);
    return cds.context?.http?.res.status(500).send(
      renderToString(
        <div>
          <h1>Internal Server Error</h1>
          <p>Error: {error.message}</p>
        </div>
      )
    );
  }
}

export async function POST(this: DemoService, scope_name?: string, grant_id?: string) {
  return GET.call(this, scope_name, grant_id);
}
