/**
 * Utilities for flattening authorization details to permissions table
 * Each authorization detail is converted to multiple permission rows with:
 * - resource_identifier: identifies the resource/detail
 * - grant_id: the grant this permission belongs to
 * - attribute: the type of attribute (action, location, tool, database, etc.)
 * - value: the actual value of the attribute
 */

export interface PermissionRow {
  resource_identifier: string;
  grant_id: string;
  attribute: string;
  value: string;
  request_ID?: string;
}

/**
 * Flatten an authorization detail object into permission rows
 */
export function flattenAuthorizationDetail(
  detail: any,
  grantId: string,
  requestId?: string,
  index: number = 0
): PermissionRow[] {
  const permissions: PermissionRow[] = [];
  const identifier = detail.identifier || `${detail.type || "detail"}-${index}`;
  const resourceIdentifier = `${grantId}:${identifier}`;

  // Add type as an attribute
  if (detail.type) {
    permissions.push({
      resource_identifier: resourceIdentifier,
      grant_id: grantId,
      attribute: "type",
      value: detail.type,
      request_ID: requestId,
    });
  }

  // Flatten arrays (actions, locations, roots, databases, schemas, tables, urls, protocols)
  const arrayFields = [
    "actions",
    "locations",
    "roots",
    "databases",
    "schemas",
    "tables",
    "urls",
    "protocols",
  ];

  for (const field of arrayFields) {
    if (Array.isArray(detail[field])) {
      for (const value of detail[field]) {
        permissions.push({
          resource_identifier: resourceIdentifier,
          grant_id: grantId,
          attribute: field,
          value: String(value),
          request_ID: requestId,
        });
      }
    }
  }

  // Flatten tools object (Map)
  if (detail.tools && typeof detail.tools === "object") {
    for (const [toolName, toolValue] of Object.entries(detail.tools)) {
      permissions.push({
        resource_identifier: resourceIdentifier,
        grant_id: grantId,
        attribute: `tool:${toolName}`,
        value: String(toolValue),
        request_ID: requestId,
      });
    }
  }

  // Flatten permissions object (for filesystem)
  if (detail.permissions && typeof detail.permissions === "object") {
    for (const [permName, permValue] of Object.entries(detail.permissions)) {
      permissions.push({
        resource_identifier: resourceIdentifier,
        grant_id: grantId,
        attribute: `permission:${permName}`,
        value: String(permValue),
        request_ID: requestId,
      });
    }
  }

  // Handle scalar fields (server, transport)
  const scalarFields = ["server", "transport"];
  for (const field of scalarFields) {
    if (detail[field]) {
      permissions.push({
        resource_identifier: resourceIdentifier,
        grant_id: grantId,
        attribute: field,
        value: String(detail[field]),
        request_ID: requestId,
      });
    }
  }

  return permissions;
}

/**
 * Flatten an array of authorization details into permission rows
 */
export function flattenAuthorizationDetails(
  details: any[],
  grantId: string,
  requestId?: string
): PermissionRow[] {
  if (!Array.isArray(details) || details.length === 0) {
    return [];
  }

  return details.flatMap((detail, index) =>
    flattenAuthorizationDetail(detail, grantId, requestId, index)
  );
}

/**
 * Reconstruct authorization details from permission rows
 * Groups permissions by resource_identifier and reconstructs the original structure
 */
export function reconstructAuthorizationDetails(
  permissions: PermissionRow[]
): any[] {
  const detailsMap = new Map<string, any>();

  for (const perm of permissions) {
    if (!detailsMap.has(perm.resource_identifier)) {
      detailsMap.set(perm.resource_identifier, {
        identifier: perm.resource_identifier.split(":")[1],
        actions: [],
        locations: [],
        roots: [],
        databases: [],
        schemas: [],
        tables: [],
        urls: [],
        protocols: [],
        tools: {},
        permissions: {},
      });
    }

    const detail = detailsMap.get(perm.resource_identifier)!;

    // Handle different attribute types
    if (perm.attribute === "type") {
      detail.type = perm.value;
    } else if (perm.attribute.startsWith("tool:")) {
      const toolName = perm.attribute.substring(5);
      detail.tools[toolName] = perm.value === "true";
    } else if (perm.attribute.startsWith("permission:")) {
      const permName = perm.attribute.substring(11);
      detail.permissions[permName] = perm.value === "true";
    } else if (
      [
        "actions",
        "locations",
        "roots",
        "databases",
        "schemas",
        "tables",
        "urls",
        "protocols",
      ].includes(perm.attribute)
    ) {
      detail[perm.attribute].push(perm.value);
    } else {
      // Scalar fields (server, transport, etc.)
      detail[perm.attribute] = perm.value;
    }
  }

  return Array.from(detailsMap.values()).map((detail) => {
    // Clean up empty arrays and objects
    const cleaned: any = { ...detail };
    if (cleaned.actions.length === 0) delete cleaned.actions;
    if (cleaned.locations.length === 0) delete cleaned.locations;
    if (cleaned.roots.length === 0) delete cleaned.roots;
    if (cleaned.databases.length === 0) delete cleaned.databases;
    if (cleaned.schemas.length === 0) delete cleaned.schemas;
    if (cleaned.tables.length === 0) delete cleaned.tables;
    if (cleaned.urls.length === 0) delete cleaned.urls;
    if (cleaned.protocols.length === 0) delete cleaned.protocols;
    if (Object.keys(cleaned.tools).length === 0) delete cleaned.tools;
    if (Object.keys(cleaned.permissions).length === 0) delete cleaned.permissions;
    return cleaned;
  });
}
