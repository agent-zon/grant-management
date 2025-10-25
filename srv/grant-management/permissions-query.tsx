/**
 * Query utilities for the flattened Permissions table
 * Demonstrates how to query and reconstruct authorization details from permissions
 */

import cds from "@sap/cds";
import { reconstructAuthorizationDetails } from "../authorization-service/permissions-utils";

/**
 * Get all permissions for a grant
 */
export async function getPermissionsByGrantId(
  srv: any,
  grantId: string
): Promise<any[]> {
  const permissions = await srv.run(
    cds.ql.SELECT.from("com.sap.agent.grants.Permissions").where({ grant_id: grantId })
  );
  return permissions || [];
}

/**
 * Get permissions filtered by attribute
 */
export async function getPermissionsByAttribute(
  srv: any,
  grantId: string,
  attribute: string
): Promise<any[]> {
  const permissions = await srv.run(
    cds.ql
      .SELECT.from("com.sap.agent.grants.Permissions")
      .where({ grant_id: grantId, attribute })
  );
  return permissions || [];
}

/**
 * Get permissions for a specific resource identifier
 */
export async function getPermissionsByResourceIdentifier(
  srv: any,
  resourceIdentifier: string
): Promise<any[]> {
  const permissions = await srv.run(
    cds.ql
      .SELECT.from("com.sap.agent.grants.Permissions")
      .where({ resource_identifier: resourceIdentifier })
  );
  return permissions || [];
}

/**
 * Get all actions for a grant
 */
export async function getActionsByGrantId(
  srv: any,
  grantId: string
): Promise<string[]> {
  const permissions = await srv.run(
    cds.ql
      .SELECT.from("com.sap.agent.grants.Permissions")
      .where({ grant_id: grantId, attribute: "actions" })
  );
  return permissions?.map((p: any) => p.value) || [];
}

/**
 * Get all locations for a grant
 */
export async function getLocationsByGrantId(
  srv: any,
  grantId: string
): Promise<string[]> {
  const permissions = await srv.run(
    cds.ql
      .SELECT.from("com.sap.agent.grants.Permissions")
      .where({ grant_id: grantId, attribute: "locations" })
  );
  return permissions?.map((p: any) => p.value) || [];
}

/**
 * Get all tools for a grant
 */
export async function getToolsByGrantId(
  srv: any,
  grantId: string
): Promise<Record<string, boolean>> {
  const permissions = await srv.run(
    cds.ql
      .SELECT.from("com.sap.agent.grants.Permissions")
      .where({ grant_id: grantId })
      .and(`attribute LIKE 'tool:%'`)
  );
  
  const tools: Record<string, boolean> = {};
  for (const perm of permissions || []) {
    const toolName = perm.attribute.substring(5); // Remove 'tool:' prefix
    tools[toolName] = perm.value === "true";
  }
  return tools;
}

/**
 * Reconstruct authorization details from permissions for a grant
 */
export async function reconstructAuthorizationDetailsFromPermissions(
  srv: any,
  grantId: string
): Promise<any[]> {
  const permissions = await getPermissionsByGrantId(srv, grantId);
  return reconstructAuthorizationDetails(permissions);
}

/**
 * Check if a grant has a specific permission
 */
export async function hasPermission(
  srv: any,
  grantId: string,
  attribute: string,
  value: string
): Promise<boolean> {
  const permissions = await srv.run(
    cds.ql
      .SELECT.from("com.sap.agent.grants.Permissions")
      .where({ grant_id: grantId, attribute, value })
      .limit(1)
  );
  return permissions && permissions.length > 0;
}

/**
 * Get distinct resource identifiers for a grant
 */
export async function getResourceIdentifiersByGrantId(
  srv: any,
  grantId: string
): Promise<string[]> {
  const permissions = await srv.run(
    cds.ql
      .SELECT.from("com.sap.agent.grants.Permissions")
      .columns("resource_identifier")
      .where({ grant_id: grantId })
      .groupBy("resource_identifier")
  );
  return permissions?.map((p: any) => p.resource_identifier) || [];
}
