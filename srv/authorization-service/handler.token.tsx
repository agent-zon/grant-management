import cds  from "@sap/cds";
import { ulid } from "ulid";
import type { AuthorizationService } from "./authorization-service.tsx";
import GrantsManagementService, {
  AuthorizationDetail
} from "#cds-models/sap/scai/grants/GrantsManagementService";

import {
  AuthorizationRequest,
  AuthorizationRequests,
  Consents, Grant,
  Grants
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
  
  const grantManagement = await cds.connect.to(GrantsManagementService);
  const { scope, actor,id,...data} =await this.read(Grants, grant_id) as Grant;
  const authorization_details = await grantManagement.run(
      cds.ql.SELECT.from(AuthorizationDetail).where({'consent.grant_id':grant_id})
  ); 

  console.log("token response", {
    scope: scope || "",
    grant_id: grant_id,
    authorization_details: authorization_details,
    actor: actor ,
    found_grant:id,
    data
  });

  return {
    access_token: `at_${ulid()}:${grant_id}`,
    token_type: "Bearer",
    expires_in: 3600,
    scope: scope || "",
    grant_id: grant_id,
    authorization_details: authorization_details,
    actor: actor,
  };
}


