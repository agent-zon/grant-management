import cds from "@sap/cds";
import React from "react";
import { renderToString } from "react-dom/server";
import { htmlTemplate } from "../middleware/htmx.tsx";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";
import type { AuthorizationDetailRequest } from "#cds-models/sap/scai/grants";

interface AuthorizationRequestButtonProps {
  client_id?: string;
  redirect_uri?: string;
  scope?: string | null;
  requested_actor?: string;
  request_uri?: string;
  expires_in?: number;
  authorization_details?: AuthorizationDetailRequest[];
  authServerUrl?: string;
}

function AuthorizationRequestButton({
  authServerUrl,
  request_uri,
  expires_in,
  authorization_details,
  client_id,
  redirect_uri,
  scope,
  requested_actor,
  ...request
}: AuthorizationRequestButtonProps) {
  return (
    <div hx-ext="client-side-templates" className="space-y-6">
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-200 mb-3 flex items-center gap-2">
          <span>🔐</span>
          <span>Authorize Request</span>
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-700/40 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Endpoint</div>
            <div className="text-purple-400 font-mono">POST /par → GET /authorize</div>
          </div>
          <div className="bg-gray-700/40 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Parameters</div>
            <div className="text-white">
              client_id: {client_id}
              <br /> request_uri: {request_uri}
            </div>
          </div>
        </div>
        <form action={`${authServerUrl}/authorize`} method="post" className="mt-4">
          <input type="hidden" name="client_id" value="demo-client-app" />
          <input type="hidden" name="request_uri" value={request_uri!} />
          <button
            type="submit"
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Continue to Authorization
          </button>
        </form>
      </div>

      <div className="bg-gray-800/30 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-gray-300">Request Preview</h4>
          <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">JSON</span>
        </div>
        <div className="text-xs font-mono overflow-x-auto">
          <pre className="text-gray-300 whitespace-pre-wrap">
{JSON.stringify({ client_id, redirect_uri, requested_actor, ...request, scope, authorization_details }, null, 2)}
          </pre>
        </div>
        {expires_in ? (
          <div className="text-xs text-gray-500 mt-2">request_uri expires in ~{expires_in}s</div>
        ) : null}
      </div>
    </div>
  );
}

function getBaseUrl() {
  const req = cds.context?.http?.req;
  const proto = (req?.headers["x-forwarded-proto"] as string) || (req?.protocol as string) || "http";
  const host = (req?.headers["x-forwarded-host"] as string) || (req?.headers["host"] as string) || "localhost";
  return `${proto}://${host}`;
}

export default class Service extends cds.ApplicationService {
  public async index() {
    cds.context?.http?.res.setHeader("Content-Type", "text/html");
    return cds.context?.http?.res.send(
      htmlTemplate(
        renderToString(
          <body className="bg-gray-950 text-white min-h-screen">
            <div className="container mx-auto px-4 py-8">
              <div className="text-center mb-8 space-y-2">
                <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  OAuth Demo: Step-wise Permissions
                </h1>
                <p className="text-gray-400">Analysis → Report → Deployment</p>
              </div>

              <div className="flex items-center justify-center gap-6 mb-8">
                <a
                  className="px-3 py-2 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30"
                  hx-get="/demo/permissions_analysis_request"
                  hx-target="#step-content"
                  hx-swap="innerHTML"
                  hx-trigger="click, load"
                >
                  1. Analysis
                </a>
                <span className="w-8 h-px bg-gray-700" />
                <a
                  className="px-3 py-2 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30"
                  hx-get="/demo/permissions_report_request"
                  hx-target="#step-content"
                  hx-swap="innerHTML"
                >
                  2. Report
                </a>
                <span className="w-8 h-px bg-gray-700" />
                <a
                  className="px-3 py-2 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30"
                  hx-get="/demo/permissions_deployment_request"
                  hx-target="#step-content"
                  hx-swap="innerHTML"
                >
                  3. Deployment
                </a>
              </div>

              <div id="step-content" className="max-w-3xl mx-auto" />
            </div>
          </body>
        )
      )
    );
  }

  // STEP 1: Analysis — create a new grant request
  public async permissions_analysis_request() {
    const authorizationService = await cds.connect.to(AuthorizationService);

    const analysisDetails: AuthorizationDetailRequest[] = [
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
      } as any,
      {
        type: "fs",
        roots: ["/workspace/configs", "/home/agent/analytics"],
        permissions_read: true,
        permissions_write: false,
        permissions_execute: false,
        permissions_list: true,
      } as any,
    ];

    const redirectUri = new URL(
      "/demo/permissions_analysis_callback",
      getBaseUrl()
    ).href;

    const parReq = {
      response_type: "code",
      client_id: "demo-client-app",
      redirect_uri: redirectUri,
      grant_management_action: "create",
      authorization_details: JSON.stringify(analysisDetails),
      requested_actor: "urn:agent:analytics-bot-v1",
      scope: "analytics_read",
      subject: cds.context?.user?.id,
      subject_token_type: "urn:ietf:params:oauth:token-type:basic",
    } as any;

    const parRes = await authorizationService.par(parReq);
    if (!parRes) {
      return cds.context?.html(renderToString(<div className="text-red-400">Authorization failed</div>));
    }

    const authServerUrl = (await cds.connect.to(AuthorizationService).then((s: any) => s.baseUrl)) || "/oauth-server";

