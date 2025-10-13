import cds from "@sap/cds";
import type GrantsManagementServiceType from "#cds-models/GrantsManagementService";

export type GrantManagementService = GrantsManagementServiceType &
  typeof cds.ApplicationService;
