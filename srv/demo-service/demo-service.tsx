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
  
  async init() {
    // Index - generate new grant and redirect
    this.on('index', async () => {
      const grant_id = ulid();
      cds.context?.http?.res.redirect(`/demo/shell?grant_id=${grant_id}`);
    });
    
    // Shell
    this.on('shell', async (req) => {
      return ShellHandler.GET.call(this, req.data.grant_id);
    });
    
    // Grant status
    this.on('grant_status', async (req) => {
      return GrantTemplateHandler.GET.call(this, req.data.grant_id);
    });
    
    // Analysis
    this.on('analysis_request', async (req) => {
      return AnalyzeHandler.REQUEST.call(this, req.data.grant_id);
    });
    
    this.on('analysis_elements', async (req) => {
      return AnalyzeHandler.GET.call(this, req.data.grant_id);
    });
    
    this.on('analysis_tile', async (req) => {
      return AnalyzeHandler.TILE.call(this, req.data.grant_id);
    });
    
    // Deployment
    this.on('deployment_request', async (req) => {
      return DeployHandler.REQUEST.call(this, req.data.grant_id);
    });
    
    this.on('deployment_elements', async (req) => {
      return DeployHandler.GET.call(this, req.data.grant_id);
    });
    
    this.on('deployment_tile', async (req) => {
      return DeployHandler.TILE.call(this, req.data.grant_id);
    });
    
    // Monitoring
    this.on('monitoring_request', async (req) => {
      return MonitorHandler.REQUEST.call(this, req.data.grant_id);
    });
    
    this.on('monitoring_elements', async (req) => {
      return MonitorHandler.GET.call(this, req.data.grant_id);
    });
    
    this.on('monitoring_tile', async (req) => {
      return MonitorHandler.TILE.call(this, req.data.grant_id);
    });
    
    // OAuth callback
    this.on('callback', async (req) => {
      const { code, code_verifier, redirect_uri, grant_id } = req.data;
      
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
                <pre className="text-xs text-green-300 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(tokenResponse, null, 2)}
                </pre>
              </div>
              <div className="text-sm text-gray-400">
                Grant has been updated. Reload sections to see new permissions.
              </div>
            </div>
          )
        );
      } catch (e) {
        return this.renderError(e);
      }
    });
    
    await super.init();
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
