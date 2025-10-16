import type {
  RARClaim,
  AuthorizationDetailRequest,
} from "#cds-models/com/sap/agent/grants";

export type AuthorizationDetailProps = AuthorizationDetailRequest & {
  index: number;
  description: string;
  riskLevel: "low" | "medium" | "high";
  category: string;
  type_code: string;
  permissions?: Record<string, RARClaim | null>;
  tools?: Record<string, RARClaim | null>;
};

// declare module "#cds-models/com/sap/agent/grants" {
//   interface AuthorizationDetailRequest {
//     tools?: Record<string, RARClaim | null>;
//     permissions?: Record<string, RARClaim | null>;
//   }
// }
