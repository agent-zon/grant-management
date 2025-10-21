import cds from "@sap/cds";
import par from "./handler.requests.tsx";
import authorize from "./handler.authorize.tsx";
import token from "./handler.token.tsx";
import metadata from "./handler.metadata.tsx";
import { Consent, Consents } from "#cds-models/AuthorizationService";
import { POST as consent } from "./handler.consent.tsx";
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

