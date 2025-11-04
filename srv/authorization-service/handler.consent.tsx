import cds from "@sap/cds";
import type { AuthorizationService } from "./authorization-service.tsx";
import {
  AuthorizationRequests,
  Consents,
  Consent,
  AuthorizationDetailType, AuthorizationRequest,
  Grants,
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
  // Normalize consent payload: ensure request association gets set when request_ID is provided
  if (req.data && req.data.request_ID && !req.data.request) {
    // set the structured association foreign key
    // @ts-ignore - allow setting generated foreign key field
    req.data.request = { ID: req.data.request_ID } as any;
  }
  req.data.previous_consent = await getPreviousConsent(this, req.data.grant_id || "");
  console.log("🔐 Creating consent:", req.data);

  const consent = await next(req);
  if (isConsent(consent)) {
    // Ensure Grants row exists and keep scope aggregated from all consents
    try {
      const grantId: string = consent.grant_id!;
      // Aggregate scopes across all consents for this grant
      const consentRows = await cds.run(
        cds.ql.SELECT.from("sap.scai.grants.Consents").columns("scope").where({ grant_id: grantId })
      );
      const aggregatedScope: string = (consentRows || [])
        .map((row: any) => row.scope)
        .filter(Boolean)
        .join(" ")
        .split(/\s+/)
        .filter((value, index, array) => value && array.indexOf(value) === index)
        .join(" ");

      // Enrich with client and actor from the related authorization request
      let clientId: string | undefined;
      let actor: string | undefined;
      if (consent.request_ID) {
        const requestRow = await cds.run(
          cds.ql.SELECT.one
            .from("sap.scai.grants.AuthorizationRequests")
            .where({ ID: consent.request_ID })
        );
        clientId = requestRow?.client_id;
        actor = requestRow?.requested_actor;
      }

      // Check if grant row exists
      const existingGrant = await cds.run(
        cds.ql.SELECT.one.from(Grants).where({ id: grantId })
      );
      if (existingGrant) {
        await cds.run(
          UPDATE(Grants)
            .set({ scope: aggregatedScope, status: "active", actor: actor })
            .where({ id: grantId })
        );
      } else {
        await cds.run(
          INSERT.into(Grants).entries({
            id: grantId,
            client_id: clientId,
            scope: aggregatedScope,
            status: "active",
            actor: actor,
          })
        );
      }
    } catch (e) {
      console.warn("[consent] grant aggregation/upsert failed", e);
    }

    const request = (await this.read(AuthorizationRequests, consent.request_ID!)) as AuthorizationRequest;
    //@ts-ignore
    cds.context?.http?.res.redirect(301, `${request?.redirect_uri}?code=${consent.request_ID}`);
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
