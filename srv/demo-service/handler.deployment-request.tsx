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
  urls?: string[];
  protocols?: string[];
}

interface DeploymentConfig {
  name: string;
  scope: string;
  authorization_details: AuthorizationDetailRequest[];
  color: string;
  risk: string;
}

// Deployment permissions configuration
const DEPLOYMENT_CONFIG: DeploymentConfig = {
  name: "Deployment Agent",
  scope: "deployments",
  authorization_details: [
    {
      type: "mcp",
      server: "devops-mcp-server",
      transport: "sse",
      tools: {
        "deploy.create": null,
        "deploy.read": { essential: true },
        "infrastructure.provision": null,
        "config.update": null,
      },
      locations: ["staging", "production"],
    },
    {
      type: "api",
      urls: [
        "https://api.deployment.internal/v1/deploy",
        "https://api.infrastructure.internal/v1/provision",
      ],
      protocols: ["HTTPS"],
    },
  ],
  color: "yellow",
  risk: "medium",
};

function AuthorizationRequestButton({
  authServerUrl,
  request_uri,
  client_id,
  step = 2,
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
          className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
        >
          🔗 Authorize Deployment Request
        </button>
      </form>
    </div>
  );
}

export async function GET(this: DemoService, req: cds.Request) {
  try {
    console.log("🔍 Deployment Request - Starting");

    if (!req.data.grant_id) {
      throw new Error("grant_id is required for deployment request");
    }

    const authorizationService = await cds.connect.to(AuthorizationService);

    const request = {
      response_type: "code",
      client_id: "demo-client-app",
      redirect_uri: new URL(
        "/demo/callback?step=2",
        cds.context?.http?.req.headers.referer
      ).href,
      grant_management_action: "update",
      grant_id: req.data.grant_id,
      authorization_details: JSON.stringify(DEPLOYMENT_CONFIG.authorization_details),
      requested_actor: "urn:agent:deployment-bot-v1",
      scope: DEPLOYMENT_CONFIG.scope,
      subject: cds.context?.user?.id,
      subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
    };

    console.log("🔍 Deployment Request - PAR request:", JSON.stringify(request, null, 2));

    const response = await authorizationService.par(request);

    if (!response) {
      console.log("❌ Deployment Request - No response from PAR");
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
          step={2}
        />
      )
    );

    console.log("✅ Deployment Request - Sending HTML response");
    return cds.context?.http?.res.send(htmlResponse);
  } catch (e) {
    const error = e as { message: string; stack: string };
    console.error("❌ Deployment Request - Error:", error);
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

export async function POST(this: DemoService, req: cds.Request) {
  return GET.call(this, req);
}
