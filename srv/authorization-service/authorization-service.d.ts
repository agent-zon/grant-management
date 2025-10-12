import cds from "@sap/cds";
import type AuthorizationServiceType from "#cds-models/AuthorizationService";

export type AuthorizationService = AuthorizationServiceType &
  typeof cds.ApplicationService;
