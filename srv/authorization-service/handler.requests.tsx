import cds from "@sap/cds";
import type { AuthorizationService } from "./authorization-service.tsx";
import { AuthorizationRequests } from "#cds-models/sap/scai/grants/AuthorizationService";

type PARRequest = {
  grant_id?: string;
  grant_management_action?: string;
  requested_actor?: string;
  subject?: string;
  authorization_details?: string;
  client_id?: string;
  scope?: string;
};

export default async function push(
  this: AuthorizationService,
  req: cds.Request<PARRequest>
) {
  console.log(
    `🔑 PAR request (action: ${req.data.grant_management_action ?? "none"}, grant_id: ${req.data.grant_id ?? "deferred"})`
  );

  // Store the request as-is — grant resolution happens at authorize time
  // when the resource owner's identity is known.
  const { ID } = await this.insert({
    ...req.data,
    access: req.data.authorization_details
      ? parseAuthorizationDetails(req.data.authorization_details)
      : [],
  }).into(AuthorizationRequests);

  console.log("Request created", ID);

  return {
    request_uri: `urn:ietf:params:oauth:request_uri:${ID}`,
    expires_in: 90,
  };
}

function parseAuthorizationDetails(authorization_details: string) {
  const details = JSON.parse(authorization_details).filter(Boolean);

  for (const detail of details) {
    if (!detail.type) {
      throw new Error(`Authorization detail missing required field 'type'`);
    }
  }

  return details.map(
    ({ type, ...detail }: { type: string; [key: string]: unknown }) => ({
      type_code: type,
      ...detail,
    })
  );
}
