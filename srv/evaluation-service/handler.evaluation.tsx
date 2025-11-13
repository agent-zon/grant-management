import cds from "@sap/cds";
import type { EvaluationService } from "./evaluation-service.tsx";
import GrantsManagementService from "#cds-models/sap/scai/grants/GrantsManagementService";
import {
  extractServerLocation,
  extractResourceType,
  findAuthorizingGrant,
} from "./utils/grant-matcher.tsx";

/**
 * Access Evaluation API Handler
 * Implements AuthZEN spec Section 6: Access Evaluation API
 */
export default async function evaluation(
  this: EvaluationService,
  req: cds.Request<{
    subject: { type: string; id: string; properties?: any };
    action: { name: string; properties?: any };
    resource: { type: string; id: string; properties?: any };
    context?: any;
  }>
) {
  console.log("🔍 Evaluation request:", req.data);

  try {
    // Extract request parameters
    const { subject, action, resource, context } = req.data;

    // Validate required fields
    if (!subject?.id || !action?.name || !resource?.id) {
      const error = cds.error(
        "Missing required fields: subject.id, action.name, resource.id",
        {
          code: 400,
        }
      );
      cds.context?.http?.res?.status(400);
      throw error;
    }

    // Extract client_id from authenticated user context
    const tokenPayload = req.user?.authInfo?.token?.payload as any;
    const clientId =
      tokenPayload?.client_id ||
      tokenPayload?.azp ||
      req.data?.context?.client_id;

    if (!clientId) {
      const error = cds.error("Missing client_id in request context", {
        code: 401,
      });
      cds.context?.http?.res?.status(401);
      throw error;
    }

    // Parse resource URI to extract server location and resource type
    const resourceUri = resource.id;
    let serverLocation = extractServerLocation(resourceUri);

    // If resource.id is not a URI (e.g., just a tool name), use server from context
    if (serverLocation === resourceUri && context?.server) {
      serverLocation = context.server;
    }

    const resourceType = extractResourceType(resourceUri);

    // For MCP type, resource.id might be the tool name
    // For other types, use resource.type or resource.id
    const actualResourceType = resource.type || resourceType;
    const resourceId = resource.id;

    console.log("🔍 Evaluation params:", {
      clientId,
      subjectId: subject.id,
      serverLocation,
      actionName: action.name,
      resourceType: actualResourceType,
      resourceId,
    });

    // Connect to grant management service
    const grantService = await cds.connect.to(GrantsManagementService);

    // Find authorizing grant by querying authorization_details directly
    const result = await findAuthorizingGrant(
      grantService,
      clientId,
      subject.id,
      serverLocation,
      action.name,
      actualResourceType,
      resourceId
    );

    if (result) {
      console.log("✅ Access granted:", result.grant_id);
      return {
        decision: true,
        context: {
          grant_id: result.grant_id,
          message: `Access granted based on valid authorization details for resource: ${resourceUri}`,
        },
        grant_id: result.grant_id,
      };
    } else {
      console.log("❌ Access denied: No matching authorization found");
      return {
        decision: false,
        context: {
          reason: `No valid authorization found for the requested access on resource: ${resourceUri}`,
        },
      };
    }
  } catch (error: any) {
    console.error("❌ Evaluation error:", error);
    const httpError = cds.error(error.message || "Internal server error", {
      code: error.code || 500,
    });
    cds.context?.http?.res?.status(error.status || 500);
    throw httpError;
  }
}
