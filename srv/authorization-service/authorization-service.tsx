import cds from "@sap/cds";
import par from "./handler.requests.tsx";
import authorize from "./handler.authorize.tsx";
import token from "./handler.token.tsx";
import metadata from "./handler.metadata.tsx";
import {
  AuthorizationRequests,
  Consent,
  Consents,
} from "#cds-models/sap/scai/grants/AuthorizationService";
import { POST as consent } from "./handler.consent.tsx";
import {GrantsHandler} from "@/grant-management/grant-management.tsx";
///Authorization Service - OAuth-style authorization endpoint with Rich Authorization Requests (RFC 9396)
export default class Service extends cds.ApplicationService {
  
  
  init() {
    console.log("🔐 Initializing AuthorizationService...");

     this.before("READ", AuthorizationRequests, (req) => {
       req.data["$expand"] = [
         ...(req.data["$expand"]?.split(",") || []),
         "grant($expand=authorization_details)"
          
       ]
           .filter(unique)
           .join(",");
    });
    // Register route handlers
    this.on("token", token);
    this.on("authorize", authorize);
    this.on("par", par);
    this.on("metadata", metadata);
    this.on("POST", Consents, consent);

    console.log("✅ AuthorizationService initialized");
    return super.init && super.init();
  }

  private async Expand(
      ...[req, next]: Parameters<GrantsHandler>
  ){
    req.data["$expand"] = [
      ...(req.data["$expand"]?.split(",") || []),
      "authorization_details",
      "consents",
    ]
        .filter(unique)
        .join(",");
    console.log("Expanding grant details for request:", req.query.SELECT);

    return next(req);
  }
}


function unique<T>(value: T, index: number, array: T[]): value is T {
  return array.indexOf(value) === index;
}
export type AuthorizationService = Service & typeof cds.ApplicationService;
