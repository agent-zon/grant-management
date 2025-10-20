import cds from "@sap/cds";
import type { AuthorizationService } from "../authorization-service.tsx";
import {
  AuthorizationRequests,
  Consents,
} from "#cds-models/AuthorizationService";

export default function (srv: AuthorizationService) {
  // Simple consent creation with grant update
  srv.before("POST", Consents, async (req) => {
    console.log("🔐 Creating consent:", req.data);

    // Ensure we have a grant association
    if (!req.data.grant_id) {
      return req.error(400, "Grant ID is required for consent");
    }

    // // Update the grant's subject if not already set
    // const grant = await srv.read(Grants, req.data.grant_id);
    // if (grant && !grant.subject && req.data.subject) {
    //   console.log("📝 Updating grant subject to:", req.data.subject);
    //   await srv.update(Grants, req.data.grant_id).with({
    //     subject: req.data.subject,
    //     scope: req.data.scope || grant.scope,
    //   });
    // }

    // Find previous consents for this grant to establish chain
    const previousConsents = await srv.run(
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

  srv.after("POST", Consents, async (consent, req) => {
    console.log("🔐 Consent created:", consent);

    const authRequest = await srv.read(
      AuthorizationRequests,
      consent?.request_ID
    );
    console.log("🔐 Auth request:", authRequest);

    cds.context?.http?.res.redirect(
      `${authRequest?.redirect_uri}?code=${consent.request_ID}`
    );
  });
}
