// Type definitions for MCP Consent Proxy Microservice

/**
 * Authorization detail structure
 */
export interface AuthorizationDetail {
  type: string;
  type_code?: string;
  [key: string]: any;
}

/**
 * Session state tracking grant association and authorization details
 */
export interface SessionState {
  sessionId: string;
  grant_id?: string;
  authorization_details?: AuthorizationDetail[];
  created_at: Date;
  last_used?: Date;
  agent_id?: string;
  user_id?: string;
  mcp_server_url?: string;
}

/**
 * MCP JSON-RPC request structure
 */
export interface McpRequest {
  jsonrpc: string;
  method: string;
  params?: any;
  id: string | number;
}

/**
 * MCP JSON-RPC response structure
 */
export interface McpResponse {
  jsonrpc: string;
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * MCP tool call parameters
 */
export interface McpToolCallParams {
  name: string;
  arguments?: Record<string, any>;
}

/**
 * MCP initialize request params
 */
export interface McpInitializeParams {
  protocolVersion: string;
  capabilities: {
    roots?: { listChanged?: boolean };
    sampling?: object;
  };
  clientInfo: {
    name: string;
    version: string;
  };
}

/**
 * MCP server capabilities
 */
export interface McpServerCapabilities {
  protocolVersion: string;
  capabilities: {
    tools?: {
      listChanged?: boolean;
    };
    resources?: {
      subscribe?: boolean;
      listChanged?: boolean;
    };
    prompts?: {
      listChanged?: boolean;
    };
    logging?: object;
  };
  serverInfo: {
    name: string;
    version: string;
  };
  tools?: McpTool[];
}

/**
 * MCP tool definition
 */
export interface McpTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

/**
 * Authorization validation result
 */
export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  missingTools?: string[];
  grant_id?: string;
}

/**
 * Consent request payload for PAR
 */
export interface ConsentRequestPayload {
  response_type: string;
  client_id: string;
  redirect_uri: string;
  grant_management_action: "create" | "merge" | "update" | "replace";
  grant_id?: string;
  authorization_details: string;
  requested_actor?: string;
  subject?: string;
  scope: string;
  subject_token_type?: string;
}

/**
 * Tool policy grouping configuration
 */
export interface ToolPolicyGroup {
  name: string;
  tools: string[];
  description?: string;
  riskLevel?: "low" | "medium" | "high";
}

/**
 * MCP authorization detail for tool permissions
 */
export interface McpAuthorizationDetail {
  type: "mcp";
  server?: string;
  transport?: string;
  tools: Record<string, boolean | { essential: boolean }>;
  locations?: string[];
  riskLevel?: "low" | "medium" | "high";
  category?: string;
  description?: string;
}
