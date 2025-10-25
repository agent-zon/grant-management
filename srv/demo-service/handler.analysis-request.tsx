import cds from "@sap/cds";
import { renderToString } from "react-dom/server";
import type { DemoService } from "./demo-service.tsx";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";
import { htmlTemplate } from "../middleware/htmx.tsx";
import React from "react";

interface AuthorizationDetailRequest {
  type: string;
  server?: string;
  transport?: string;
  tools?: Record<string, { essential?: boolean } | null>;
  actions?: string[];
  locations?: string[];
  roots?: string[];
  permissions?: {
    read?: { essential?: boolean } | null;
    write?: { essential?: boolean } | null;
    create?: { essential?: boolean } | null;
    list?: { essential?: boolean } | null;
  };
}

interface AnalysisConfig {
  name: string;
  scope: string;
  authorization_details: AuthorizationDetailRequest[];
  color: string;
  risk: string;
}

// Analysis permissions configuration
const ANALYSIS_CONFIG: AnalysisConfig = {
  name: "Analysis Agent",
  scope: "analytics_read",
  authorization_details: [
    {
      type: "mcp",
      server: "devops-mcp-server",
      transport: "sse",
      tools: {
        "metrics.read": { essential: true },
        "logs.query": { essential: true },
        "dashboard.view": { essential: true },
      },
      actions: ["read", "query"],
      locations: ["analytics"],
    },
    {
      type: "fs",
      roots: ["/workspace/configs", "/home/agent/analytics"],
      permissions: {
        read: { essential: true },
        write: null,
        create: null,
        list: null,
      },
    },
  ],
  color: "blue",
  risk: "low",
};

function AuthorizationRequestButton({
  authServerUrl,
  request_uri,
  client_id,
  step = 1,
}: {
  authServerUrl: string;
  request_uri: string;
  client_id: string;
  step?: number;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
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
          </div>
        </div>
      </div>

      <form action={`${authServerUrl}/authorize`} method="post">
        <input type="hidden" name="client_id" value={client_id} />
        <input type="hidden" name="request_uri" value={request_uri} />
        <button
          type="submit"
          className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
        >
          🔗 Authorize Request
        </button>
      </form>
    </div>
  );
}

export async function GET(this: DemoService, grant_id?: string) {
  try {
    console.log("🔍 Analysis Request - Starting", { grant_id });

    const authorizationService = await cds.connect.to(AuthorizationService);

    const request = {
      response_type: "code",
      client_id: "demo-client-app",
      redirect_uri: new URL(
        "/demo/callback?step=1",
        cds.context?.http?.req.headers.referer
      ).href,
      grant_management_action: grant_id ? "update" : "create",
      grant_id: grant_id || undefined,
      authorization_details: JSON.stringify(ANALYSIS_CONFIG.authorization_details),
      requested_actor: "urn:agent:analytics-bot-v1",
      scope: ANALYSIS_CONFIG.scope,
      subject: cds.context?.user?.id,
      subject_token_type: "urn:ietf:params:oauth:token-type:basic",
    };

    console.log("🔍 Analysis Request - PAR request:", JSON.stringify(request, null, 2));

    const response = await authorizationService.par(request);

    if (!response) {
      console.log("❌ Analysis Request - No response from PAR");
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
          step={1}
        />
      )
    );

    console.log("✅ Analysis Request - Sending HTML response");
    return cds.context?.http?.res.send(htmlResponse);
  } catch (e) {
    const error = e as { message: string; stack: string };
    console.error("❌ Analysis Request - Error:", error);
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

export async function POST(this: DemoService, grant_id?: string) {
  return GET.call(this, grant_id);
}
