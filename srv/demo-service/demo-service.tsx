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
      cds.context?.http?.res.redirect(`/demo/DevOpsBot(grant_id='${grant_id}')/shell`);
    });
    
    // DevOpsBot entity handlers
    this.on('READ', 'DevOpsBot', async (req) => {
      // Return minimal entity data
      return { grant_id: req.data.grant_id };
    });
    
    this.on('shell', 'DevOpsBot', async (req) => {
      return ShellHandler.GET.call(this, req.params[0].grant_id);
    });
    
    this.on('grant_status', 'DevOpsBot', async (req) => {
      return GrantTemplateHandler.GET.call(this, req.params[0].grant_id);
    });
    
    // Analysis entity handlers
    this.on('READ', 'Analysis', async (req) => {
      return { grant_id: req.data.grant_id };
    });
    
    this.on('request', 'Analysis', async (req) => {
      return AnalyzeHandler.REQUEST.call(this, req.params[0].grant_id);
    });
    
    this.on('elements', 'Analysis', async (req) => {
      return AnalyzeHandler.GET.call(this, req.params[0].grant_id);
    });
    
    this.on('tile', 'Analysis', async (req) => {
      return AnalyzeHandler.TILE.call(this, req.params[0].grant_id);
    });
    
    // Deployment entity handlers
    this.on('READ', 'Deployment', async (req) => {
      return { grant_id: req.data.grant_id };
    });
    
    this.on('request', 'Deployment', async (req) => {
      return DeployHandler.REQUEST.call(this, req.params[0].grant_id);
    });
    
    this.on('elements', 'Deployment', async (req) => {
      return DeployHandler.GET.call(this, req.params[0].grant_id);
    });
    
    this.on('tile', 'Deployment', async (req) => {
      return DeployHandler.TILE.call(this, req.params[0].grant_id);
    });
    
    // Monitoring entity handlers
    this.on('READ', 'Monitoring', async (req) => {
      return { grant_id: req.data.grant_id };
    });
    
    this.on('request', 'Monitoring', async (req) => {
      return MonitorHandler.REQUEST.call(this, req.params[0].grant_id);
    });
    
    this.on('elements', 'Monitoring', async (req) => {
      return MonitorHandler.GET.call(this, req.params[0].grant_id);
    });
    
    this.on('tile', 'Monitoring', async (req) => {
      return MonitorHandler.TILE.call(this, req.params[0].grant_id);
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
