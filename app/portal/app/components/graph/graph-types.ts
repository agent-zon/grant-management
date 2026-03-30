import type { Node, Edge } from "@xyflow/react";

// --- API response types (matches /grants-management/Grants shape) ---

export type AuthorizationDetailType =
  | "mcp_server"
  | "file_system"
  | "database"
  | "api"
  | "agent_invocation"
  | "system_connection";

export interface McpAuthorizationDetail {
  type: "mcp_server";
  server: string;
  transport?: string;
  tools?: { name: string; granted: boolean }[];
}

export interface FsAuthorizationDetail {
  type: "file_system";
  roots: string[];
  permissions?: {
    read?: boolean;
    write?: boolean;
    execute?: boolean;
    delete?: boolean;
    list?: boolean;
    create?: boolean;
  };
}

export interface DatabaseAuthorizationDetail {
  type: "database";
  database: string;
  schema?: string;
  tables?: string[];
  actions?: string[];
}

export interface ApiAuthorizationDetail {
  type: "api";
  urls: string[];
  protocols?: string[];
  actions?: string[];
}

/** Detail type representing delegated invocation of another agent. */
export interface AgentInvocationAuthorizationDetail {
  type: "agent_invocation";
  agent: string; // URN of the target agent, e.g. "urn:agent:hr-data-service"
  description?: string;
  /** The restricted subset of the target agent's authorization details that the invoking agent may use. */
  delegated_details: Exclude<AuthorizationDetail, AgentInvocationAuthorizationDetail>[];
}

export interface SystemConnectionAuthorizationDetail {
  type: "system_connection";
  system: string;
  connection_scopes?: string[];
}

export type AuthorizationDetail =
  | McpAuthorizationDetail
  | FsAuthorizationDetail
  | DatabaseAuthorizationDetail
  | ApiAuthorizationDetail
  | AgentInvocationAuthorizationDetail
  | SystemConnectionAuthorizationDetail;

/** A non-delegation authorization detail (everything except agent_invocation). */
export type ResourceAuthorizationDetail = Exclude<
  AuthorizationDetail,
  AgentInvocationAuthorizationDetail
>;

export interface ApiGrant {
  grant_id: string;
  actor: string;
  granted: boolean;
  scope?: string;
  description?: string;
  granted_at?: string;
  expires_at?: string;
  authorization_details: AuthorizationDetail[];
}

// --- Leaf-focused graph data types ---

export type LeafType = "mcp_tool" | "db_table" | "fs_path" | "api_endpoint" | "system_connection_scope";

export interface AuthorizationTrace {
  grant: {
    grant_id: string;
    scope?: string;
    description?: string;
    granted_at?: string;
    expires_at?: string;
  };
  authorizationDetail: AuthorizationDetail;
  delegation?: {
    agent: string;
    agentDisplayName: string;
    description?: string;
    invocationDetail: AgentInvocationAuthorizationDetail;
    restrictedDetail: ResourceAuthorizationDetail;
  };
}

export interface FindingConditionInfo {
  side: string;
  leafType?: string;
  labelPattern?: string;
  sublabelPattern?: string;
  requireDelegated?: boolean;
  sourceDetailType?: string;
}

export interface FindingInfo {
  findingId: string;
  label: string;
  description: string;
  category?: string;
  severity?: string;
  conditions?: FindingConditionInfo[];
}

export interface LeafResource {
  id: string;
  leafType: LeafType;
  label: string;
  sublabel: string;
  status: "granted" | "denied";
  constraintsSummary: string;
  viaAgent?: string;
  sourceDetailType: AuthorizationDetailType;
  trace: AuthorizationTrace;
  finding?: FindingInfo;
}

export interface LeafGroup {
  leafType: LeafType;
  leaves: LeafResource[];
}

// --- Graph node data types ---

export interface AgentNodeData {
  label: string;
  grantCount: number;
  permissionCount: number;
  deniedCount: number;
  [key: string]: unknown;
}

export interface LeafNodeData {
  leaf: LeafResource;
  selected?: boolean;
  dimmed?: boolean;
  [key: string]: unknown;
}

export type TraceStepType = "grant" | "delegation" | "detail";

export interface TraceStepNodeData {
  stepType: TraceStepType;
  leaf: LeafResource;
  [key: string]: unknown;
}

export type AgentGraphNode = Node<AgentNodeData, "agentNode">;
export type LeafGraphNode = Node<LeafNodeData, "leafNode">;
export type TraceStepGraphNode = Node<TraceStepNodeData, "traceStepNode">;
export type GraphNode = AgentGraphNode | LeafGraphNode | TraceStepGraphNode;
export type GraphEdge = Edge;

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  findings: FindingInfo[];
}