    return cds.context?.html(
      renderToString(
        <AuthorizationRequestButton
          authServerUrl={authServerUrl}
          {...parReq}
          request_uri={parRes.request_uri}
          expires_in={parRes.expires_in}
          authorization_details={analysisDetails}
        />
      )
    );
  }

  public async permissions_analysis_callback(code, code_verifier, redirect_uri) {
    const authorizationService = await cds.connect.to(AuthorizationService);
    const token: any = await authorizationService.token({
      grant_type: "authorization_code",
      client_id: "demo-client-app",
      code,
      code_verifier,
      redirect_uri,
    });

    if (token?.error) {
      return cds.context?.html(renderToString(<div className="text-red-400">Authorization failed</div>));
    }

    const next = `/demo/permissions_report_request?grant_id=${encodeURIComponent(token.grant_id)}`;
    cds.context?.http?.res.setHeader("Location", next);
    return cds.context?.http?.res.status(302).send("");
  }

  // STEP 2: Report — merge into existing grant
  public async permissions_report_request(grant_id) {
    const authorizationService = await cds.connect.to(AuthorizationService);
    const details: AuthorizationDetailRequest[] = [
      {
        type: "api",
        urls: [
          "https://api.reporting.internal/v1/reports",
          "https://api.reporting.internal/v1/exports",
        ],
        protocols: ["HTTPS"],
      } as any,
    ];

    const redirectUri = new URL(
      "/demo/permissions_report_callback",
      getBaseUrl()
    ).href;

    const parReq = {
      response_type: "code",
      client_id: "demo-client-app",
      redirect_uri: redirectUri,
      grant_management_action: "merge",
      grant_id,
      authorization_details: JSON.stringify(details),
      requested_actor: "urn:agent:reporting-bot-v1",
      scope: "reports_read",
      subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
      subject: cds.context?.user?.id,
    } as any;

    const parRes = await authorizationService.par(parReq);
    if (!parRes) {
      return cds.context?.html(renderToString(<div className="text-red-400">Authorization failed</div>));
    }

    const authServerUrl = (await cds.connect.to(AuthorizationService).then((s: any) => s.baseUrl)) || "/oauth-server";

    return cds.context?.html(
      renderToString(
        <AuthorizationRequestButton
          authServerUrl={authServerUrl}
          {...parReq}
          request_uri={parRes.request_uri}
          expires_in={parRes.expires_in}
          authorization_details={details}
        />
      )
    );
  }

  public async permissions_report_callback(code, code_verifier, redirect_uri) {
    const authorizationService = await cds.connect.to(AuthorizationService);
    const token: any = await authorizationService.token({
      grant_type: "authorization_code",
      client_id: "demo-client-app",
      code,
      code_verifier,
      redirect_uri,
    });

    if (token?.error) {
      return cds.context?.html(renderToString(<div className="text-red-400">Authorization failed</div>));
    }

    const next = `/demo/permissions_deployment_request?grant_id=${encodeURIComponent(token.grant_id)}`;
    cds.context?.http?.res.setHeader("Location", next);
    return cds.context?.http?.res.status(302).send("");
  }

  // STEP 3: Deployment — merge into existing grant
  public async permissions_deployment_request(grant_id) {
    const authorizationService = await cds.connect.to(AuthorizationService);
    const details: AuthorizationDetailRequest[] = [
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
      } as any,
      {
        type: "api",
        urls: [
          "https://api.deployment.internal/v1/deploy",
          "https://api.infrastructure.internal/v1/provision",
        ],
        protocols: ["HTTPS"],
      } as any,
    ];

    const redirectUri = new URL(
      "/demo/permissions_deployment_callback",
      getBaseUrl()
    ).href;

    const parReq = {
      response_type: "code",
      client_id: "demo-client-app",
      redirect_uri: redirectUri,
      grant_management_action: "merge",
      grant_id,
      authorization_details: JSON.stringify(details),
      requested_actor: "urn:agent:deployment-bot-v1",
      scope: "deployments",
      subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
      subject: cds.context?.user?.id,
    } as any;

    const parRes = await authorizationService.par(parReq);
    if (!parRes) {
      return cds.context?.html(renderToString(<div className="text-red-400">Authorization failed</div>));
    }

    const authServerUrl = (await cds.connect.to(AuthorizationService).then((s: any) => s.baseUrl)) || "/oauth-server";

    return cds.context?.html(
      renderToString(
        <AuthorizationRequestButton
          authServerUrl={authServerUrl}
          {...parReq}
          request_uri={parRes.request_uri}
          expires_in={parRes.expires_in}
          authorization_details={details}
        />
      )
    );
  }

  public async permissions_deployment_callback(code, code_verifier, redirect_uri) {
    const authorizationService = await cds.connect.to(AuthorizationService);
    const token: any = await authorizationService.token({
      grant_type: "authorization_code",
      client_id: "demo-client-app",
      code,
      code_verifier,
      redirect_uri,
    });

    if (token?.error) {
      return cds.context?.html(renderToString(<div className="text-red-400">Authorization failed</div>));
    }

    cds.context?.http?.res.setHeader("Location", "/grants-management/Grants");
    return cds.context?.http?.res.status(302).send("");
  }
}

export type DemoService = Service & typeof cds.ApplicationService;
