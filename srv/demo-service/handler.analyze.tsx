import cds from "@sap/cds";
import { renderToString } from "react-dom/server";
import React from "react";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";
import GrantsManagementService from "#cds-models/sap/scai/grants/GrantsManagementService";
import type { DemoService } from "./demo-service.tsx";
import { Grants } from "#cds-models/sap/scai/grants/GrantsManagementService";
import { isGrant } from "@/lib/is-grant.ts";

// Request handler - creates PAR request and shows authorization UI
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

    // Parse authorization_details for proper JSON display
    const authDetails = JSON.parse(request.authorization_details);
    const parRequest = {
      ...request,
      authorization_details: authDetails,
    };

    cds.context?.http?.res.setHeader("Content-Type", "text/html");
    return cds.context?.http?.res.send(
      renderToString(
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-3">
            <span className="text-4xl">📊</span>
            <div>
              <h3 className="text-xl font-bold text-white">Analyze Access</h3>
              <p className="text-sm text-gray-400">
                View logs, metrics, and traces
              </p>
            </div>
          </div>

          {/* Risk Badge */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-blue-400 text-lg">📊</span>
              <div>
                <div className="text-blue-400 text-sm font-semibold">
                  Low Risk Permission
                </div>
                <div className="text-xs text-blue-300 mt-1">
                  Grants read-only access to logs, metrics, and application
                  traces
                </div>
              </div>
            </div>
          </div>

          {/* Authorization Form */}
          <form action={`${authServerUrl}/authorize`} method="post">
            <input type="hidden" name="client_id" value="devops-bot" />
            <input
              type="hidden"
              name="request_uri"
              value={response!.request_uri!}
            />
            <button
              type="submit"
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-lg"
            >
              🔗 Authorize Access
            </button>
          </form>

          {/* Collapsible Request Details */}
          <details className="group">
            <summary className="cursor-pointer list-none">
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-600 hover:border-gray-500 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">
                    📋 View Request Details
                  </span>
                  <svg
                    className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </summary>

            <div className="mt-3 space-y-4">
              {/* Authorization Request */}
              <div className="space-y-3">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">
                    Authorization Endpoint
                  </div>
                  <div className="text-sm text-blue-400 font-mono">
                    POST {authServerUrl}/authorize
                  </div>
                </div>

                <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-3">
                    Authorization Request Body
                  </div>
                  <div className="bg-gray-900/50 rounded p-3 overflow-x-auto">
                    <pre className="text-gray-300 text-xs font-mono">
                      {JSON.stringify(
                        {
                          client_id: "devops-bot",
                          request_uri: response!.request_uri,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              </div>

              {/* PAR Flow Info */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
                <div className="text-gray-500 text-xs text-center font-mono mb-2">
                  Endpoint: {authServerUrl}/par
                </div>
                <div className="text-gray-400 text-sm text-center text-pretty">
                  The server pushed an authorization request to the
                  authorization server and received{" "}
                  <code className="text-purple-400">request_uri</code> to use in
                  the authorization request
                </div>
              </div>

              {/* PAR Request */}
              <div className="space-y-3">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Endpoint</div>
                  <div className="text-sm text-blue-400 font-mono">
                    POST /par
                  </div>
                </div>

                <div className="bg-gray-800/80 rounded-lg p-4 border border-gray-700">
                  <div className="text-xs text-gray-400 mb-3">
                    PAR Request Body
                  </div>
                  <div className="bg-gray-900/50 rounded p-3 overflow-x-auto max-h-96 overflow-y-auto">
                    <pre className="text-gray-300 text-xs font-mono">
                      {JSON.stringify(parRequest, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </details>
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

    const grant = await grantService.read(Grants, grant_id);
    console.log("Grant fetched:", grant);

    cds.context?.http?.res.setHeader("Content-Type", "text/html");
    const hasPermission =
      isGrant(grant) && grant?.scope?.includes("analytics_read");
    if (!hasPermission) {
      return req.http?.res.send(
        renderToString(
          <div className="text-center py-8">
            <div
              className="text-center py-8"
              hx-get={`/demo/devops_bot/analyze_request?grant_id=${grant_id}`}
              hx-trigger="load"
            ></div>
          </div>
        )
      );
    }
    return cds.context?.http?.res.send(
      renderToString(
        <div
          className={`border-blue-500" bg-gray-800 rounded-lg p-6 border transition-colors`}
        >
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-3xl">📊</span>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">Analyze</h3>
              <p className="text-sm text-gray-400">View metrics and logs</p>
            </div>
          </div>
        </div>
      )
    );
  } catch (e) {
    return this.renderError(e);
  }
}
