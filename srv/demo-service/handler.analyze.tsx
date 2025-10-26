import cds from "@sap/cds";
import { renderToString } from "react-dom/server";
import React from "react";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";
import GrantsManagementService from "#cds-models/sap/scai/grants/GrantsManagementService";
import type { DemoService } from "./demo-service.tsx";
import {Grants} from "#cds-models/GrantsManagementService";

// Request handler - creates PAR request
export async function REQUEST(this: DemoService, req: cds.Request) {
  const { grant_id } = req.data;
  
  try {
    const authorizationService = await cds.connect.to(AuthorizationService);
    
    const request = {
      response_type: "code",
      client_id: "devops-bot",
      redirect_uri: new URL(
        `/demo/devops_bot/callback`,
        cds.context?.http?.req.headers.referer
      ).href,
      grant_management_action: "update",
      grant_id: grant_id,
      scope: "analytics_read",
      authorization_details: JSON.stringify([
        {
          type: "mcp",
          server: "analytics-mcp-server",
          transport: "sse",
          tools: {
            "logs.read": { essential: true },
            "metrics.query": { essential: true },
            "traces.view": { essential: false },
          },
          actions: ["read", "query"],
          locations: ["logs", "metrics", "traces"],
        },
      ]),
      subject: cds.context?.user?.id,
    };

    const response = await authorizationService.par(request);
    const authServerUrl = await this.getAuthServerUrl();

    cds.context?.http?.res.setHeader("Content-Type", "text/html");
    return cds.context?.http?.res.send(
      renderToString(
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <span className="text-4xl">📊</span>
            <h3 className="text-2xl font-bold text-white">Analysis Request</h3>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 border border-blue-500/30">
            <div className="text-sm text-gray-400 mb-2">📋 Request Details:</div>
            <pre className="text-xs text-blue-300 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(request, null, 2)}
            </pre>
          </div>

          <form action={`${authServerUrl}/authorize`} method="post">
            <input type="hidden" name="client_id" value="devops-bot" />
            <input type="hidden" name="request_uri" value={response.request_uri!} />
            <button
              type="submit"
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              🔗 Authorize Analysis Access
            </button>
          </form>

          <div className="text-xs text-gray-500">
            This will grant read-only access to logs, metrics, and traces.
          </div>
        </div>
      )
    );
  } catch (e) {
    return this.renderError(e);
  }
}

// Tile handler - compact action button
export async function GET(this: DemoService, req: cds.Request) {
  const { grant_id } = req.data;
  
  try {
    const grantService = await cds.connect.to(GrantsManagementService);
 
    const {data:grant,...res} = await  cds.``
    console.log(res,grant);
    const hasPermission = grant?.scope?.includes("analytics_read");

    return cds.context?.http?.res.send(
      renderToString(
        <div className={`bg-gray-800 rounded-lg p-6 border transition-colors ${
          hasPermission ? "border-blue-500" : "border-gray-700 hover:border-blue-500"
        }`}>
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-3xl">{hasPermission ? "📊" : "🔒"}</span>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">Analyze</h3>
              <p className="text-sm text-gray-400">
                {hasPermission ? "View metrics and logs" : "Locked - request access"}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <button
              hx-post={`/demo/devops_bot/analyze_request?grant_id=${grant_id}`}
              hx-target="#content"
              className={`w-full px-4 py-2 rounded-lg transition-colors ${
                hasPermission 
                  ? "bg-blue-600/30 hover:bg-blue-600 text-blue-300" 
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {hasPermission ? "🔄 Update Permissions" : "Request Analysis Access"}
            </button>
            {hasPermission && (
              <button
                hx-get={`/demo/devops_bot/analyze?grant_id=${grant_id}`}
                hx-target="#content"
                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
              >
                Go to Analysis →
              </button>
            )}
          </div>
        </div>
      )
    );
  } catch (e) {
    return this.renderError(e);
  }
}
