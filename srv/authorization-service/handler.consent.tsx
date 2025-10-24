import cds from "@sap/cds";
import type { AuthorizationService } from "./authorization-service.tsx";
import {
  AuthorizationRequests,
  Consents,
  Consent,
  AuthorizationDetailType, AuthorizationRequest,
} from "#cds-models/sap/scai/grants/AuthorizationService";
import { isNativeError } from "node:util/types";

type ConsentHandler = cds.CRUDEventHandler.On<Consent, void | Consent | Error>;

function isConsent(consent: Promise<void | Consent | Error> | void | Consent | Error): consent is Consent {
  return !!consent && !isNativeError(consent) ;
}

export async function POST(
  this: AuthorizationService,
  req: Parameters<ConsentHandler>[0],
  next: Parameters<ConsentHandler>[1]
) {
  req.data.previous_consent = await getPreviousConsent(this, req.data.grant_id || "");
  console.log("🔐 Creating consent:", req.data);

  const consent = await next(req);
  if (isConsent(consent)) {
    const request = await this.read(AuthorizationRequests, consent.request_ID!) as AuthorizationRequest
    //@ts-ignore
    cds.context?.http?.res.redirect(301,
      `${request?.redirect_uri}?code=${consent.request_ID}`
    );
  }
  return consent;
}

async function getPreviousConsent(srv: AuthorizationService, grant_id: string) {
  const previousConsents = await srv.run(
    cds.ql.SELECT.from(Consents)
      .where({ grant_id })
      .orderBy("createdAt desc")
      .limit(1)
  );

  return previousConsents[0];
}
