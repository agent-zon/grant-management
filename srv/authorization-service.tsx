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

// Auto-expand authorization_details for all Grants READ operations, probably can be done more efficiently
/*
    this.after("each", Grants, async (grant: Grant) => {
      console.log(
        "🔧 After each Grants - processing authorization_details expansion"
      );
      const authDetails = await cds
        .read("com.sap.agent.grants.AuthorizationDetail")
        .where(`consent.grant_id = '${grant.id}'`);
      grant.authorization_details = authDetails || [];
      console.log("🔧 authorization_details:", grant.authorization_details);
      const consent = await cds
        .read(Consents)
        .where(`grant_id = '${grant.id}'`);
      console.log("🔧 select scope:", consent);
      grant.scope = consent.map((c: any) => c.scope).join(" ");
      console.log("🔧 set scope:", grant.scope);
      console.log(
        `🔧 Fetched ${authDetails?.length || 0} authorization details for grant ${grant.id}`
      );
    });
     */
