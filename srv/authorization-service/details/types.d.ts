import { AuthorizationDetailType } from "#cds-models/AuthorizationService";
import {
  RARClaim,
  AuthorizationDetailRequest,
} from "#cds-models/grant/management";

export type AuthorizationDetailProps = typeof AuthorizationDetailRequest & {
  index: number;
  description: string;
  riskLevel: "low" | "medium" | "high";
  category: string;
};

declare module "#cds-models/grant/management" {
  interface AuthorizationDetailRequest extends AuthorizationDetailRequest {
    type: AuthorizationDetailType["code"];
    tools?: Record<string, RARClaim | null>;
    permissions?: Record<string, RARClaim | null>;
  }
}


