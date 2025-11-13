import cds from "@sap/cds";
import type { EvaluationService } from "./evaluation-service.tsx";
import GrantsManagementService from "#cds-models/sap/scai/grants/GrantsManagementService";
import {
  extractServerLocation,
  extractResourceType,
  findAuthorizingGrant,
} from "./utils/grant-matcher.tsx";
import evaluation from "./handler.evaluation.tsx";

type EvaluationRequest = {
  subject?: { type: string; id: string; properties?: any };
  action?: { name: string; properties?: any };
  resource?: { type: string; id: string; properties?: any };
  context?: any;
};

/**
 * Access Evaluations API Handler
 * Implements AuthZEN spec Section 7: Access Evaluations API
 * Supports batch evaluation with default values and evaluation semantics
 */
export default async function evaluations(
  this: EvaluationService,
  req: cds.Request<{
    subject?: { type: string; id: string; properties?: any };
    action?: { name: string; properties?: any };
    resource?: { type: string; id: string; properties?: any };
    context?: any;
    evaluations?: EvaluationRequest[];
    options?: { evaluations_semantic?: string };
  }>
) {
  console.log("🔍 Evaluations request:", req.data);

  try {
    const {
      subject,
      action,
      resource,
      context,
      evaluations: evalArray,
      options,
    } = req.data;

    // If no evaluations array, treat as single evaluation (backwards compatible)
    if (!evalArray || evalArray.length === 0) {
      // Delegate to single evaluation handler
      const singleReq = {
        ...req,
        data: { subject, action, resource, context },
      } as any;
      const result = await evaluation.call(this, singleReq);
      return {
        evaluations: [result],
      };
    }

    // Extract client_id from authenticated user context
    const tokenPayload = req.user?.authInfo?.token?.payload as any;
    const clientId =
      tokenPayload?.client_id || tokenPayload?.azp || context?.client_id;

    if (!clientId) {
      const error = cds.error("Missing client_id in request context", {
        code: 401,
      });
      cds.context?.http?.res?.status(401);
      throw error;
    }

    // Connect to grant management service
    const grantService = await cds.connect.to(GrantsManagementService);

    // Determine evaluation semantic
    const semantic = options?.evaluations_semantic || "execute_all";

    const results: any[] = [];

    // Process each evaluation
    for (const evalReq of evalArray) {
      // Merge with defaults
      const mergedSubject = evalReq.subject || subject;
      const mergedAction = evalReq.action || action;
      const mergedResource = evalReq.resource || resource;
      const mergedContext = { ...context, ...evalReq.context };

      // Validate required fields
      if (!mergedSubject?.id || !mergedAction?.name || !mergedResource?.id) {
        results.push({
          decision: false,
          context: {
            error:
              "Missing required fields: subject.id, action.name, resource.id",
          },
        });
        if (semantic === "deny_on_first_deny") {
          break; // Short-circuit on first deny
        }
        continue;
      }

      // Parse resource URI
      const resourceUri = mergedResource.id;
      const serverLocation = extractServerLocation(resourceUri);
      const resourceType = extractResourceType(resourceUri);
      const actualResourceType = mergedResource.type || resourceType;
      const resourceId = mergedResource.id;

      // Find authorizing grant
      const result = await findAuthorizingGrant(
        grantService,
        clientId,
        mergedSubject.id,
        serverLocation,
        mergedAction.name,
        actualResourceType,
        resourceId
      );

      if (result) {
        results.push({
          decision: true,
          context: {
            grant_id: result.grant_id,
            message: `Access granted for resource: ${resourceUri}`,
          },
          grant_id: result.grant_id,
        });
        if (semantic === "permit_on_first_permit") {
          break; // Short-circuit on first permit
        }
      } else {
        results.push({
          decision: false,
          context: {
            reason: `No valid authorization found for resource: ${resourceUri}`,
          },
        });
        if (semantic === "deny_on_first_deny") {
          break; // Short-circuit on first deny
        }
      }
    }

    return { evaluations: results };
  } catch (error: any) {
    console.error("❌ Evaluations error:", error);
    const httpError = cds.error(error.message || "Internal server error", {
      code: error.code || 500,
    });
    cds.context?.http?.res?.status(error.status || 500);
    throw httpError;
  }
}
