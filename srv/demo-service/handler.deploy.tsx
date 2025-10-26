import cds from "@sap/cds";
import { renderToString } from "react-dom/server";
import React from "react";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";
import GrantsManagementService, {Grants} from "#cds-models/sap/scai/grants/GrantsManagementService";
import type { DemoService } from "./demo-service.tsx";
import {isGrant} from "@/lib/is-grant";

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
      scope: "deployments",
      authorization_details: JSON.stringify([
        {
          type: "mcp",
          server: "devops-mcp-server",
          transport: "sse",
          tools: {
            "deploy.create": { essential: true },
            "deploy.read": { essential: true },
            "infrastructure.provision": { essential: false },
          },
          actions: ["create", "read"],
          locations: ["staging", "production"],
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
            <span className="text-4xl">🚀</span>
            <h3 className="text-2xl font-bold text-white">Deployment Request</h3>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 border border-yellow-500/30">
            <div className="text-sm text-gray-400 mb-2">📋 Request Details:</div>
            <pre className="text-xs text-yellow-300 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(request, null, 2)}
            </pre>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="text-yellow-400 text-sm">⚠️ Medium Risk Permission</div>
            <div className="text-xs text-yellow-300 mt-1">
              This grants ability to deploy to staging and production environments.
            </div>
          </div>

          <form action={`${authServerUrl}/authorize`} method="post">
            <input type="hidden" name="client_id" value="devops-bot" />
            <input type="hidden" name="request_uri" value={response!.request_uri!} />
            <button
              type="submit"
              className="w-full px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
            >
              🔗 Authorize Deployment Access
            </button>
          </form>
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
    const grant = await grantService.read(Grants,grant_id)
    const hasPermission =isGrant(grant) && grant?.scope?.includes("deployments");
    if(!hasPermission){
      return req.http?.res.send(
          renderToString(
              <div className="text-center py-8">
                <div className="text-center py-8" hx-get={`/demo/devops_bot/deploy_request?grant_id=${grant_id}`} hx-trigger="load" >

                </div>
              </div>
          )
      );
    }
    return req?.http?.res.send(
      renderToString(
        <div className={`border-yellow-500 bg-gray-800 rounded-lg p-6 border transition-colors `}>
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-3xl">🚀</span>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">Deploy</h3>
              <p className="text-sm text-gray-400">
                Deploy to environments
              </p>
            </div>
          </div>
        </div>
      )
    );
  } catch (e) {
    return this.renderError(e);
  }
}
