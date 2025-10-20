import cds from "@sap/cds";
import type { AuthorizationService } from "../authorization-service.tsx";
import {
  AuthorizationRequests,
  Consent,
} from "#cds-models/AuthorizationService";

export async function POST(
  this: AuthorizationService,
  consent: Consent | unknown
) {
  if (consent) {
    console.log("🔐 Consent created:", consent);
    const authRequest = await this.read(
      AuthorizationRequests,
      consent?.request_ID
    );
    console.log("🔐 Auth request:", authRequest);

    return cds.context?.http?.res.redirect(
      `${authRequest?.redirect_uri}?code=${consent.request_ID}`
    );
  }
}
