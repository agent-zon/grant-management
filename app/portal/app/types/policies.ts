// TypeScript types for AMS DCN policy language
// Reference: tools/mcp-ams (SAP Authorization Management Service)

// --- DCN Container (top-level document) ---

export interface DcnContainer {
  version: number;
  id?: string;
  name?: string;
  policies?: DcnPolicy[];
  functions?: unknown[];
  schemas?: DcnSchema[];
  tests?: unknown[];
}

export interface DcnSchema {
  schema: string[];
  definition: SchemaAttribute;
}

export interface SchemaAttribute {
  attribute: string;
  nested?: Record<string, SchemaAttribute>;
}

// --- Policy ---

export interface DcnPolicy {
  policy: string[];          // semantic name = authorization context, e.g. ["obo_authenticated_user"]
  description?: string;      // human-readable, shown during consent
  duties?: string[];         // e.g. ["consent"] — policy requires user approval to activate
  schedule?: string;         // cron pattern — policy only active during matching times
  rules: PolicyRule[];
}

export interface PolicyRule {
  rule: "grant" | "deny";
  actions: string[];         // "access" (catch-all), "call", "read", "render"
  resources: string[];       // "{server}.{type}" e.g. "ariba-mcp.tools", "agent.artifacts"
  condition?: PolicyCondition;
}

export interface PolicyCondition {
  call: string[];
  args: PolicyConditionArg[];
}

export type PolicyConditionArg =
  | string
  | number
  | boolean
  | { ref: string[] }
  | PolicyCondition;

// --- Agent Policies (API shape) ---

export interface AgentPolicies {
  agentId: string;
  policies: string;
  createdAt: string;
  modifiedAt: string;
}

// --- MCP Tool / Resource ---

export interface McpTool {
  name: string;
  description?: string;
}

export interface AgentManifest {
  name: string;
  version: string;
  description?: string;
  tools?: McpTool[];
  resources?: McpResource[];
  attributes?: Record<string, unknown>;
}

export interface McpResource {
  name: string;
  type: string;
  uri?: string;
}
