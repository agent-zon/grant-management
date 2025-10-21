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
    user_id: string;
    user_name: string;
    user_email: string;
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

  export interface Consent {
    request_ID: string;
    scope: string;
    client_id: string;
    grant_id: string;
  }
}

declare module "#cds-models/com/sap/agent/grants" {
  export interface Consent {
    request_ID: string;
    scope: string;
    client_id: string;
    redirect_uri: string;
    grant_id: string;
  }
}
