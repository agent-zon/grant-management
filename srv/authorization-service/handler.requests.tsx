import cds from "@sap/cds";
import { ulid } from "ulid";
import type { AuthorizationService } from "../authorization-service.tsx";
import { AuthorizationRequests } from "#cds-models/AuthorizationService";

export default async function push(
  this: AuthorizationService,
  req: cds.Request<{
    grant_id?: string;
    subject?: string;
    authorization_details?: string;
    client_id?: string;
    scope?: string;
  }>
) {
  //todo:extract subject from token
  //  const {subject_token_type, subject_token} = req.data;
  //  const subject = await cds.auth.authenticate(subject_token_type, subject_token);

  // Generate or use existing grant ID
  const grantId = req.data.grant_id || `gnt_${ulid()}`;
  console.log("🔑 Grant ID for request:", grantId);


  // Create authorization request linked to grant
  const { ID } = await this.insert({
    grant_id: grantId,
    ...req.data,
    access: req.data.authorization_details
      ? parseAuthorizationDetails(req.data.authorization_details)
      : [],
  }).into(AuthorizationRequests);

  console.log("Request created", ID);

  // Upsert AuthorizationDetail records for this request keyed by (grantId:identifier)
  try {
    const details = req.data.authorization_details
      ? parseAuthorizationDetails(req.data.authorization_details)
      : [];
    if (Array.isArray(details) && details.length > 0) {
      const records = details.map((d: any, idx: number) => {
        const identifier = d.identifier || `${d.type_code || "detail"}-${idx}`;
        const id = `${grantId}:${identifier}`;
        const {
          type_code,
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
          ...rest
        } = d || {};
        return {
          id,
          identifier,
          grant_ID: grantId,
          request_ID: ID,
          type: type_code,
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
          ...rest,
        };
      });
      await this.upsert(records).into("com.sap.agent.grants.AuthorizationDetail");
      console.log(
        `✅ Upserted ${records.length} authorization_details for request ${ID} and grant ${grantId}`
      );

      // Build flattened permissions from authorization details
      const flatPermissions = buildPermissionsFromDetails(grantId, details);
      if (flatPermissions.length > 0) {
        // Replace existing flattened rows for this grant to avoid stale entries
        await this.delete("com.sap.agent.grants.Permissions").where({ grant_id: grantId });
        await this.upsert(flatPermissions).into("com.sap.agent.grants.Permissions");
        console.log(`✅ Upserted ${flatPermissions.length} flattened permissions for grant ${grantId}`);
      }
    }
  } catch (e) {
    console.warn("⚠️ Failed to upsert authorization_details on request:", e);
  }

  return {
    request_uri: `urn:ietf:params:oauth:request_uri:${ID}`,
    expires_in: 90,
  };
}

function parseAuthorizationDetails(authorization_details: string) {
  return JSON.parse(authorization_details)
    .filter(Boolean)
    .map(({ type, identifier, ...detail }: { type: string; identifier?: string; [key: string]: unknown }) => {
      return {
        type_code: type,
        identifier,
        ...detail,
      };
    });
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
    const identifier = d.identifier || `${d.type_code || d.type || "detail"}-${idx}`;
    const type = d.type_code || d.type;
    if (type) push(identifier, "type", String(type));

    // Arrays → one row per element
    Object.entries(arrayAttrMap).forEach(([key, singular]) => {
      const arr = d[key];
      if (Array.isArray(arr)) {
        arr.filter((v) => v !== undefined && v !== null).forEach((v) => push(identifier, singular, v));
      }
    });

    // Maps → one row per key
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

  // De-duplicate identical entries
  const dedup = new Map<string, typeof rows[number]>();
  for (const r of rows) {
    const key = `${r.grant_id}|${r.resource_identifier}|${r.attribute}|${r.value}`;
    dedup.set(key, r);
  }
  return Array.from(dedup.values());
}
