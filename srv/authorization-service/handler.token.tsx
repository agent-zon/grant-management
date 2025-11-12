import cds  from "@sap/cds";
import { ulid } from "ulid";
import type { AuthorizationService } from "./authorization-service.tsx";
// Avoid calling GrantsManagementService within this HTTP request to prevent UI rendering side-effects.

import {
  AuthorizationDetails,
  AuthorizationRequest,
  AuthorizationRequests, Grants,
} from "#cds-models/sap/scai/grants/AuthorizationService";

export default async function token(
  this: AuthorizationService,
  req: cds.Request<{ grant_type: string; code: string }>
) {
  console.log("🔐 Token request:", req.data);
  const { grant_type, code } = req.data;

  if (grant_type !== "authorization_code") {
    return req.error(400, "unsupported_grant_type");
  }
  const {grant_id} = await this.read(AuthorizationRequests,code) as AuthorizationRequest;
  if (!grant_id) {
    return req.error(400, "invalid_grant");
  }
  
  // Read grant directly from DB model to avoid triggering UI GET handlers
  const grantRecord = await cds.run(
    cds.ql.SELECT.one.from(Grants).where({ id: grant_id })
  );
  if (!grantRecord) return req.error(400, "invalid_grant");
  const scope = grantRecord.scope || "";
  const actor = grantRecord.actor;

  // Fetch authorization details from DB by consent foreign key
  const authorization_details = await cds.run(
    cds.ql.SELECT.from(AuthorizationDetails).where({ consent_grant_id: grant_id })
  );

  console.log("token response", {
    scope,
    grant_id,
    authorization_details,
    actor,
  });

  return {
    access_token: `at_${ulid()}:${grant_id}`,
    token_type: "Bearer",
    expires_in: 3600,
    scope,
    grant_id,
    authorization_details,
    actor,
  };
}


