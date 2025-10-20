// Grant Detail Service - CDS service that serves individual grant UI directly
import cds from "@sap/cds";
import { LIST } from "./grant-management/handler.list.tsx";
import { GET, POST } from "./grant-management/handler.edit.tsx";
import { DELETE } from "./grant-management/handler.revoke.tsx";
import { Grants, Consents } from "#cds-models/GrantsManagementService";

// CDS ApplicationService for Grant Detail with path parameter support
export default class Service extends cds.ApplicationService {
  init() {
    // Auto-expand authorization_details for all Grants READ operations
    super.before("READ", Grants, (req) => {
      console.log(
        "🔧 Before READ Grants - Original query:",
        JSON.stringify(req.query, null, 2)
      );

      // Add $expand parameter if not present
      if (
        !req.query["$expand"] ||
        !req.query["$expand"].includes("authorization_details")
      ) {
        if (!req.query["$expand"]) {
          req.query["$expand"] = "authorization_details";
        } else {
          req.query["$expand"] += ",authorization_details";
        }
        console.log(
          "🔧 Added authorization_details expansion:",
          req.query["$expand"]
        );
      }
      return req.data;
    });

    this.before("POST", Consents, async (req) => {
      console.log("🔐 Creating consent:", req.data);

      // Ensure we have a grant association
      if (!req.data.grant_id) {
        return req.error(400, "Grant ID is required for consent");
      }

      // Find previous consents for this grant to establish chain
      const previousConsents = await this.run(
        cds.ql.SELECT.from(Consents)
          .where({ grant_id: req.data.grant_id })
          .orderBy("createdAt desc")
          .limit(1)
      );

      if (previousConsents.length > 0) {
        const previousConsent = previousConsents[0];
        console.log("🔗 Found previous consent:", previousConsent.ID);

        // Link to previous consent for chain
        req.data.previous_consent_ID = previousConsent.ID;
      }
    });

    // Register grant handlers
    this.on("DELETE", Grants, DELETE);

    this.after("GET", Grants, LIST);
    this.after("GET", Grants, GET);
    this.after("UPDATE", Grants, POST);
    return super.init();
  }
}

export type GrantsManagementService = Service & typeof cds.ApplicationService;
