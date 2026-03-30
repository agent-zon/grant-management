// TypeScript types for AMS DCN policy language
// Reference: tools/mcp-ams (SAP Authorization Management Service)

// --- DCN Container (top-level document) ---

export interface DcnContainer {
  version: number;
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
  attribute: string; // "Structure" | "String" | "Number" | "Bool" | "Array" etc.
  nested?: Record<string, SchemaAttribute>;
}

// --- Policy ---

export interface DcnPolicy {
  policy: string[]; // qualified name, e.g. ["scai", "test"]
  rules: PolicyRule[];
}

export interface PolicyRule {
  rule: "grant" | "deny";
  actions: string[];
  resources: string[];
  condition?: PolicyCondition;
}

export interface PolicyCondition {
  call: string[];            // e.g. ["eq"], ["and"], ["in"]
  args: PolicyConditionArg[];
}

export type PolicyConditionArg =
  | string
  | number
  | boolean
  | { ref: string[] }        // attribute reference, e.g. ["$app","tools","list_commits","repo"]
  | PolicyCondition;          // nested condition

// --- Agent Policies (API shape) ---

export interface AgentPolicies {
  agentId: string;
  policies: string; // AMS DCN JSON string (DcnContainer or DcnPolicy[])
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
  requires?: string[];
  tools?: McpTool[];
  resources?: McpResource[];
  attributes?: Record<string, unknown>;
}

export interface McpResource {
  name: string;
  type: string;
  uri?: string;
}
