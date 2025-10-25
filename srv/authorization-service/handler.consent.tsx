import cds from "@sap/cds";
import type { AuthorizationService } from "../authorization-service";
import {
  AuthorizationRequests,
  Consents,
  Consent,
} from "#cds-models/AuthorizationService";
import { isNativeError } from "node:util/types";
import { flattenAuthorizationDetails } from "./permissions-utils";

type ConsentHandler = cds.CRUDEventHandler.On<Consent, void | Consent | Error>;

export async function POST(
  this: AuthorizationService,
  req: Parameters<ConsentHandler>[0],
  next: Parameters<ConsentHandler>[1]
) {
  req.data.previous_consent = await getPreviousConsent(this, req.data.grant_id);
  console.log("🔐 Creating consent:", req.data);
  // Extract any posted authorization_details payload for manual processing
  const postedAuthDetails = (req.data as any)?.authorization_details as
    | any[]
    | string
    | undefined;
  // Prevent auto-CRUD from trying to persist nested authorization_details on Consents (no longer modeled)
  if (postedAuthDetails) {
    delete (req.data as any).authorization_details;
  }

  const consent = await next(req);

  // Upsert flattened Permissions and legacy AuthorizationDetail rows
  if (consent && !isNativeError(consent)) {
    const request = (await this.read(
      AuthorizationRequests,
      consent.request_ID
    )) as any;

    // Determine details source: posted payload takes precedence, otherwise use PAR-stored access
    let details: any[] = [];
    try {
      if (Array.isArray(postedAuthDetails)) details = postedAuthDetails;
      else if (typeof postedAuthDetails === "string")
        details = JSON.parse(postedAuthDetails);
    } catch (e) {
      console.warn("⚠️ Failed to parse posted authorization_details:", e);
    }
    if (!details?.length && Array.isArray(request?.access)) {
      details = request.access;
    }

    const grantId = consent.grant_id;
    const requestId = consent.request_ID;

    if (Array.isArray(details) && details.length > 0) {
      // 1. Insert into new flattened Permissions table
      const permissionRows = flattenAuthorizationDetails(
        details,
        grantId,
        requestId
      );

      if (permissionRows.length > 0) {
        await this.insert(permissionRows).into("com.sap.agent.grants.Permissions");
        console.log(
          `✅ Inserted ${permissionRows.length} permission rows for grant ${grantId}`
        );
      }

      // 2. Also maintain legacy AuthorizationDetail for backward compatibility
      const records = details.map((d: any, idx: number) => {
        const identifier = d.identifier || `${d.type || "detail"}-${idx}`;
        const id = `${grantId}:${identifier}`;
        const {
          type,
          actions,
          locations,
          tools,
          roots,
          databases,
          schemas,
          tables,
          urls,
          protocols,
          permissions,
          ...rest
        } = d || {};
        return {
          id,
          identifier,
          grant_ID: grantId,
          request_ID: requestId,
          type,
          actions,
          locations,
          tools,
          ...rest,
        };
      });

      await this.upsert(records).into("com.sap.agent.grants.AuthorizationDetail");
      console.log(
        `✅ Upserted ${records.length} authorization_details (legacy) for grant ${grantId}`
      );
    }

    // Redirect to client with code
    cds.context?.http?.res.redirect(
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
