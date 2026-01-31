import cds from "@sap/cds";
import {
  IdentityService,
  IdentityServiceToken,
  SecurityContext,
} from "@sap/xssec";

import {
  McpServer,
  RegisteredTool,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import React from "react";
declare module "@sap/cds" {
  interface EventContext {
    render: (
      component: React.ReactNode
    ) => express.Response<any, Record<string, any>>;
    html: (htmlString: string) => express.Response<any, Record<string, any>>;
  }
}

declare module "#cds-models/AuthorizationService" {
  export interface Consent {
    request_ID: string;
    redirect_uri: string;
    scope: string;
    client_id: string;
    grant_id: string;
  }
  export interface AuthorizationRequest {
    request_ID: string;
    redirect_uri: string;
    scope: string;
    client_id: string;
    grant_id: string;
  }

  export interface AuthorizationRequests {
    redirect_uri: string;
  }
}

declare module "#cds-models/sap/scai/grants" {
  export interface Consent {
    request_ID: string;
    scope: string;
    client_id: string;
    redirect_uri: string;
    grant_id: string;
  }

  export interface Grants {
    id: string;
    client_id: string;
    consents: Consent[];
    authorization_details: AuthorizationDetail[];
    scope: string;
    subject: string;
    actor: string;
    risk_level: string;
    status: string;
    createdAt: Date;
    modifiedAt: Date;
  }
}

declare module "#cds-models/GrantsManagementService" {
  export interface Grant {
    id: string;
    client_id: string;
    risk_level: string;
    actor: string;
    subject: string;
  }
  export interface Grants {
    id: string;
    client_id: string;
    consents: Consent[];
    authorization_details: AuthorizationDetail[];
    scope: string;
    subject: string;
    actor: string;
    risk_level: string;
    status: string;
    createdAt: Date;
    modifiedAt: Date;
  }
  export interface Consent {
    id: string;
    grant_id: string;
    scope: string;
    client_id: string;
    redirect_uri: string;
    grant_id: string;
  }
}

declare module "@sap/cds" {
  interface User {
    authInfo?: SecurityContext<IdentityService, IdentityServiceTokenWithPayload>;
  }
}

declare module "@sap/xssec" {
  interface IdentityServiceJwtPayload {
    actor?: string;
  }
  interface SecurityContext<T extends IdentityService, U extends IdentityServiceToken> {
    token?: U;
  }
  interface IdentityServiceTokenWithPayload extends IdentityServiceToken {
    payload?: {
      actor?: string;
      
    };
  }
}

export type MCPRequest = {
  host: string;
  agent: string;
  jsonrpc?: string;
  id?: number;
  method?: string;
  params?: Record<string, any>;
  meta: { host?: string; agent?: string; grant_id?: string };
  server: McpServer;
  // //extra -virtual
  // origin: string;
  // serverId: string;
  // grant_id: string;
  grant: Grant;
  authorizationDetails: AuthorizationDetailMcpTool;
  server: McpServer;
  tools: Record<string, RegisteredTool>;
};
