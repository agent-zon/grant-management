// Grant Detail Service - CDS service that serves individual grant UI directly
import React from "react";
import { renderToString } from "react-dom/server";
import cds from "@sap/cds";
import grantList from "./grant-management/handler.list.tsx";
import grantEdit from "./grant-management/handler.edit.tsx";
import grantRevoke from "./grant-management/handler.revoke.tsx";

function NotFound() {
  return <div>Grant not found</div>;
}

// CDS ApplicationService for Grant Detail with path parameter support
class GrantsManagementService extends cds.ApplicationService {
  init() {
    const { Grants, AuthorizationDetail } = this.entities;

    // Auto-expand authorization_details for all Grants READ operations
    this.before("READ", Grants, (req: typeof cds.Request) => {
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
    });

    grantRevoke(this);
    grantList(this);
    grantEdit(this);

    return super.init && super.init();

    /*
    not in use now, to check - which one is better?  register to events in service and call the fucntion or use the functions to register themself?
    this.after("READ", Grants, async function (data, req) {
      if(req.data.ID ) {
        return grantEdit(data[0], req);
      }
      return grantList(data, req);
    });

    this.after("UPDATE", Grants, async function (data, req) {
      return grantEdit(data[0], req);
    });
   */
  }
}

export default GrantsManagementService;
