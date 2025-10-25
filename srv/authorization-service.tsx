import cds from "@sap/cds";
import par from "./authorization-service/handler.requests.tsx";
import authorize from "./authorization-service/handler.authorize.tsx";
import token from "./authorization-service/handler.token.tsx";
import metadata from "./authorization-service/handler.metadata.tsx";
import { Consent, Consents } from "#cds-models/AuthorizationService";
import { POST as consent, UPDATE as consentUpdate } from "./authorization-service/handler.consent.tsx";
///Authorization Service - OAuth-style authorization endpoint with Rich Authorization Requests (RFC 9396)
export default class Service extends cds.ApplicationService {
  init() {
    console.log("🔐 Initializing AuthorizationService...");

    // Register route handlers
    this.on("token", token);
    this.on("authorize", authorize);
    this.on("par", par);
    this.on("metadata", metadata);
    this.on("POST", Consents, consent);
    this.on("UPDATE", Consents, consentUpdate);

    // Clean up non-modeled fields before validation on Consents
    this.before(["POST", "UPDATE"], Consents, (req) => {
      const d: any = req.data || {};
      if (d.authorization_details !== undefined) {
        (req as any).__postedAuthDetails = d.authorization_details;
        delete d.authorization_details;
      }
      if (d.__postedAuthDetails !== undefined) {
        (req as any).__postedAuthDetails = d.__postedAuthDetails;
        delete d.__postedAuthDetails;
      }
      req.data = d;
    });

    console.log("✅ AuthorizationService initialized");
    return super.init && super.init();
  }
}

export type AuthorizationService = Service & typeof cds.ApplicationService;
