import cds from "@sap/cds";
import par from "./authorization-service/handler.requests.tsx";
import authorize from "./authorization-service/handler.authorize.tsx";
import token from "./authorization-service/handler.token.tsx";
import metadata from "./authorization-service/handler.metadata.tsx";
import { Consent, Consents } from "#cds-models/AuthorizationService";
import { POST as consent } from "./authorization-service/handler.consent.tsx";
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

    console.log("✅ AuthorizationService initialized");
    return super.init && super.init();
  }
}

export type AuthorizationService = Service & typeof cds.ApplicationService;
