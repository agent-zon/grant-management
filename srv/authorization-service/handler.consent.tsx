import cds, { ApplicationService } from "@sap/cds";
import AuthorizationService from "../authorization-service.tsx";

export default function (srv: AuthorizationService) {
  const { AuthorizationRequests, Consents, Grants } = srv.entities;

  // Simple consent creation with grant update
  srv.before("POST", Consents, async (req) => {
    console.log("🔐 Creating consent:", req.data);

    // Ensure we have a grant association
    if (!req.data.grant_id) {
      return req.error(400, "Grant ID is required for consent");
    }

    // Find previous consents for this grant to establish chain
    const previousConsents = await srv.run(
      SELECT.from(Consents)
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
