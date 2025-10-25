import cds from "@sap/cds";
import { renderToString } from "react-dom/server";
import React from "react";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";
import type { DemoService } from "./demo-service-simple.tsx";

// Request handler - creates PAR request
export async function REQUEST(this: DemoService, grant_id: string) {
  try {
    const authorizationService = await cds.connect.to(AuthorizationService);
    
    const request = {
      response_type: "code",
      client_id: "devops-bot",
      redirect_uri: new URL(
        `/demo/devops_bot/${grant_id}/callback`,
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
            <input type="hidden" name="request_uri" value={response.request_uri!} />
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

// Section UI handler - renders grant-aware interface
export async function GET(this: DemoService, grant_id: string) {
  try {
    // Check grant permissions
    const grantService = await cds.connect.to("sap.scai.grants.GrantsManagementService");
    const grant = await grantService.read("Grants", grant_id);
    
    const hasPermission = grant?.scope?.includes("deployments");

    if (!hasPermission) {
      // Disabled/sketch mode
      return cds.context?.http?.res.send(
        renderToString(
          <div className="opacity-60 space-y-4">
            <div className="flex items-center space-x-3">
              <span className="text-4xl grayscale">🚀</span>
              <div>
                <h3 className="text-2xl font-bold text-gray-400">Deployment (Locked)</h3>
                <p className="text-sm text-gray-500">Request access to unlock</p>
              </div>
            </div>

            {/* Sketch UI */}
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 space-y-4">
              <div className="flex space-x-3">
                <div className="flex-1 bg-gray-800/50 rounded p-4 h-24"></div>
                <div className="flex-1 bg-gray-800/50 rounded p-4 h-24"></div>
              </div>
              <div className="bg-gray-800/50 rounded p-4 h-12"></div>
            </div>

            <button
              hx-get={`/demo/devops_bot/${grant_id}/requests/deploy`}
              hx-target="#content"
              className="w-full px-6 py-3 bg-yellow-600/50 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
            >
              🔓 Request Deployment Access
            </button>
          </div>
        )
      );
    }

    // Full UI - permission granted
    return cds.context?.http?.res.send(
      renderToString(
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <span className="text-4xl">🚀</span>
            <h3 className="text-2xl font-bold text-white">Deployment Center</h3>
          </div>

          {/* Environment Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-blue-400 font-bold">🧪 Staging</div>
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                  healthy
                </span>
              </div>
              <div className="text-sm text-gray-300">v1.2.3</div>
              <div className="text-xs text-gray-500 mt-1">Last deploy: 2h ago</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-purple-400 font-bold">🌐 Production</div>
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                  healthy
                </span>
              </div>
              <div className="text-sm text-gray-300">v1.2.2</div>
              <div className="text-xs text-gray-500 mt-1">Last deploy: 1d ago</div>
            </div>
          </div>

          {/* Quick Deploy */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-lg">⚡</span>
              <h4 className="font-bold text-white">Quick Deploy</h4>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <select className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm">
                  <option>v1.2.3 (latest)</option>
                  <option>v1.2.2</option>
                  <option>v1.2.1</option>
                </select>
                <select className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm">
                  <option>Staging</option>
                  <option>Production</option>
                </select>
              </div>
              <button className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors">
                🚀 Deploy Now
              </button>
            </div>
          </div>

          {/* Recent Deployments */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <h4 className="font-bold text-white mb-3 text-sm">📜 Recent Deployments</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                <span className="text-gray-300">v1.2.3 → Staging</span>
                <span className="text-green-400">✓ Success</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-800 rounded">
                <span className="text-gray-300">v1.2.2 → Production</span>
                <span className="text-green-400">✓ Success</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 pt-2 border-t border-gray-800">
            ✓ Deployment permissions active • Grant ID: {grant_id}
          </div>
        </div>
      )
    );
  } catch (e) {
    return this.renderError(e);
  }
}
