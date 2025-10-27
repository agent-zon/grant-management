import { ToolPolicy, Grant, GrantStatus, GrantRequest } from './types';

// Access token & unauthorized retry -------------------------------------------------
let accessToken: string | null = null;
export function setAccessToken(token: string | null) { accessToken = token; }
let unauthorizedHandler: (() => Promise<boolean>) | null = null;
export function registerUnauthorizedHandler(fn: () => Promise<boolean>) { unauthorizedHandler = fn; }

// Base URL -------------------------------------------------------------------------
const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:3001';

// Internal helpers -----------------------------------------------------------------
function mapServerPolicy(raw: any): ToolPolicy {
  return {
    agentId: raw.agentId || raw.AgentId,
    toolName: raw.toolName || raw.ToolName,
    explicitConsentPolicy: {
      requiresExplicitConsent: raw.explicitConsentPolicy?.requiresExplicitConsent ?? raw.ExplicitConsentPolicy?.RequiresExplicitConsent ?? false,
      consentExpirationMinutes: (() => {
        // Preferred new field (minutes as number)
        const direct = raw.explicitConsentPolicy?.consentExpirationMinutes ?? raw.explicitConsentPolicy?.ConsentExpirationMinutes ?? raw.ExplicitConsentPolicy?.consentExpirationMinutes ?? raw.ExplicitConsentPolicy?.ConsentExpirationMinutes;
        if (direct != null) return typeof direct === 'number' ? direct : parseInt(direct, 10);
        // Backward compatibility: older API returned a time span string (HH:MM:SS) under consentExpiration
        const legacy = raw.explicitConsentPolicy?.consentExpiration ?? raw.ExplicitConsentPolicy?.ConsentExpiration;
        if (!legacy || typeof legacy !== 'string') return null;
        const parts = legacy.split(':');
        if (parts.length < 2) return null;
        const hrs = parseInt(parts[0] || '0', 10);
        const mins = parseInt(parts[1] || '0', 10);
        if (isNaN(hrs) && isNaN(mins)) return null;
        return (hrs * 60) + (isNaN(mins) ? 0 : mins);
      })()
    }
  };
}

async function http<T>(path: string, options: RequestInit = {}, retry = false): Promise<T> {
  const headers: Record<string,string> = { 'Content-Type': 'application/json', ...(options.headers as any || {}) };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (res.status === 401 && unauthorizedHandler && !retry) {
    try {
      const renewed = await unauthorizedHandler();
      if (renewed) return http<T>(path, options, true);
    } catch { /* ignore */ }
  }
  if (!res.ok) {
    let details: any = undefined;
    try { details = await res.json(); } catch {}
    throw new Error(details?.message || `Request failed ${res.status}`);
  }
  if (res.status === 204) return {} as T;
  return res.json();
}

// Tool Policies --------------------------------------------------------------------
export async function listToolPolicies(agentId: string): Promise<ToolPolicy[]> {
  if (!agentId) return [];
  const raw = await http<any[]>(`/agents/${encodeURIComponent(agentId)}/tools`);
  return raw.map(mapServerPolicy);
}

export async function createToolPolicy(agentId: string, policy: ToolPolicy): Promise<ToolPolicy> {
  const payload = {
    agentId: policy.agentId,
    toolName: policy.toolName,
    explicitConsentPolicy: {
      requiresExplicitConsent: policy.explicitConsentPolicy.requiresExplicitConsent,
      consentExpirationMinutes: policy.explicitConsentPolicy.consentExpirationMinutes
    }
  };
  await http(`/agents/${encodeURIComponent(agentId)}/tools`, { method:'POST', body: JSON.stringify(payload) });
  return policy;
}

export async function updateToolPolicy(agentId: string, policy: ToolPolicy): Promise<ToolPolicy> {
  const payload = {
    agentId: policy.agentId,
    toolName: policy.toolName,
    explicitConsentPolicy: {
      requiresExplicitConsent: policy.explicitConsentPolicy.requiresExplicitConsent,
      consentExpirationMinutes: policy.explicitConsentPolicy.consentExpirationMinutes
    }
  };
  await http(`/agents/${encodeURIComponent(agentId)}/tools/${encodeURIComponent(policy.toolName)}`, { method:'PUT', body: JSON.stringify(payload) });
  return policy;
}

// Deprecated: kept for backward compatibility; prefer createToolPolicy / updateToolPolicy
export async function upsertToolPolicy(agentId: string, policy: ToolPolicy): Promise<ToolPolicy> {
  const existing = (await listToolPolicies(agentId)).find(p => p.toolName.toLowerCase() === policy.toolName.toLowerCase());
  if (existing) return updateToolPolicy(agentId, policy);
  return createToolPolicy(agentId, policy);
}

export async function deleteToolPolicy(agentId: string, toolName: string): Promise<void> {
  await http(`/agents/${encodeURIComponent(agentId)}/tools/${encodeURIComponent(toolName)}`, { method:'DELETE' });
}

// Grants ---------------------------------------------------------------------------
export interface GrantFilter { status?: GrantStatus | 'all'; session_id?: string }
export async function listGrants(filter: GrantFilter = {}): Promise<Grant[]> {
  const params = new URLSearchParams();
  if (filter.status) params.set('status', filter.status);
  if (filter.session_id) params.set('session_id', filter.session_id);
  const qs = params.toString();
  return http<Grant[]>(`/grants${qs ? `?${qs}` : ''}`);
}

export async function revokeGrant(id: string): Promise<void> {
  await http(`/grants/${encodeURIComponent(id)}`, { method:'DELETE' });
}

// Grant Requests -------------------------------------------------------------------
export async function listGrantRequests(status?: string): Promise<GrantRequest[]> {
  const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  return http<GrantRequest[]>(`/grant-requests${qs}`);
}

export async function createGrantRequest(input: { agent_id: string; session_id: string; requested_scopes: string[]; tools: string[]; workload_id?: string; reason?: string; }): Promise<GrantRequest> {
  return http<GrantRequest>(`/grant-requests`, { method:'POST', body: JSON.stringify(input) });
}

export async function decideGrantRequest(id: string, decision: { status:'approved'|'denied'; approved_scopes?: string[]; denied_scopes?: string[] }): Promise<any> {
  return http<any>(`/grant-requests/${encodeURIComponent(id)}/respond`, { method:'POST', body: JSON.stringify(decision) });
}

// Utilities ------------------------------------------------------------------------
export function formatDate(iso?: string | null) {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export const Api = {
  listToolPolicies,
  createToolPolicy,
  updateToolPolicy,
  upsertToolPolicy,
  deleteToolPolicy,
  listGrants,
  revokeGrant,
  listGrantRequests,
  createGrantRequest,
  decideGrantRequest,
  formatDate
};

export default Api;
