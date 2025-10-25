-- Permissions Table Query Examples
-- These queries demonstrate how to work with the flattened permissions structure

-- ============================================================================
-- Basic Queries
-- ============================================================================

-- Get all permissions for a specific grant
SELECT * FROM com_sap_agent_grants_Permissions
WHERE grant_id = 'gnt_01234567890';

-- Get all unique grant IDs that have permissions
SELECT DISTINCT grant_id FROM com_sap_agent_grants_Permissions;

-- Count total permissions per grant
SELECT grant_id, COUNT(*) as permission_count
FROM com_sap_agent_grants_Permissions
GROUP BY grant_id
ORDER BY permission_count DESC;

-- ============================================================================
-- Attribute-Specific Queries
-- ============================================================================

-- Get all actions for a grant
SELECT value as action FROM com_sap_agent_grants_Permissions
WHERE grant_id = 'gnt_01234567890' AND attribute = 'actions';

-- Get all locations for a grant
SELECT value as location FROM com_sap_agent_grants_Permissions
WHERE grant_id = 'gnt_01234567890' AND attribute = 'locations';

-- Get all database names a grant has access to
SELECT value as database_name FROM com_sap_agent_grants_Permissions
WHERE grant_id = 'gnt_01234567890' AND attribute = 'databases';

-- Get all API URLs a grant has access to
SELECT value as api_url FROM com_sap_agent_grants_Permissions
WHERE grant_id = 'gnt_01234567890' AND attribute = 'urls';

-- ============================================================================
-- Tool Permissions
-- ============================================================================

-- Get all tools for a grant (MCP tools)
SELECT 
  SUBSTRING(attribute, 6) as tool_name,
  value as granted
FROM com_sap_agent_grants_Permissions
WHERE grant_id = 'gnt_01234567890' 
  AND attribute LIKE 'tool:%';

-- Count how many tools are granted per grant
SELECT 
  grant_id,
  COUNT(*) as tool_count
FROM com_sap_agent_grants_Permissions
WHERE attribute LIKE 'tool:%' AND value = 'true'
GROUP BY grant_id;

-- Find grants with a specific tool enabled
SELECT DISTINCT grant_id
FROM com_sap_agent_grants_Permissions
WHERE attribute = 'tool:search_repositories' 
  AND value = 'true';

-- ============================================================================
-- Filesystem Permissions
-- ============================================================================

-- Get filesystem permissions for a grant
SELECT 
  SUBSTRING(attribute, 12) as permission_type,
  value as granted
FROM com_sap_agent_grants_Permissions
WHERE grant_id = 'gnt_01234567890' 
  AND attribute LIKE 'permission:%';

-- Get file system roots a grant has access to
SELECT value as root_path FROM com_sap_agent_grants_Permissions
WHERE grant_id = 'gnt_01234567890' AND attribute = 'roots';

-- Find grants with write permission
SELECT DISTINCT grant_id
FROM com_sap_agent_grants_Permissions
WHERE attribute = 'permission:write' 
  AND value = 'true';

-- ============================================================================
-- Resource Identifier Queries
-- ============================================================================

-- Get all resource identifiers for a grant
SELECT DISTINCT resource_identifier
FROM com_sap_agent_grants_Permissions
WHERE grant_id = 'gnt_01234567890';

-- Get all permissions for a specific resource
SELECT attribute, value
FROM com_sap_agent_grants_Permissions
WHERE resource_identifier = 'gnt_01234567890:mcp-server-1';

-- Count resources per grant
SELECT grant_id, COUNT(DISTINCT resource_identifier) as resource_count
FROM com_sap_agent_grants_Permissions
GROUP BY grant_id;

-- ============================================================================
-- Type-Based Queries
-- ============================================================================

-- Get the type of each resource for a grant
SELECT DISTINCT resource_identifier, value as type
FROM com_sap_agent_grants_Permissions
WHERE grant_id = 'gnt_01234567890' AND attribute = 'type';

-- Count grants by authorization detail type
SELECT value as type, COUNT(DISTINCT grant_id) as grant_count
FROM com_sap_agent_grants_Permissions
WHERE attribute = 'type'
GROUP BY value;

