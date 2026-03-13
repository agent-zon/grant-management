// TypeScript types for Policies CAP service

export interface AgentPolicies {
  agentId: string;
  policies: string; // ODRL JSON string
  yaml: string;     // YAML JSON string
  createdAt: string;
  modifiedAt: string;
}

export interface OdrlPolicy {
  "@context": any[];
  "@type": "Set";
  permission: Permission[];
  prohibition: Prohibition[];
}

export interface Permission {
  action: string;
  target: string;
  assigner?: string;
  assignee?: string;
  constraint?: Constraint[];
}

export interface Prohibition {
  action: string;
  target: string;
  assigner?: string;
  assignee?: string;
  constraint?: Constraint[];
}

export interface Constraint {
  leftOperand: string;
  operator: string;
  rightOperand: any;
}

export interface AgentManifest {
  name: string;
  version: string;
  description?: string;
  requires?: string[];
  tools?: Tool[];
  resources?: Resource[];
  attributes?: Record<string, any>;
}

export interface Tool {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
}

export interface Resource {
  name: string;
  type: string;
  uri?: string;
}
