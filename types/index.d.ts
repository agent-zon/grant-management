import cds from "@sap/cds";

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
    risk_level: string;
    actor: string;
    subject: string;
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
