import cds from "@sap/cds";
import { renderToString } from "react-dom/server";
import React from "react";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";
import type { DemoService } from "./demo-service.tsx";

// Request handler - creates PAR request
export async function REQUEST(this: DemoService, grant_id: string) {
  try {
    const authorizationService = await cds.connect.to(AuthorizationService);
    
    const request = {
      response_type: "code",
      client_id: "devops-bot",
      redirect_uri: new URL(
        `/demo/callback?grant_id=${grant_id}`,
        cds.context?.http?.req.headers.referer
      ).href,
      grant_management_action: "update",
      grant_id: grant_id,
      scope: "monitoring_read",
      authorization_details: JSON.stringify([
        {
          type: "mcp",
          server: "monitoring-mcp-server",
          transport: "sse",
          tools: {
            "health.check": { essential: true },
            "alerts.list": { essential: true },
            "metrics.read": { essential: false },
          },
          actions: ["read"],
          locations: ["monitoring", "alerts"],
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
            <span className="text-4xl">📈</span>
            <h3 className="text-2xl font-bold text-white">Monitoring Request</h3>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-4 border border-green-500/30">
            <div className="text-sm text-gray-400 mb-2">📋 Request Details:</div>
            <pre className="text-xs text-green-300 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(request, null, 2)}
            </pre>
          </div>

          <form action={`${authServerUrl}/authorize`} method="post">
            <input type="hidden" name="client_id" value="devops-bot" />
            <input type="hidden" name="request_uri" value={response.request_uri!} />
            <button
              type="submit"
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              🔗 Authorize Monitoring Access
            </button>
          </form>

          <div className="text-xs text-gray-500">
            This will grant access to view system health and alerts.
          </div>
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
    
    const hasPermission = grant?.scope?.includes("monitoring");

    if (!hasPermission) {
      // Return 403 with WWW-Authenticate header
      const authorizationService = await cds.connect.to(AuthorizationService);
      const authServerUrl = await this.getAuthServerUrl();
      
      const request = {
        response_type: "code",
        client_id: "devops-bot",
        redirect_uri: new URL(`/demo/callback?grant_id=${grant_id}`, cds.context?.http?.req.headers.referer).href,
        grant_management_action: "update",
        grant_id,
        scope: "monitoring_read",
        authorization_details: JSON.stringify([{
          type: "mcp",
          server: "monitoring-mcp-server",
          tools: { "health.check": { essential: true } },
        }]),
        subject: cds.context?.user?.id,
      };
      
      const parResponse = await authorizationService.par(request);
      const authorizeUrl = `${authServerUrl}/authorize?client_id=devops-bot&request_uri=${parResponse.request_uri}`;
      
      cds.context?.http?.res.setHeader("WWW-Authenticate", `Bearer realm="Monitoring", authorize_url="${authorizeUrl}"`);
      cds.context?.http?.res.status(403);
      
      // Disabled/sketch mode
      return cds.context?.http?.res.send(
        renderToString(
          <div className="opacity-60 space-y-4">
            <div className="flex items-center space-x-3">
              <span className="text-4xl grayscale">📈</span>
              <div>
                <h3 className="text-2xl font-bold text-gray-400">Monitoring (Locked)</h3>
                <p className="text-sm text-gray-500">Request access to unlock</p>
              </div>
            </div>

            {/* Sketch UI */}
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-800/50 rounded h-16"></div>
                <div className="bg-gray-800/50 rounded h-16"></div>
                <div className="bg-gray-800/50 rounded h-16"></div>
              </div>
              <div className="bg-gray-800/50 rounded h-32"></div>
            </div>

            <button
              hx-post={`/demo/monitoring_request?grant_id=${grant_id}`}
              hx-target="#content"
              className="w-full px-6 py-3 bg-green-600/50 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              🔓 Request Monitoring Access
            </button>
            
            <div className="text-xs text-gray-500 text-center">
              Or <a href={authorizeUrl} className="text-green-400 hover:underline">authorize directly</a>
            </div>
          </div>
        )
      );
    }

    // Full UI - permission granted
    return cds.context?.http?.res.send(
      renderToString(
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <span className="text-4xl">📈</span>
            <h3 className="text-2xl font-bold text-white">System Monitor</h3>
          </div>

          {/* Health Status */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-3">
              <div className="text-green-400 text-xs mb-1">API</div>
              <div className="text-2xl">✓</div>
              <div className="text-xs text-green-300">Healthy</div>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-3">
              <div className="text-green-400 text-xs mb-1">Database</div>
              <div className="text-2xl">✓</div>
              <div className="text-xs text-green-300">Healthy</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-lg p-3">
              <div className="text-yellow-400 text-xs mb-1">Cache</div>
              <div className="text-2xl">⚠️</div>
              <div className="text-xs text-yellow-300">Warning</div>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-lg">🔔</span>
              <h4 className="font-bold text-white">Active Alerts</h4>
              <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
                1 warning
              </span>
            </div>
            <div className="space-y-2">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-yellow-400 text-sm font-medium">
                    High Cache Miss Rate
                  </span>
                  <span className="text-xs text-yellow-400">5m ago</span>
                </div>
                <div className="text-xs text-gray-400">
                  Cache hit rate dropped below 80% (currently 65%)
                </div>
              </div>
            </div>
          </div>

          {/* System Metrics */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <h4 className="font-bold text-white mb-3 text-sm">📊 Real-time Metrics</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Response Time</span>
                  <span className="text-green-400">45ms avg</span>
                </div>
                <div className="h-2 bg-gray-800 rounded overflow-hidden">
                  <div className="h-full bg-green-500 rounded" style={{width: "45%"}}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Request Rate</span>
                  <span className="text-blue-400">1.2k/min</span>
                </div>
                <div className="h-2 bg-gray-800 rounded overflow-hidden">
                  <div className="h-full bg-blue-500 rounded" style={{width: "75%"}}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Error Rate</span>
                  <span className="text-green-400">0.1%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded overflow-hidden">
                  <div className="h-full bg-green-500 rounded" style={{width: "10%"}}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <button className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors">
              📊 View Dashboard
            </button>
            <button className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">
              🔔 Configure Alerts
            </button>
          </div>

          <div className="text-xs text-gray-500 pt-2 border-t border-gray-800">
            ✓ Monitoring permissions active • Grant ID: {grant_id}
          </div>
        </div>
      )
    );
  } catch (e) {
    return this.renderError(e);
  }
}

// Tile view - compact representation
export async function TILE(this: DemoService, grant_id: string) {
  const grantService = await cds.connect.to("sap.scai.grants.GrantsManagementService");
  const grant = await grantService.read("Grants", grant_id);
  const hasPermission = grant?.scope?.includes("monitoring");
  
  return cds.context?.http?.res.send(
    renderToString(
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{hasPermission ? "📈" : "🔒"}</span>
          <div>
            <h4 className="font-bold text-white">Monitoring</h4>
            <p className="text-xs text-gray-400">
              {hasPermission ? "Active" : "Locked"}
            </p>
          </div>
        </div>
      </div>
    )
  );
}