-- Find all MCP-type permissions
SELECT grant_id, resource_identifier
FROM com_sap_agent_grants_Permissions
WHERE attribute = 'type' AND value = 'mcp';

-- ============================================================================
-- Security & Audit Queries
-- ============================================================================

-- Find grants with write or delete permissions
SELECT DISTINCT grant_id, attribute, value
FROM com_sap_agent_grants_Permissions
WHERE attribute IN ('actions', 'permission:write', 'permission:delete')
  AND value IN ('write', 'delete', 'true');

-- Audit: List all grants with database access
SELECT DISTINCT grant_id, value as database_name
FROM com_sap_agent_grants_Permissions
WHERE attribute = 'databases';

-- Audit: List all grants with API access and their URLs
SELECT grant_id, value as api_endpoint
FROM com_sap_agent_grants_Permissions
WHERE attribute = 'urls';

-- Find high-risk permissions (execute, delete, write)
SELECT grant_id, resource_identifier, attribute, value
FROM com_sap_agent_grants_Permissions
WHERE (attribute = 'permission:execute' AND value = 'true')
   OR (attribute = 'permission:delete' AND value = 'true')
   OR (attribute = 'actions' AND value IN ('execute', 'delete'));

-- ============================================================================
-- Complex Analytical Queries
-- ============================================================================

-- Show summary of permissions per grant
SELECT 
  grant_id,
  COUNT(DISTINCT resource_identifier) as num_resources,
  COUNT(CASE WHEN attribute = 'actions' THEN 1 END) as num_actions,
  COUNT(CASE WHEN attribute LIKE 'tool:%' THEN 1 END) as num_tools,
  COUNT(CASE WHEN attribute = 'locations' THEN 1 END) as num_locations
FROM com_sap_agent_grants_Permissions
GROUP BY grant_id;

-- Find grants that have both read and write permissions
SELECT DISTINCT p1.grant_id
FROM com_sap_agent_grants_Permissions p1
INNER JOIN com_sap_agent_grants_Permissions p2
  ON p1.grant_id = p2.grant_id
  AND p1.resource_identifier = p2.resource_identifier
WHERE p1.attribute = 'actions' AND p1.value = 'read'
  AND p2.attribute = 'actions' AND p2.value = 'write';

-- Resources with multiple permissions on same grant
SELECT 
  grant_id,
  resource_identifier,
  COUNT(*) as permission_count,
  GROUP_CONCAT(DISTINCT attribute) as attributes
FROM com_sap_agent_grants_Permissions
GROUP BY grant_id, resource_identifier
HAVING permission_count > 5
ORDER BY permission_count DESC;

-- ============================================================================
-- Join with Grants Table
-- ============================================================================

-- Get permissions with grant metadata
SELECT 
  g.id as grant_id,
  g.status,
  g.subject,
  p.resource_identifier,
  p.attribute,
  p.value
FROM com_sap_agent_grants_Grants g
LEFT JOIN com_sap_agent_grants_Permissions p ON g.id = p.grant_id
WHERE g.status = 'active';

-- Active grants with their permission counts
SELECT 
  g.id,
  g.status,
  g.subject,
  COUNT(p.id) as total_permissions
FROM com_sap_agent_grants_Grants g
LEFT JOIN com_sap_agent_grants_Permissions p ON g.id = p.grant_id
WHERE g.status = 'active'
GROUP BY g.id, g.status, g.subject;

-- ============================================================================
-- Cleanup & Maintenance
-- ============================================================================

-- Find permissions without associated grants (orphaned)
SELECT p.*
FROM com_sap_agent_grants_Permissions p
LEFT JOIN com_sap_agent_grants_Grants g ON p.grant_id = g.id
WHERE g.id IS NULL;

-- Delete permissions for revoked grants
-- DELETE FROM com_sap_agent_grants_Permissions
-- WHERE grant_id IN (
--   SELECT id FROM com_sap_agent_grants_Grants WHERE status = 'revoked'
-- );
