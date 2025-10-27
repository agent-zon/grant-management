// Access token & unauthorized retry -------------------------------------------------
let accessToken = null;
export function setAccessToken(token) { accessToken = token; }
let unauthorizedHandler = null;
export function registerUnauthorizedHandler(fn) { unauthorizedHandler = fn; }
// Base URL -------------------------------------------------------------------------
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3001';
// Internal helpers -----------------------------------------------------------------
function mapServerPolicy(raw) {
    return {
        agentId: raw.agentId || raw.AgentId,
        toolName: raw.toolName || raw.ToolName,
        explicitConsentPolicy: {
            requiresExplicitConsent: raw.explicitConsentPolicy?.requiresExplicitConsent ?? raw.ExplicitConsentPolicy?.RequiresExplicitConsent ?? false,
            consentExpirationMinutes: (() => {
                // Preferred new field (minutes as number)
                const direct = raw.explicitConsentPolicy?.consentExpirationMinutes ?? raw.explicitConsentPolicy?.ConsentExpirationMinutes ?? raw.ExplicitConsentPolicy?.consentExpirationMinutes ?? raw.ExplicitConsentPolicy?.ConsentExpirationMinutes;
                if (direct != null)
                    return typeof direct === 'number' ? direct : parseInt(direct, 10);
                // Backward compatibility: older API returned a time span string (HH:MM:SS) under consentExpiration
                const legacy = raw.explicitConsentPolicy?.consentExpiration ?? raw.ExplicitConsentPolicy?.ConsentExpiration;
                if (!legacy || typeof legacy !== 'string')
                    return null;
                const parts = legacy.split(':');
                if (parts.length < 2)
                    return null;
                const hrs = parseInt(parts[0] || '0', 10);
                const mins = parseInt(parts[1] || '0', 10);
                if (isNaN(hrs) && isNaN(mins))
                    return null;
                return (hrs * 60) + (isNaN(mins) ? 0 : mins);
            })()
        }
    };
}
async function http(path, options = {}, retry = false) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (accessToken)
        headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    if (res.status === 401 && unauthorizedHandler && !retry) {
        try {
            const renewed = await unauthorizedHandler();
            if (renewed)
                return http(path, options, true);
        }
        catch { /* ignore */ }
    }
    if (!res.ok) {
        let details = undefined;
        try {
            details = await res.json();
        }
        catch { }
        throw new Error(details?.message || `Request failed ${res.status}`);
    }
    if (res.status === 204)
        return {};
    return res.json();
}
// Tool Policies --------------------------------------------------------------------
export async function listToolPolicies(agentId) {
    if (!agentId)
        return [];
    const raw = await http(`/agents/${encodeURIComponent(agentId)}/tools`);
    return raw.map(mapServerPolicy);
}
export async function createToolPolicy(agentId, policy) {
    const payload = {
        agentId: policy.agentId,
        toolName: policy.toolName,
        explicitConsentPolicy: {
            requiresExplicitConsent: policy.explicitConsentPolicy.requiresExplicitConsent,
            consentExpirationMinutes: policy.explicitConsentPolicy.consentExpirationMinutes
        }
    };
    await http(`/agents/${encodeURIComponent(agentId)}/tools`, { method: 'POST', body: JSON.stringify(payload) });
    return policy;
}
export async function updateToolPolicy(agentId, policy) {
    const payload = {
        agentId: policy.agentId,
        toolName: policy.toolName,
        explicitConsentPolicy: {
            requiresExplicitConsent: policy.explicitConsentPolicy.requiresExplicitConsent,
            consentExpirationMinutes: policy.explicitConsentPolicy.consentExpirationMinutes
        }
    };
    await http(`/agents/${encodeURIComponent(agentId)}/tools/${encodeURIComponent(policy.toolName)}`, { method: 'PUT', body: JSON.stringify(payload) });
    return policy;
}
// Deprecated: kept for backward compatibility; prefer createToolPolicy / updateToolPolicy
export async function upsertToolPolicy(agentId, policy) {
    const existing = (await listToolPolicies(agentId)).find(p => p.toolName.toLowerCase() === policy.toolName.toLowerCase());
    if (existing)
        return updateToolPolicy(agentId, policy);
    return createToolPolicy(agentId, policy);
}
export async function deleteToolPolicy(agentId, toolName) {
    await http(`/agents/${encodeURIComponent(agentId)}/tools/${encodeURIComponent(toolName)}`, { method: 'DELETE' });
}
export async function listGrants(filter = {}) {
    const params = new URLSearchParams();
    if (filter.status)
        params.set('status', filter.status);
    if (filter.session_id)
        params.set('session_id', filter.session_id);
    const qs = params.toString();
    return http(`/grants${qs ? `?${qs}` : ''}`);
}
export async function revokeGrant(id) {
    await http(`/grants/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
// Grant Requests -------------------------------------------------------------------
export async function listGrantRequests(status) {
    const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
    return http(`/grant-requests${qs}`);
}
export async function createGrantRequest(input) {
    return http(`/grant-requests`, { method: 'POST', body: JSON.stringify(input) });
}
export async function decideGrantRequest(id, decision) {
    return http(`/grant-requests/${encodeURIComponent(id)}/respond`, { method: 'POST', body: JSON.stringify(decision) });
}
// Utilities ------------------------------------------------------------------------
export function formatDate(iso) {
    if (!iso)
        return '-';
    try {
        return new Date(iso).toLocaleString();
    }
    catch {
        return iso;
    }
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
