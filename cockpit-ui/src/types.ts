export interface ExplicitConsentPolicy {
  requiresExplicitConsent: boolean;
  consentExpirationMinutes?: number | null;
}

export interface ToolPolicy {
  agentId: string;
  toolName: string;
  explicitConsentPolicy: ExplicitConsentPolicy;
}

export type GrantStatus = 'active' | 'revoked' | 'expired';

export interface Grant {
  id: string;
  user_id: string;
  client_id?: string;
  scope: string;
  status: GrantStatus;
  created_at: string;
  updated_at: string;
  expires_at?: string | null;
  session_id?: string | null;
  workload_id?: string | null;
}

export interface GrantRequest {
  id: string;
  agent_id: string;
  session_id: string;
  requested_scopes: string[];
  tools: string[];
  status: 'pending' | 'approved' | 'denied' | 'expired';
  created_at: string;
  expires_at: string;
  authorization_link: string;
  workload_id?: string | null;
  reason?: string | null;
  approved_scopes?: string[];
  denied_scopes?: string[];
  decision_timestamp?: string;
}

export interface CreateGrantRequestInput {
  agent_id: string;
  session_id: string;
  requested_scopes: string[];
  tools: string[];
  workload_id?: string;
  reason?: string;
}

export interface GrantRequestDecisionInput {
  status: 'approved' | 'denied';
  approved_scopes?: string[];
  denied_scopes?: string[];
}
