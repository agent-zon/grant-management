import cds from "@sap/cds";
import { ulid } from "ulid";
import type { AuthorizationService } from "../authorization-service.tsx";
import {
  Grants,
  AuthorizationRequests,
} from "#cds-models/AuthorizationService";

export default async function token(
  this: AuthorizationService,
  req: cds.Request<{ grant_type: string; code: string }>
) {
  console.log("🔐 Token request:", req.data);
  const { grant_type, code } = req.data;

  // Validate grant type
  if (grant_type !== "authorization_code") {
    return req.error(400, "unsupported_grant_type");
  }

  const request = (await cds.read(AuthorizationRequests, code)) as any;
  console.log("🔐 Request:", request);

  console.log("🔧 Grant Management Service:", req.user);
  // Read the grant first
  const grant = (await this.read(Grants, request?.grant_id)) as any;

  // Manually fetch authorization_details for this grant
  if (grant) {
    const authDetails = await cds
      .read("com.sap.agent.grants.AuthorizationDetail")
      .where(`consent.grant_id = '${request.grant_id}'`);
    (grant as any).authorization_details = authDetails || [];
    console.log(
      `🔧 Fetched ${authDetails?.length || 0} authorization details for grant ${request.grant_id}`
    );
  }

  console.log("🔧 Grant with authorization_details:", grant);

  if (!grant) {
    return req.error(400, "invalid_grant");
  }
  console.log("token response", {
    access_token: `at_${ulid()}:${request.grant_id}`,
    token_type: "Bearer",
    expires_in: 3600,
    scope: (grant as any).scope,
    grant_id: request.grant_id,
    authorization_details: (grant as any).authorization_details,
    actor: (grant as any).actor,
  });

  return {
    access_token: `at_${ulid()}:${request.grant_id}`,
    token_type: "Bearer",
    expires_in: 3600,
    scope: (grant as any).scope || "",
    grant_id: request.grant_id,
    authorization_details: (grant as any).authorization_details,
    actor: (grant as any).actor,
  };
}
