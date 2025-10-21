// Grant Detail Service - CDS service that serves individual grant UI directly
import cds from "@sap/cds";
import { LIST } from "./grant-management/handler.list.tsx";
import { GET, POST } from "./grant-management/handler.edit.tsx";
import { DELETE } from "./grant-management/handler.revoke.tsx";
import { Grants, Consents, Grant } from "#cds-models/GrantsManagementService";

// CDS ApplicationService for Grant Detail with path parameter support
export default class Service extends cds.ApplicationService {
  init() {
    // Auto-expand authorization_details for all Grants READ operations
    super.before("READ", Grants, (req) => {
      console.log(
        "🔧 Before READ Grants - Original query:",
        JSON.stringify(req.query, null, 2)
      );

      // Add $expand parameter if not present
      if (
        !req.query["$expand"] ||
        !req.query["$expand"].includes("authorization_details")
      ) {
        if (!req.query["$expand"]) {
          req.query["$expand"] = "authorization_details";
        } else {
          req.query["$expand"] += ",authorization_details";
        }
        console.log(
          "🔧 Added authorization_details expansion:",
          req.query["$expand"]
        );
      }
      return req.data;
    });

    // Register grant handlers
    this.on("DELETE", Grants, DELETE);
    this.on("POST", Grants, POST);

    this.on("GET", Grants, LIST);
    this.after("GET", Grants, GET);
    return super.init();
  }
}

export type GrantsManagementService = Service & typeof cds.ApplicationService;

export type GrantHandler = cds.CRUDEventHandler.On<Grant, void | Grant | Error>;

export type GrantsHandler = cds.CRUDEventHandler.On<
  Grants,
  void | Grants | Error
>;
