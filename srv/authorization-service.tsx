import cds from "@sap/cds";
import par from "./authorization-service/handler.requests.tsx";
import authorize from "./authorization-service/handler.authorize.tsx";
import token from "./authorization-service/handler.token.tsx";
import metadata from "./authorization-service/handler.metadata.tsx";
import consent from "./authorization-service/handler.consent.tsx";
import ServiceModel, {
  type Grant,
  Consents,
  Grants,
} from "#cds-models/AuthorizationService";

///Authorization Service - OAuth-style authorization endpoint with Rich Authorization Requests (RFC 9396)
export default class Service extends cds.ApplicationService {
  init() {
    console.log("🔐 Initializing AuthorizationService...");
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
    // Register route handlers
    authorize(this);
    par(this);
    token(this);
    metadata(this);
    consent(this);

    console.log("✅ AuthorizationService initialized");
    return super.init && super.init();
  }
}

export type AuthorizationService = Service & typeof cds.ApplicationService;
