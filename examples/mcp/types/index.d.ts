import type express from "express";
import type {
  IdentityService,
  IdentityServiceToken,
  SecurityContext,
} from "@sap/xssec";
import type { AuthorizationDetail } from "#cds-models/grant_management";
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

declare module "#cds-models/grant_management" {
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

declare module "@sap/cds" {
  interface User {
    authInfo?: SecurityContext<IdentityService, IdentityServiceToken>;
  }
}

declare class cds_Map {
  [key: string]: string;
}
