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
    }
  } catch (e) {
    console.warn("⚠️ Failed to upsert authorization_details on request:", e);
  }

  // Rebuild flattened permissions for the grant based on all current AuthorizationDetail records
  try {
    await rebuildPermissionsForGrant.call(this, grantId);
  } catch (e) {
    console.warn("⚠️ Failed to rebuild permissions:", e);
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

async function rebuildPermissionsForGrant(this: AuthorizationService, grantId: string) {
  // 1) Read all AuthorizationDetail for the grant
  const details: Array<Record<string, unknown>> = await this.run(
    cds.ql.SELECT.from("com.sap.agent.grants.AuthorizationDetail").where({ grant_ID: grantId })
  );

  // 2) Compute flattened rows
  const rows: Array<{ grant_id: string; resource_identifier: string; attribute: string; value: string }> = [];

  for (const d of details) {
    const type = String(d["type"] || "");
    const identifier = String(d["identifier"] || "");

    const actions = (Array.isArray(d["actions"]) ? (d["actions"] as unknown[]) : []).map(String);
    const locations = (Array.isArray(d["locations"]) ? (d["locations"] as unknown[]) : []).map(String);
    const roots = (Array.isArray((d as any)["roots"]) ? ((d as any)["roots"] as unknown[]) : []).map(String);
    const urls = (Array.isArray((d as any)["urls"]) ? ((d as any)["urls"] as unknown[]) : []).map(String);
    const protocols = (Array.isArray((d as any)["protocols"]) ? ((d as any)["protocols"] as unknown[]) : []).map(String);
    const databases = (Array.isArray((d as any)["databases"]) ? ((d as any)["databases"] as unknown[]) : []).map(String);
    const schemas = (Array.isArray((d as any)["schemas"]) ? ((d as any)["schemas"] as unknown[]) : []).map(String);
    const tables = (Array.isArray((d as any)["tables"]) ? ((d as any)["tables"] as unknown[]) : []).map(String);
    const server = (d as any)["server"] ? String((d as any)["server"]) : undefined;
    const transport = (d as any)["transport"] ? String((d as any)["transport"]) : undefined;
    const tools = (d as any)["tools"] && typeof (d as any)["tools"] === "object" ? ((d as any)["tools"] as Record<string, unknown>) : {};
    const permissions = (d as any)["permissions"] && typeof (d as any)["permissions"] === "object" ? ((d as any)["permissions"] as Record<string, unknown>) : {};

    // Resolve resource identifiers by type
    const resourceIdentifiers: string[] = [];
    if (type === "fs") {
      if (locations.length > 0) resourceIdentifiers.push(...locations);
      else if (roots.length > 0) resourceIdentifiers.push(...roots);
    } else if (type === "api") {
      if (urls.length > 0) resourceIdentifiers.push(...urls);
    } else if (type === "mcp") {
      if (server) resourceIdentifiers.push(server);
    } else if (type === "database") {
      const dbs = databases.length > 0 ? databases : [undefined];
      const scs = schemas.length > 0 ? schemas : [undefined];
      const tbs = tables.length > 0 ? tables : [undefined];
      for (const db of dbs) {
        for (const sc of scs) {
          for (const tb of tbs) {
            const parts = [db, sc, tb].filter(Boolean) as string[];
            if (parts.length > 0) resourceIdentifiers.push(`db://${parts.join('/')}`);
          }
        }
      }
    }
    if (resourceIdentifiers.length === 0) {
      resourceIdentifiers.push(identifier || (type ? `type:${type}` : `grant:${grantId}`));
    }

    // Emit rows per resource identifier
    for (const resId of resourceIdentifiers) {
      // Always include type
      rows.push({ grant_id: grantId, resource_identifier: resId, attribute: "type", value: type });

      for (const a of actions) rows.push({ grant_id: grantId, resource_identifier: resId, attribute: "action", value: a });
      for (const loc of locations) rows.push({ grant_id: grantId, resource_identifier: resId, attribute: "location", value: loc });
      for (const rt of roots) rows.push({ grant_id: grantId, resource_identifier: resId, attribute: "root", value: rt });
      for (const url of urls) rows.push({ grant_id: grantId, resource_identifier: resId, attribute: "url", value: url });
      for (const proto of protocols) rows.push({ grant_id: grantId, resource_identifier: resId, attribute: "protocol", value: proto });

      // Database attributes aligned with the identifier parts
      if (resId.startsWith("db://")) {
        const [, path] = resId.split("db://");
        const parts = path.split("/");
        if (parts[0]) rows.push({ grant_id: grantId, resource_identifier: resId, attribute: "database", value: parts[0] });
        if (parts[1]) rows.push({ grant_id: grantId, resource_identifier: resId, attribute: "schema", value: parts[1] });
        if (parts[2]) rows.push({ grant_id: grantId, resource_identifier: resId, attribute: "table", value: parts[2] });
      }

      // Tools map (truthy entries only)
      for (const [toolName, granted] of Object.entries(tools)) {
        if (granted) rows.push({ grant_id: grantId, resource_identifier: resId, attribute: "tool", value: toolName });
      }

      // FS permissions booleans
      for (const [permKey, permVal] of Object.entries(permissions)) {
        if (typeof permVal === "object" && permVal && "essential" in (permVal as any)) {
          // RARClaim structure, treat presence as granted
          rows.push({ grant_id: grantId, resource_identifier: resId, attribute: `permission_${permKey}`, value: "true" });
        } else if (typeof permVal === "boolean") {
          rows.push({ grant_id: grantId, resource_identifier: resId, attribute: `permission_${permKey}`, value: String(permVal) });
        }
      }

      if (server) rows.push({ grant_id: grantId, resource_identifier: resId, attribute: "server", value: server });
      if (transport) rows.push({ grant_id: grantId, resource_identifier: resId, attribute: "transport", value: transport });
    }
  }

  // 3) Replace rows for this grant
  await this.run(cds.ql.DELETE.from("com.sap.agent.grants.Permissions").where({ grant_id: grantId }));
  if (rows.length > 0) {
    await this.insert(rows).into("com.sap.agent.grants.Permissions");
  }
}
