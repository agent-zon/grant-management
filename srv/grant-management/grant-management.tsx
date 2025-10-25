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
    // Handle entity GET before collection GET to ensure single-entity requests resolve
    this.on("GET", Grants, GET);
    this.on("GET", Grants, LIST);
    // Fallback for single READs to avoid 404s when UI hooks interfere
    this.on("READ", Grants, async (req, next) => {
      if (req.query.SELECT?.one) {
        let id = req.data?.id as string | undefined;
        if (!id || id === "undefined") {
          // Fallback to most recent grant from consents
          const lastConsent = await cds.run(
            cds.ql.SELECT.one.from("sap.scai.grants.Consents").orderBy("createdAt desc")
          );
          if (lastConsent?.grant_id) id = lastConsent.grant_id as string;
        }
        if (id) {
          console.log("[READ Grants] resolving id:", id);
          const row = await cds.run(
            cds.ql.SELECT.one.from("sap.scai.grants.Grants").where({ id })
          );
          if (row) {
            console.log("[READ Grants] found Grants row");
            return { authorization_details: [], consents: [], ...row } as any;
          }
          const reqRow = await cds.run(
            cds.ql.SELECT.one
              .from("sap.scai.grants.AuthorizationRequests")
              .where({ grant_id: id })
          );
          if (reqRow) {
            console.log("[READ Grants] synthesizing from AuthorizationRequests");
            return {
              id,
              client_id: reqRow.client_id,
              status: "active",
              authorization_details: [],
              consents: [],
            } as any;
          }
          // Fallback: derive from latest consent when no grant/request row exists
          const consentRow = await cds.run(
            cds.ql.SELECT.one
              .from("sap.scai.grants.Consents")
              .where({ grant_id: id })
              .orderBy("createdAt desc")
          );
          if (consentRow) {
            console.log("[READ Grants] synthesizing from Consents");
            return {
              id,
              client_id: consentRow.client_id,
              status: "active",
              scope: consentRow.scope,
              authorization_details: [],
              consents: [],
            } as any;
          }
          console.log("[READ Grants] no data found for id", id);
        }
      }
      return next(req);
    });
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