import cds from "@sap/cds";
import { ulid } from "ulid";
import type { AuthorizationService } from "../authorization-service.tsx";
import { AuthorizationRequests } from "#cds-models/AuthorizationService";

export default async function push(
  this: AuthorizationService,
  req: cds.Request<{
    grant_id?: string;
    subject?: string;
    authorization_details?: string;
    client_id?: string;
    scope?: string;
  }>
) {
  //todo:extract subject from token
  //  const {subject_token_type, subject_token} = req.data;
  //  const subject = await cds.auth.authenticate(subject_token_type, subject_token);

  // Generate or use existing grant ID
  const grantId = req.data.grant_id || `gnt_${ulid()}`;
  console.log("🔑 Grant ID for request:", grantId);


  // Create authorization request linked to grant
  const { ID } = await this.insert({
    grant_id: grantId,
    ...req.data,
    access: req.data.authorization_details
      ? parseAuthorizationDetails(req.data.authorization_details)
      : [],
  }).into(AuthorizationRequests);

  console.log("Request created", ID);

  // Upsert AuthorizationDetail records for this request keyed by (grantId:identifier)
  try {
    const details = req.data.authorization_details
      ? parseAuthorizationDetails(req.data.authorization_details)
      : [];
    if (Array.isArray(details) && details.length > 0) {
      const records = details.map((d: any, idx: number) => {
        const identifier = d.identifier || `${d.type_code || "detail"}-${idx}`;
        const id = `${grantId}:${identifier}`;
        const {
          type_code,
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
          request_ID: ID,
          type: type_code,
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
          ...rest,
        };
      });
      await this.upsert(records).into("com.sap.agent.grants.AuthorizationDetail");
      console.log(
        `✅ Upserted ${records.length} authorization_details for request ${ID} and grant ${grantId}`
      );
    }
  } catch (e) {
    console.warn("⚠️ Failed to upsert authorization_details on request:", e);
  }

  return {
    request_uri: `urn:ietf:params:oauth:request_uri:${ID}`,
    expires_in: 90,
  };
}

function parseAuthorizationDetails(authorization_details: string) {
  return JSON.parse(authorization_details)
    .filter(Boolean)
    .map(({ type, identifier, ...detail }: { type: string; identifier?: string; [key: string]: unknown }) => {
      return {
        type_code: type,
        identifier,
        ...detail,
      };
    });
}
