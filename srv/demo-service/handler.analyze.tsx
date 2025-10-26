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
      scope: "analytics_read",
      authorization_details: JSON.stringify([
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
            This will grant access to read metrics, query logs, and view dashboards.
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
    
    const hasPermission = grant?.scope?.includes("analytics_read");

    if (!hasPermission) {
      // Return 403 with WWW-Authenticate header
      const authorizationService = await cds.connect.to(AuthorizationService);
      const authServerUrl = await this.getAuthServerUrl();
      
      // Create PAR request for authorization URL
      const request = {
        response_type: "code",
        client_id: "devops-bot",
        redirect_uri: new URL(`/demo/callback?grant_id=${grant_id}`, cds.context?.http?.req.headers.referer).href,
        grant_management_action: "update",
        grant_id,
        scope: "analytics_read",
        authorization_details: JSON.stringify([{
          type: "mcp",
          server: "devops-mcp-server",
          tools: { "metrics.read": { essential: true } },
        }]),
        subject: cds.context?.user?.id,
      };
      
      const parResponse = await authorizationService.par(request);
      const authorizeUrl = `${authServerUrl}/authorize?client_id=devops-bot&request_uri=${parResponse.request_uri}`;
      
      cds.context?.http?.res.setHeader("WWW-Authenticate", `Bearer realm="Analysis", authorize_url="${authorizeUrl}"`);
      cds.context?.http?.res.status(403);
      
      // Disabled/sketch mode
      return cds.context?.http?.res.send(
        renderToString(
          <div className="opacity-60 space-y-4">
            <div className="flex items-center space-x-3">
              <span className="text-4xl grayscale">📊</span>
              <div>
                <h3 className="text-2xl font-bold text-gray-400">Analysis (Locked)</h3>
                <p className="text-sm text-gray-500">Request access to unlock</p>
              </div>
            </div>

            {/* Sketch UI */}
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 space-y-4">
              <div className="bg-gray-800/50 rounded p-4">
                <div className="h-4 bg-gray-700 rounded w-1/3 mb-2"></div>
                <div className="h-8 bg-gray-700 rounded"></div>
              </div>
              <div className="bg-gray-800/50 rounded p-4">
                <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-20 bg-gray-700 rounded"></div>
              </div>
            </div>

            <button
              hx-post={`/demo/Analysis(grant_id='${grant_id}')/request`}
              hx-target="#content"
              className="w-full px-6 py-3 bg-blue-600/50 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              🔓 Request Analysis Access
            </button>
            
            <div className="text-xs text-gray-500 text-center">
              Or <a href={authorizeUrl} className="text-blue-400 hover:underline">authorize directly</a>
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
            <span className="text-4xl">📊</span>
            <h3 className="text-2xl font-bold text-white">Analysis Dashboard</h3>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-4">
              <div className="text-blue-400 text-sm mb-1">📈 CPU Usage</div>
              <div className="text-3xl font-bold text-white">45%</div>
              <div className="text-xs text-blue-300 mt-1">Normal</div>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-4">
              <div className="text-green-400 text-sm mb-1">💾 Memory</div>
              <div className="text-3xl font-bold text-white">2.1GB</div>
              <div className="text-xs text-green-300 mt-1">Available</div>
            </div>
          </div>

          {/* Logs */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-lg">📝</span>
              <h4 className="font-bold text-white">Recent Logs</h4>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="text-green-400">[INFO] Application started successfully</div>
              <div className="text-blue-400">[DEBUG] Connected to database</div>
              <div className="text-yellow-400">[WARN] Cache miss for key: user_123</div>
              <div className="text-green-400">[INFO] Request processed in 45ms</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
              📊 View All Metrics
            </button>
            <button className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors">
              📝 Export Logs
            </button>
          </div>

          <div className="text-xs text-gray-500 pt-2 border-t border-gray-800">
            ✓ Analysis permissions active • Grant ID: {grant_id}
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
  const hasPermission = grant?.scope?.includes("analytics");
  
  return cds.context?.http?.res.send(
    renderToString(
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{hasPermission ? "📊" : "🔒"}</span>
          <div>
            <h4 className="font-bold text-white">Analysis</h4>
            <p className="text-xs text-gray-400">
              {hasPermission ? "Active" : "Locked"}
            </p>
          </div>
        </div>
      </div>
    )
  );
}
