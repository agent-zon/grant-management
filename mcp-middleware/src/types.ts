export interface ConsentRequest {
  id: string;
  agentId: string;
  sessionId: string;
  requestedScopes: string[];
  tools: string[];
  reason: string;
  timestamp: Date;
  workloadId?: string;
  status: 'pending' | 'approved' | 'denied' | 'expired';
}

export interface ConsentToken {
  sessionId: string;
  scopes: string[];
  issuedAt: Date;
  expiresAt: Date;
  agentId: string;
}

export interface ToolScopeMapping {
  [toolName: string]: string[];
}

export interface ConsentConfig {
  tokenLifetimeMinutes: number;
  idpAuthUrl: string;
  idpClientId: string;
  consentBaseUrl: string;
  toolScopeMappings: ToolScopeMapping;
}

export interface ConsentAuthRequest {
  sessionId: string;
  requiredScopes: string[];
  toolName: string;
  authorizationUrl: string;
  message: string;
}

export interface McpToolCall {
  method: string;
  params: {
    name: string;
    arguments?: Record<string, any>;
  };
  id: string | number;
}

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

export interface ConsentDecision {
  requestId: string;
  approvedScopes: string[];
  decision: 'approve' | 'deny';
  timestamp: Date;
}
