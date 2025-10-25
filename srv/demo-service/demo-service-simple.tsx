import cds from "@sap/cds";
import { renderToString } from "react-dom/server";
import { htmlTemplate } from "../middleware/htmx.tsx";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";
import React from "react";
import Mustache from "mustache";
import { ulid } from "ulid";

export default class Service extends cds.ApplicationService {
  
  // Index - redirects to new grant
  public async index() {
    const grant_id = ulid();
    cds.context?.http?.res.redirect(`/demo/devops_bot/${grant_id}/shell`);
  }

  // Shell page with buttons and grant viewer
  public async shell(grant_id: string) {
    cds.context?.http?.res.setHeader("Content-Type", "text/html");
    cds.context?.http?.res.send(
      htmlTemplate(
        renderToString(
          <body className="bg-gray-950 text-white min-h-screen">
            <div className="container mx-auto px-4 py-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
                  🤖 DevOps Bot
                </h1>
                <p className="text-gray-400 text-lg mb-2">
                  Grant ID: <code className="text-purple-400 font-mono">{grant_id}</code>
                </p>
                <p className="text-gray-500 text-sm">
                  Progressive permissions demo
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Actions */}
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-white mb-4">Actions</h2>
                  
                  {/* Analyze */}
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-3xl">📊</span>
                      <div>
                        <h3 className="text-lg font-bold text-white">Analyze</h3>
                        <p className="text-sm text-gray-400">View metrics and logs</p>
                      </div>
                    </div>
                    <button
                      hx-get={`/demo/devops_bot/${grant_id}/requests/analyze`}
                      hx-target="#content"
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Request Analysis Access
                    </button>
                  </div>

                  {/* Deploy */}
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-3xl">🚀</span>
                      <div>
                        <h3 className="text-lg font-bold text-white">Deploy</h3>
                        <p className="text-sm text-gray-400">Deploy to environments</p>
                      </div>
                    </div>
                    <button
                      hx-get={`/demo/devops_bot/${grant_id}/requests/deploy`}
                      hx-target="#content"
                      className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                    >
                      Request Deployment Access
                    </button>
                  </div>

                  {/* Monitor */}
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-3xl">📈</span>
                      <div>
                        <h3 className="text-lg font-bold text-white">Monitor</h3>
                        <p className="text-sm text-gray-400">View system health</p>
                      </div>
                    </div>
                    <button
                      hx-get={`/demo/devops_bot/${grant_id}/requests/monitor`}
                      hx-target="#content"
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Request Monitoring Access
                    </button>
                  </div>
                </div>

                {/* Right: Grant Details & Content */}
                <div className="space-y-4">
                  {/* Grant Details */}
                  <div
                    id="grant-details"
                    hx-get={`/grants-management/Grants/${grant_id}`}
                    hx-headers='{"Accept": "application/json"}'
                    hx-trigger="load, grant-updated from:body"
                    hx-swap="innerHTML"
                    className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                  >
                    <div className="text-center text-gray-400">Loading grant details...</div>
                  </div>

                  {/* Dynamic Content Area */}
                  <div
                    id="content"
                    className="bg-gray-800 rounded-lg p-6 border border-gray-700 min-h-[400px]"
                  >
                    <div className="text-center text-gray-400">
                      👈 Click an action to get started
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mustache template for grant details */}
            <script id="grant-template" type="text/x-mustache-template">
              {`<div>
                <h3 class="text-lg font-bold text-white mb-3">Grant Details</h3>
                <div class="space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-gray-400">Status:</span>
                    <span class="text-{{#status}}{{.}}{{/status}}">{{status}}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-gray-400">Scope:</span>
                    <code class="text-blue-400">{{scope}}</code>
                  </div>
                  {{#createdAt}}
                  <div class="flex justify-between">
                    <span class="text-gray-400">Created:</span>
                    <span class="text-gray-300">{{createdAt}}</span>
                  </div>
                  {{/createdAt}}
                </div>
                <a href="/grants-management/Grants/{{id}}" class="inline-block mt-4 text-blue-400 hover:text-blue-300 text-sm">
                  View Full Grant →
                </a>
              </div>`}
            </script>

            {/* HTMX client-side template extension */}
            <script src="https://unpkg.com/htmx.org@1.9.10/dist/ext/client-side-templates.js"></script>
            <script src="https://unpkg.com/mustache@latest"></script>
            <script>
              {`// Configure HTMX to use Mustache for grant details
              document.body.addEventListener('htmx:afterSettle', function(evt) {
                if (evt.detail.target.id === 'grant-details') {
                  const template = document.getElementById('grant-template').innerHTML;
                  const data = JSON.parse(evt.detail.xhr.responseText);
                  const rendered = Mustache.render(template, data);
                  evt.detail.target.innerHTML = rendered;
                }
              });`}
            </script>
          </body>
        )
      )
    );
  }

  // Analyze request - creates PAR request for analysis permissions
  public async analyze_request(grant_id: string) {
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
        scope: "analytics_read",
        authorization_details: JSON.stringify([
          {
            type: "mcp",
            server: "devops-mcp-server",
            transport: "sse",
            tools: {
              "metrics.read": { essential: true },
              "logs.query": { essential: true },
            },
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
            <h3 className="text-lg font-bold text-white">📊 Analysis Request</h3>
            <div className="bg-gray-700 rounded p-4 text-sm">
              <div className="text-gray-400 mb-2">Request Details:</div>
              <pre className="text-xs text-gray-300 overflow-x-auto">
                {JSON.stringify(request, null, 2)}
              </pre>
            </div>
            <form action={`${authServerUrl}/authorize`} method="post">
              <input type="hidden" name="client_id" value="devops-bot" />
              <input type="hidden" name="request_uri" value={response.request_uri!} />
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                🔗 Authorize Analysis Access
              </button>
            </form>
          </div>
        )
      );
    } catch (e) {
      return this.renderError(e);
    }
  }

  // Deploy request - creates PAR request for deployment permissions
  public async deploy_request(grant_id: string) {
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
            },
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
            <h3 className="text-lg font-bold text-white">🚀 Deployment Request</h3>
            <div className="bg-gray-700 rounded p-4 text-sm">
              <div className="text-gray-400 mb-2">Request Details:</div>
              <pre className="text-xs text-gray-300 overflow-x-auto">
                {JSON.stringify(request, null, 2)}
              </pre>
            </div>
            <form action={`${authServerUrl}/authorize`} method="post">
              <input type="hidden" name="client_id" value="devops-bot" />
              <input type="hidden" name="request_uri" value={response.request_uri!} />
              <button
                type="submit"
                className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
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

  // Monitor request
  public async monitor_request(grant_id: string) {
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
        scope: "monitoring_read",
        authorization_details: JSON.stringify([
          {
            type: "mcp",
            server: "monitoring-mcp-server",
            transport: "sse",
            tools: {
              "health.check": { essential: true },
              "alerts.list": { essential: true },
            },
            locations: ["monitoring"],
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
            <h3 className="text-lg font-bold text-white">📈 Monitoring Request</h3>
            <div className="bg-gray-700 rounded p-4 text-sm">
              <div className="text-gray-400 mb-2">Request Details:</div>
              <pre className="text-xs text-gray-300 overflow-x-auto">
                {JSON.stringify(request, null, 2)}
              </pre>
            </div>
            <form action={`${authServerUrl}/authorize`} method="post">
              <input type="hidden" name="client_id" value="devops-bot" />
              <input type="hidden" name="request_uri" value={response.request_uri!} />
              <button
                type="submit"
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                🔗 Authorize Monitoring Access
              </button>
            </form>
          </div>
        )
      );
    } catch (e) {
      return this.renderError(e);
    }
  }

  // OAuth callback - returns JSON for API logger
  public async callback(code, code_verifier, redirect_uri) {
    try {
      const authorizationService = await cds.connect.to(AuthorizationService);
      const tokenResponse: any = await authorizationService.token({
        grant_type: "authorization_code",
        client_id: "devops-bot",
        code,
        code_verifier,
        redirect_uri,
      });

      // Return JSON formatted response
      cds.context?.http?.res.setHeader("Content-Type", "text/html");
      cds.context?.http?.res.setHeader("HX-Trigger", "grant-updated");
      
      return cds.context?.http?.res.send(
        renderToString(
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-green-400">✅ Token Response</h3>
            <div className="bg-gray-900 rounded p-4">
              <pre className="text-xs text-green-300 overflow-x-auto">
                {JSON.stringify(tokenResponse, null, 2)}
              </pre>
            </div>
            <div className="text-sm text-gray-400">
              Grant has been updated. View full details in the Grant Details panel.
            </div>
          </div>
        )
      );
    } catch (e) {
      return this.renderError(e);
    }
  }

  // Section UIs - these would render grant-aware interfaces
  // Placeholder implementations for now
  
  public async analyze(grant_id: string) {
    // TODO: Check grant, render UI or disabled state
    return "analyze UI";
  }

  public async deploy(grant_id: string) {
    // TODO: Check grant, render UI or disabled state
    return "deploy UI";
  }

  public async monitor(grant_id: string) {
    // TODO: Check grant, render UI or disabled state
    return "monitor UI";
  }

  // Helper methods
  private async getAuthServerUrl(): Promise<string> {
    return (
      (await cds.connect.to(AuthorizationService).then((service: any) => {
        return service.baseUrl;
      })) || "/oauth-server"
    );
  }

  private renderError(e: any) {
    const error = e as { message: string };
    return cds.context?.http?.res.status(500).send(
      renderToString(
        <div className="text-red-400">
          <h3 className="font-bold">Error</h3>
          <p>{error.message}</p>
        </div>
      )
    );
  }
}

export type DemoService = Service & typeof cds.ApplicationService;
