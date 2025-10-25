import cds from "@sap/cds";
import type { AuthorizationService } from "../authorization-service";
import {
  AuthorizationRequests,
  Consents,
  Consent,
  Grants,
} from "#cds-models/AuthorizationService";
import { isNativeError } from "node:util/types";

type ConsentHandler = cds.CRUDEventHandler.On<Consent, void | Consent | Error>;

export async function POST(
  this: AuthorizationService,
  req: Parameters<ConsentHandler>[0],
  next: Parameters<ConsentHandler>[1]
) {
  req.data.previous_consent = await getPreviousConsent(this, req.data.grant_id);
  console.log("🔐 Creating consent:", req.data);
  // Extract any posted authorization_details payload for manual processing
  const postedAuthDetails = (req.data as any)?.authorization_details as
    | any[]
    | string
    | undefined;
  // Prevent auto-CRUD from trying to persist nested authorization_details on Consents (no longer modeled)
  if (postedAuthDetails) {
    delete (req.data as any).authorization_details;
  }

  const consent = await next(req);

  // Upsert AuthorizationDetail rows using Identifier + Grant relations
  if (consent && !isNativeError(consent)) {
    const request = (await this.read(
      AuthorizationRequests,
      consent.request_ID
    )) as any;

    // Merge granted scope into Grants.scope (union semantics)
    try {
      const grantRow = (await this.read(Grants, consent.grant_id)) as any;
      const currentScopes = (grantRow?.scope || "").split(/\s+/).filter(Boolean);
      const newScopes = String(consent.scope || "")
        .split(/\s+/)
        .filter(Boolean);
      const merged = Array.from(new Set([...currentScopes, ...newScopes])).join(
        " "
      );
      await this.update(Grants, consent.grant_id).with({ scope: merged });
    } catch (e) {
      console.warn("⚠️ Failed to merge scopes for grant", consent.grant_id, e);
    }

    // Determine details source: posted payload takes precedence, otherwise use PAR-stored access
    let details: any[] = [];
    try {
      if (Array.isArray(postedAuthDetails)) details = postedAuthDetails;
      else if (typeof postedAuthDetails === "string")
        details = JSON.parse(postedAuthDetails);
    } catch (e) {
      console.warn("⚠️ Failed to parse posted authorization_details:", e);
    }
    if (!details?.length && Array.isArray(request?.access)) {
      details = request.access;
    }

    const grantId = consent.grant_id;
    const requestId = consent.request_ID;

    if (Array.isArray(details) && details.length > 0) {
      const records = details.map((d: any, idx: number) => {
        // Prefer explicit identifier; fallback to a stable synthetic one
        const identifier = d.identifier || `${d.type || "detail"}-${idx}`;
        const id = `${grantId}:${identifier}`;
        const {
          type,
          actions,
          locations,
          tools,
          roots,
          databases,
          schemas,
          tables,
          urls,
          protocols,
          permissions,
          permissions_read,
          permissions_write,
          permissions_execute,
          permissions_delete,
          permissions_list,
          permissions_create,
          ...rest
        } = d || {};
        const mergedPermissions =
          permissions ||
          (typeof permissions_read === "boolean" ||
          typeof permissions_write === "boolean" ||
          typeof permissions_execute === "boolean" ||
          typeof permissions_delete === "boolean" ||
          typeof permissions_list === "boolean" ||
          typeof permissions_create === "boolean"
            ? {
                read: Boolean(permissions_read),
                write: Boolean(permissions_write),
                execute: Boolean(permissions_execute),
                delete: Boolean(permissions_delete),
                list: Boolean(permissions_list),
                create: Boolean(permissions_create),
              }
            : undefined);
        return {
          id,
          identifier,
          grant_ID: grantId,
          request_ID: requestId,
          type,
          actions,
          locations,
          tools,
          roots,
          databases,
          schemas,
          tables,
          urls,
          protocols,
          permissions: mergedPermissions,
          ...rest,
        };
      });

      // Upsert will create or replace by key(id)
      await this.upsert(records).into("com.sap.agent.grants.AuthorizationDetail");
      console.log(
        `✅ Upserted ${records.length} authorization_details for grant ${grantId}`
      );

      // Flattened permissions
      const flatPermissions = buildPermissionsFromDetails(grantId, details);
      if (flatPermissions.length > 0) {
        await this.delete("com.sap.agent.grants.Permissions").where({ grant_id: grantId });
        await this.upsert(flatPermissions).into("com.sap.agent.grants.Permissions");
        console.log(`✅ Upserted ${flatPermissions.length} flattened permissions for grant ${grantId}`);
      }
    }

    // Redirect to client with code
    cds.context?.http?.res.redirect(
      `${request?.redirect_uri}?code=${consent.request_ID}`
    );
  }
  return consent;
}

async function getPreviousConsent(srv: AuthorizationService, grant_id: string) {
  const previousConsents = await srv.run(
    cds.ql.SELECT.from(Consents)
      .where({ grant_id })
      .orderBy("createdAt desc")
      .limit(1)
  );

  return previousConsents[0];
}

function buildPermissionsFromDetails(
  grantId: string,
  details: Array<any>
) {
  const rows: Array<{ grant_id: string; resource_identifier: string; attribute: string; value: string }> = [];

  const push = (resource_identifier: string, attribute: string, value: unknown) => {
    if (value === undefined || value === null) return;
    rows.push({
      grant_id: grantId,
      resource_identifier,
      attribute,
      value: typeof value === "string" ? value : JSON.stringify(value),
    });
  };

  const arrayAttrMap: Record<string, string> = {
    actions: "action",
    locations: "location",
    roots: "root",
    urls: "url",
    protocols: "protocol",
    databases: "database",
    schemas: "schema",
    tables: "table",
  };

  details.forEach((d: any, idx: number) => {
    const identifier = d.identifier || `${d.type || "detail"}-${idx}`;
    const type = d.type;
    if (type) push(identifier, "type", String(type));

    Object.entries(arrayAttrMap).forEach(([key, singular]) => {
      const arr = d[key];
      if (Array.isArray(arr)) {
        arr.filter((v) => v !== undefined && v !== null).forEach((v) => push(identifier, singular, v));
      }
    });

    if (d.tools && typeof d.tools === "object") {
      Object.entries(d.tools).forEach(([k, v]) => {
        const val = typeof v === "object" && v !== null ? (v as any).essential ?? v : v;
        push(identifier, `tool:${k}`, val as any);
      });
    }
    if (d.permissions && typeof d.permissions === "object") {
      Object.entries(d.permissions).forEach(([k, v]) => {
        const val = typeof v === "object" && v !== null ? (v as any).essential ?? v : v;
        push(identifier, `permission:${k}`, val as any);
      });
    }
  });

  const dedup = new Map<string, typeof rows[number]>();
  for (const r of rows) {
    const key = `${r.grant_id}|${r.resource_identifier}|${r.attribute}|${r.value}`;
    dedup.set(key, r);
  }
  return Array.from(dedup.values());
}
