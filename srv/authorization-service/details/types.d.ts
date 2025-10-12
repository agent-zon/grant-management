import { AuthorizationDetailType } from "#cds-models/AuthorizationService";
import {
  RARClaim,
  AuthorizationDetailRequest,
} from "#cds-models/grant/management";

declare module "#cds-models/grant/management" {
  interface AuthorizationDetailRequest extends AuthorizationDetailRequest {
    type: AuthorizationDetailType["code"];
    tools?: Record<string, RARClaim | null>;
    permissions?: Record<string, RARClaim | null>;
  }
}
