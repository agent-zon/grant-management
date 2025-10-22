// Grant Detail Service - CDS service that serves individual grant UI directly
import cds from "@sap/cds";
import { LIST } from "./grant-management/handler.list.tsx";
import { GET, POST } from "./grant-management/handler.edit.tsx";
import { DELETE } from "./grant-management/handler.revoke.tsx";
import { Grants, Consents, Grant } from "#cds-models/GrantsManagementService";

// CDS ApplicationService for Grant Detail with path parameter support
export default class Service extends cds.ApplicationService {
  init() {
    // Register grant handlers
    this.on("DELETE", Grants, DELETE);
    this.on("UPDATE", Grants, POST);
    this.on("GET", Grants, LIST);
    this.on("GET", Grants, GET);
    return super.init();
  }
}

export type GrantsManagementService = Service & typeof cds.ApplicationService;

export type GrantHandler = cds.CRUDEventHandler.On<Grant, void | Grant | Error>;

export type GrantsHandler = cds.CRUDEventHandler.On<
  Grants,
  void | Grants | Error
>;
