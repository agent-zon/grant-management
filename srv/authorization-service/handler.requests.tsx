import cds from "@sap/cds";
import { ulid } from "ulid";
import type { AuthorizationService } from "./authorization-service.tsx";
import { AuthorizationRequests } from "#cds-models/sap/scai/grants/AuthorizationService";
import { Grants } from "#cds-models/sap/scai/grants/GrantsManagementService";

type PARRequest = {
  grant_id?: string;
  grant_management_action?: string;
  requested_actor?: string;
  subject?: string;
  authorization_details?: string;
  client_id?: string;
  scope?: string;
};

/**
 * Resolves the grant ID for a PAR request based on the grant_management_action.
 *
 * - If grant_id is explicitly provided, returns it unchanged.
 * - If action is "merge" without grant_id, looks up active grant for (subject, actor) pair.
 * - If action is "create" without grant_id, enforces one-grant-per-pair by auto-merging.
 * - Otherwise, generates a new grant ID.
 *
 * Returns { grantId, action } where action may be mutated from "create" to "merge".
 */
async function resolveGrantId(data: PARRequest): Promise<{
  grantId: string;
  action: string | undefined;
}> {
  const { grant_id, grant_management_action } = data;

  // CASE 1: grant_id explicitly provided — pass through
  if (grant_id) {
    return { grantId: grant_id, action: grant_management_action };
  }

  // Resolve subject and actor from JWT for grant lookup
  const token = (cds.context?.user as any)?.authInfo?.token?.payload;
  const subject = data.subject || cds.context?.user?.id;
  const actor =
    token?.act?.sub || // RFC 8693 token exchange → actor claim
    token?.actor || // IAS-specific actor claim
    token?.azp || // client credentials → the client IS the agent
    data.client_id; // fallback: client_id identifies the agent when no JWT

  // Only attempt lookup if we have both subject and actor
  if (subject && actor && (grant_management_action === "merge" || grant_management_action === "create")) {
    // Query DB directly to bypass service-layer LIST handler
    const activeGrants = await cds.run(
      SELECT.from(Grants)
        .where({ subject, actor, status: "active" })
        .orderBy("modifiedAt desc")
    );

    if (activeGrants.length > 1) {
      console.warn(
        `⚠️ Multiple active grants found for subject=${subject}, actor=${actor}. Using most recent.`
      );
    }

    if (activeGrants.length > 0) {
      const existingId = activeGrants[0].id;
      console.log(`🔗 Auto-resolved grant ${existingId} for (${subject}, ${actor})`);

      // CASE 2: merge — use existing grant
      // CASE 3: create — auto-merge into existing (enforce one-grant-per-pair)
      return {
        grantId: existingId,
        action: grant_management_action === "create" ? "merge" : grant_management_action,
      };
    }
  }

  // CASE 2/3 (no existing grant) or CASE 4 (replace / no action)
  return { grantId: `gnt_${ulid()}`, action: grant_management_action };
}

export default async function push(
  this: AuthorizationService,
  req: cds.Request<PARRequest>
) {
  // Resolve grant ID: auto-lookup for merge/create, passthrough if explicit
  const { grantId, action } = await resolveGrantId(req.data);
  console.log(
    `🔑 Grant ID for request: ${grantId} (action: ${action ?? "none"})`
  );

  // Create authorization request linked to grant
  const { ID } = await this.insert({
    ...req.data,
    grant_id: grantId,
    grant_management_action: action,
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
  return JSON.parse(authorization_details)
    .filter(Boolean)
    .map(({ type, ...detail }: { type: string; [key: string]: unknown }) => {
      return {
        type_code: type,
        ...detail,
      };
    });
}
