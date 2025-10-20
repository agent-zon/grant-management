// Grant Detail Service - CDS service that serves individual grant UI directly
import React from "react";
import cds from "@sap/cds";
import grantList from "./grant-management/handler.list.tsx";
import grantEdit from "./grant-management/handler.edit.tsx";
import grantRevoke from "./grant-management/handler.revoke.tsx";
import { Grants, Consents } from "#cds-models/com/sap/agent/grants";
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

    grantRevoke(this);
    grantList(this);
    grantEdit(this);

    return super.init();
    /*
    not in use now, to check - which one is better?  register to events in service and call the fucntion or use the functions to register themself?
    this.after("READ", Grants, async function (data, req) {
      if(req.data.ID ) {
        return grantEdit(data[0], req);
      }
      return grantList(data, req);
    });

    this.after("UPDATE", Grants, async function (data, req) {
      return grantEdit(data[0], req);
    });
   */
  }
}

export type GrantsManagementService = Service & typeof cds.ApplicationService;
