// Grant Detail Service - CDS service that serves individual grant UI directly
import cds from "@sap/cds";
import {LIST} from "./handler.list.tsx";
import {GET, POST} from "./handler.edit.tsx";
import {DELETE} from "./handler.revoke.tsx";
import {Grant, Grants} from "#cds-models/sap/scai/grants/GrantsManagementService";

// CDS ApplicationService for Grant Detail with path parameter support
export default class Service extends cds.ApplicationService {
  init() {
    // Register grant handlers
    this.on("DELETE", Grants, DELETE);
    this.on("UPDATE", Grants, POST);
    this.on("GET", Grants, this.Expand);
    this.on("GET", Grants, LIST);
    this.on("GET", Grants, GET);
    return super.init();
  }

  private async Expand(
      ...[req, next]: Parameters<GrantsHandler>
  ){
    req.data["$expand"] = [
      ...(req.data["$expand"]?.split(",") || []),
      "authorization_details",
      "consents",
    ]
        .filter(unique)
        .join(",");
    console.log("Expanding grant details for request:", req.query.SELECT);

    return next(req);
  }
}

export type GrantsManagementService = Service & typeof cds.ApplicationService;

export type GrantHandler = cds.CRUDEventHandler.On<Grant, void | Grant | Error>;

export type GrantsHandler = cds.CRUDEventHandler.On<
  Grants,
  void | Grants | Error
>;


function unique<T>(value: T, index: number, array: T[]): value is T {
  return array.indexOf(value) === index;
}