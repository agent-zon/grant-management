import cds from "@sap/cds";
import type { EvaluationService } from "./evaluation-service.tsx";

/**
 * Policy Decision Point Metadata Handler
 * Implements AuthZEN spec Section 9: Policy Decision Point Metadata
 */
export default function metadata(this: EvaluationService, req: cds.Request) {
  console.log("📋 Metadata request");

  const host = req.headers["x-forwarded-host"] || req.http?.req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || req.http?.req.protocol || "https";
  const baseUrl = `${protocol}://${host}`;

  return {
    policy_decision_point: baseUrl,
    access_evaluation_endpoint: `${baseUrl}/access/v1/evaluation`,
    access_evaluations_endpoint: `${baseUrl}/access/v1/evaluations`,
    // Search endpoints not implemented yet
    // search_subject_endpoint: `${baseUrl}/access/v1/search/subject`,
    // search_resource_endpoint: `${baseUrl}/access/v1/search/resource`,
    // search_action_endpoint: `${baseUrl}/access/v1/search/action`,
    capabilities: [],
  };
}

