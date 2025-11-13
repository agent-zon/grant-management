import cds from "@sap/cds";
import GrantsManagementService, {
  AuthorizationDetails,
  Consents,
  Grants,
  type AuthorizationDetail,
} from "#cds-models/sap/scai/grants/GrantsManagementService";

/**
 * Extract server location from resource URI
 * Examples:
 * - "https://mcp.example.com/tools" -> "https://mcp.example.com"
 * - "https://api.example.com/v1/resources" -> "https://api.example.com"
 */
export function extractServerLocation(resourceUri: string): string {
  try {
    const uri = new URL(resourceUri);
    return `${uri.protocol}//${uri.host}`;
  } catch (e) {
    // If not a valid URI, treat the whole string as server location
    return resourceUri;
  }
}

/**
 * Extract resource type/identifier from resource URI
 * Examples:
 * - "https://mcp.example.com/tools" -> "tools"
 * - "https://api.example.com/v1/resources" -> "resources"
 * - "tools" -> "tools" (fallback for non-URI resources)
 */
export function extractResourceType(resourceUri: string): string {
  try {
    const uri = new URL(resourceUri);
    const path = uri.pathname;
    if (path && path.length > 1) {
      const segments = path.substring(1).split("/");
      if (segments.length > 0 && segments[segments.length - 1]) {
        return segments[segments.length - 1]; // Use last segment as resource type
      }
    }
    return "default";
  } catch (e) {
    // If not a valid URI, treat the whole string as resource type
    return resourceUri;
  }
}

/**
 * Find authorizing grant by querying authorization_details directly
 * @param grantService - GrantsManagementService instance
 * @param clientId - Client ID from authenticated request
 * @param subjectId - Subject ID from request
 * @param serverLocation - Server location extracted from resource URI
 * @param actionName - Action name from request
 * @param resourceType - Resource type/identifier extracted from resource URI
 * @param resourceId - Resource ID (e.g., tool name for MCP)
 * @returns Matching authorization detail with grant_id, or null
 */
export async function findAuthorizingGrant(
  grantService: GrantsManagementService,
  clientId: string,
  subjectId: string,
  serverLocation: string,
  actionName: string,
  resourceType: string,
  resourceId?: string
): Promise<{ grant_id: string; detail: AuthorizationDetail } | null> {
  // Query authorization_details directly - query by type first
  const typeFilter = resourceType === "mcp" ? "mcp" : resourceType;
  const allDetails = await grantService.run(
    cds.ql.SELECT.from(AuthorizationDetails).where({ type: typeFilter })
  );

  // Also query MCP type if we're checking for MCP resources
  let mcpDetails: any[] = [];
  if (resourceType !== "mcp" && typeFilter !== "mcp") {
    mcpDetails = await grantService.run(
      cds.ql.SELECT.from(AuthorizationDetails).where({ type: "mcp" })
    );
  }

  const allDetailsCombined = [...allDetails, ...mcpDetails];

  // For each detail, query associated consent, grant, and request
  for (const detail of allDetailsCombined) {
    // Check type match
    if (detail.type !== resourceType && detail.type !== "mcp") {
      continue;
    }

    // Check server/location match
    if (detail.type === "mcp") {
      if (detail.server !== serverLocation) {
        continue;
      }
    } else {
      // For other types, check locations array
      const locations = detail.locations || [];
      if (!locations.includes(serverLocation)) {
        continue;
      }
    }

    // Check action match
    const actions = detail.actions || [];
    if (!actions.includes(actionName)) {
      continue;
    }

    // Check resource/tool match
    if (detail.type === "mcp") {
      // For MCP, check tools map
      const tools = detail.tools || {};
      if (resourceId && !tools[resourceId]) {
        continue;
      }
    } else {
      // For other types, check resources array
      const resources = detail.resources || [];
      if (resourceId && !resources.includes(resourceId)) {
        continue;
      }
    }

    // Query associated consent to verify client_id and subject
    // AuthorizationDetails has consent association with consent_grant_id field
    const grantId = detail.consent_grant_id;
    if (!grantId) continue;

    const consent = await grantService.run(
      cds.ql.SELECT.one.from(Consents).where({ grant_id: grantId })
    );

    if (!consent) continue;

    // Verify subject matches
    if (consent.subject !== subjectId) {
      continue;
    }

    // Query associated request to verify client_id
    const request = await grantService.run(
      cds.ql.SELECT.one.from("sap.scai.grants.AuthorizationRequests").where({
        ID: consent.request_ID,
      })
    );

    if (!request) continue;

    // Verify client_id matches
    if (request.client_id !== clientId) {
      continue;
    }

    // Query associated grant to verify status
    const grant = await grantService.run(
      cds.ql.SELECT.one.from(Grants).where({ id: consent.grant_id })
    );

    if (!grant) continue;

    // Verify grant is active
    if (grant.status !== "active") {
      continue;
    }

    // All checks passed - return matching grant
    return {
      grant_id: consent.grant_id,
      detail: detail,
    };
  }

  return null;
}

