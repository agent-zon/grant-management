import type {
  RARClaim,
  AuthorizationDetailRequest,
} from "#cds-models/sap/scai/grants";

export type AuthorizationDetailProps = AuthorizationDetailRequest & {
  index: number;
  riskLevel?: "low" | "medium" | "high";
  description?: string;
  category?: string;
  permissions?: Record<string, RARClaim | null>;
};

// declare module "#cds-models/com/sap/agent/grants" {
//   interface AuthorizationDetailRequest {
//     tools?: Record<string, RARClaim | null>;
//     permissions?: Record<string, RARClaim | null>;
//   }
// }
