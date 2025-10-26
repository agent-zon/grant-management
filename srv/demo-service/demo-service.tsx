import cds from "@sap/cds";
import { renderToString } from "react-dom/server";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";
import React from "react";
import { ulid } from "ulid";

// Import handlers
import * as ShellHandler from "./handler.shell.tsx";
import * as GrantTemplateHandler from "./handler.grant-template.tsx";
import * as AnalyzeHandler from "./handler.analyze.tsx";
import * as DeployHandler from "./handler.deploy.tsx";
import * as MonitorHandler from "./handler.monitor.tsx";

export default class Service extends cds.ApplicationService {
  
  override async init() {
    // Default route - generate new grant and redirect
    this.on("*", async (req, next) => {
      if (req.path === "/" || req.path === "") {
        const grant_id = ulid();
        return cds.context?.http?.res.redirect(`/demo/devops_bot/shell?grant_id=${grant_id}`);
      }
      return next();
    });
    
    // Register handlers
    this.on("shell", ShellHandler.GET);
    this.on("grant", GrantTemplateHandler.GET);
    
    this.on("analyze", AnalyzeHandler.GET);
    this.on("analyze_request", AnalyzeHandler.REQUEST);
    
    this.on("deploy", DeployHandler.GET);
    this.on("deploy_request", DeployHandler.REQUEST);
    
    this.on("monitor", MonitorHandler.GET);
    this.on("monitor_request", MonitorHandler.REQUEST);
    
    // OAuth callback
    this.on("callback", this.callback);
    
    await super.init();
  }
  
  // Callback handler
  public async callback(req: cds.Request) {
    const { code, code_verifier, redirect_uri } = req.data;
    
    try {
      const authorizationService = await cds.connect.to(AuthorizationService);
      const tokenResponse: any = await authorizationService.token({
        grant_type: "authorization_code",
        client_id: "devops-bot",
        code,
        code_verifier,
        redirect_uri,
      });

      // Get grant_id from token response
      const grant_id = tokenResponse.grant_id;

      // Use HTMX headers to navigate back to shell
      cds.context?.http?.res.setHeader("Content-Type", "text/html");
      cds.context?.http?.res.setHeader("HX-Trigger", "grant-updated");
      cds.context?.http?.res.setHeader("HX-Location", `/demo/devops_bot/shell?grant_id=${grant_id}`);
      cds.context?.http?.res.setHeader("HX-Push-Url", `/demo/devops_bot/shell?grant_id=${grant_id}`);

      return cds.context?.http?.res.send(
        renderToString(
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-green-400">✅ Authorization Complete</h3>
            <div className="bg-gray-900 rounded p-4">
              <pre className="text-xs text-green-300 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(tokenResponse, null, 2)}
              </pre>
            </div>
            <div className="text-sm text-gray-400">
              Redirecting to shell...
            </div>
          </div>
        )
      );
    } catch (e) {
      return this.renderError(e);
    }
  }
  
  // Helper methods
  public renderError(e: any) {
    const error = e as { message: string };
    return cds.context?.http?.res.status(500).send(
      renderToString(
        <div className="text-red-400 p-4">
          <h3 className="font-bold text-lg mb-2">❌ Error</h3>
          <p className="text-sm">{error.message}</p>
        </div>
      )
    );
  }

  public async getAuthServerUrl(): Promise<string> {
    return (
      (await cds.connect.to(AuthorizationService).then((service: any) => {
        return service.baseUrl;
      })) || "/oauth-server"
    );
  }
}

export type DemoService = Service & typeof cds.ApplicationService;
