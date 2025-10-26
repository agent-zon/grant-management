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
import {CALLBACK} from "@/demo-service/handler.callback.tsx";

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
    this.on("callback", CALLBACK);
    
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
