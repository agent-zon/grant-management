import {Grant, Grants} from "#cds-models/sap/scai/grants/GrantsManagementService";
import {isNativeError} from "node:util/types";

export function isGrant(grant: Grants | Grant | null): grant is Grant {
  return !!grant && !isNativeError(grant) && Object.hasOwn(grant, "id");
}