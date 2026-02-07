import type { SapScaiGrantsAuthorizationServiceGrants, SapScaiGrantsAuthorizationServiceAuthorizationDetails } from '../client/types.gen.js';

/**
 * MCP Tool definition matching the protocol spec
 */
export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

/**
 * Result of tool filtering operation
 */
export interface FilterResult {
  tools: McpTool[];
  grantExists: boolean;
}

/**
 * Extract server ID from request host/protocol
 * 
 * @param host - Host header value
 * @param protocol - Protocol (http/https)
 * @returns Full server URL
 */
export function extractServerId(host: string | undefined, protocol: string | undefined): string {
  if (!host) {
    return '';
  }
  const proto = protocol || 'https';
  return `${proto}://${host}`;
}

/**
 * Extract MCP authorization details for the specified server
 * 
 * @param authDetails - Array of authorization details from grant
 * @param serverId - Current server ID to match
 * @returns Tools map for the matched server, or null if not found
 */
function getMcpAuthDetails(
  authDetails: SapScaiGrantsAuthorizationServiceAuthorizationDetails[] | undefined,
  serverId: string
): Record<string, any> | null {
  if (!authDetails || !Array.isArray(authDetails)) {
    return null;
  }

  // Find MCP authorization details for this server
  for (const detail of authDetails) {
    if (detail.type === 'mcp' && detail.server === serverId) {
      // tools is a CdsMap which is just a Record<string, any>
      return detail.tools || null;
    }
  }

  return null;
}

/**
 * Check if a tool is a grant management tool
 * 
 * @param toolName - Name of the tool
 * @returns True if it's a grant management tool
 */
function isGrantTool(toolName: string): boolean {
  return toolName.startsWith('grant:');
}

/**
 * Filter tools based on grant authorization details
 * 
 * Logic:
 * - If grant exists: Show ONLY tools from authorization_details.tools (NO grant tools)
 * - If grant does NOT exist: Show ONLY grant management tools
 * 
 * @param upstreamTools - Tools returned from upstream MCP server
 * @param grant - Current grant data (with expanded authorization_details)
 * @param serverId - Current server ID for matching authorization details
 * @returns Filtered tools and grant existence flag
 */
export function filterToolsByGrant(
  upstreamTools: McpTool[],
  grant: SapScaiGrantsAuthorizationServiceGrants | undefined | null,
  serverId: string
): FilterResult {
  // If no grant exists, return ONLY grant management tools
  if (!grant) {
    return {
      tools: upstreamTools.filter(tool => isGrantTool(tool.name)),
      grantExists: false
    };
  }

  // Grant exists - extract MCP authorization details
  const mcpTools = getMcpAuthDetails(grant.authorization_details, serverId);

  // If no MCP authorization for this server, return only grant tools
  if (!mcpTools) {
    return {
      tools: upstreamTools.filter(tool => isGrantTool(tool.name)),
      grantExists: false
    };
  }

  // Grant exists with MCP details - filter to ONLY granted tools (exclude grant tools)
  const filteredTools = upstreamTools.filter(tool => {
    // Exclude grant tools when grant exists
    if (isGrantTool(tool.name)) {
      return false;
    }

    // Include only tools present in the authorization details
    return tool.name in mcpTools;
  });

  return {
    tools: filteredTools,
    grantExists: true
  };
}
