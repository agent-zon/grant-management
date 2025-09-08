// API service layer for grant management
const API_BASE_URL = 'http://localhost:3001';

interface Grant {
  id: string;
  client_id: string;
  user_id: string;
  scope: string;
  status: 'active' | 'revoked' | 'expired';
  created_at: string;
  updated_at: string;
  expires_at?: string;
  session_id?: string;
  workload_id?: string;
  grant_data?: any;
}

interface ConsentRequest {
  id: string;
  agent_id: string;
  session_id: string;
  requested_scopes: string[];
  tools: string[];
  status: 'pending' | 'approved' | 'denied' | 'expired';
  created_at: string;
  expires_at: string;
  authorization_link: string;
  workload_id?: string;
  reason?: string;
  user_response?: {
    approved_scopes: string[];
    denied_scopes: string[];
    timestamp: string;
  };
}

interface AuditLog {
  id: string;
  grant_id?: string;
  action: string;
  actor: string;
  timestamp: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
}

class GrantManagementAPI {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }

  // Grant management
  async getGrants(params?: { status?: string; session_id?: string }): Promise<Grant[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.session_id) queryParams.append('session_id', params.session_id);
    
    const query = queryParams.toString();
    return this.request(`/grants${query ? `?${query}` : ''}`);
  }

  async getGrant(grantId: string): Promise<Grant> {
    return this.request(`/grants/${grantId}`);
  }

  async createGrant(data: {
    user_id: string;
    scope: string;
    session_id?: string;
    workload_id?: string;
    expires_at?: string;
    grant_data?: any;
  }): Promise<Grant> {
    return this.request('/grants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGrant(grantId: string, data: {
    scope?: string;
    grant_data?: any;
  }): Promise<Grant> {
    return this.request(`/grants/${grantId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async revokeGrant(grantId: string): Promise<void> {
    return this.request(`/grants/${grantId}`, {
      method: 'DELETE',
    });
  }

  // Consent management
  async getConsentRequests(): Promise<ConsentRequest[]> {
    return this.request('/consent-requests');
  }

  async createConsentRequest(data: {
    agent_id: string;
    session_id: string;
    requested_scopes: string[];
    tools: string[];
    workload_id?: string;
    reason?: string;
  }): Promise<ConsentRequest> {
    return this.request('/consent-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async respondToConsentRequest(requestId: string, data: {
    status: 'approved' | 'denied';
    approved_scopes?: string[];
    denied_scopes?: string[];
  }): Promise<{ success: boolean; status: string }> {
    return this.request(`/consent/${requestId}/respond`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get consent screen URL for agents
  getConsentScreenUrl(requestId: string): string {
    return `${this.baseUrl}/consent/${requestId}`;
  }

  // Audit logs
  async getAuditLogs(params?: { grant_id?: string; limit?: number }): Promise<AuditLog[]> {
    const queryParams = new URLSearchParams();
    if (params?.grant_id) queryParams.append('grant_id', params.grant_id);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return this.request(`/audit${query ? `?${query}` : ''}`);
  }
}

// Create singleton instance
export const grantAPI = new GrantManagementAPI();

// Export types
export type { Grant, ConsentRequest, AuditLog };

// Utility functions for working with grants
export const GrantUtils = {
  // Parse scope string into array
  parseScopes: (scope: string): string[] => {
    return scope.split(' ').filter(s => s.length > 0);
  },

  // Join scopes array into string
  joinScopes: (scopes: string[]): string => {
    return scopes.join(' ');
  },

  // Check if grant is expired
  isExpired: (grant: Grant): boolean => {
    if (!grant.expires_at) return false;
    return new Date(grant.expires_at) < new Date();
  },

  // Check if grant is active
  isActive: (grant: Grant): boolean => {
    return grant.status === 'active' && !GrantUtils.isExpired(grant);
  },

  // Get grant status with expiration check
  getEffectiveStatus: (grant: Grant): string => {
    if (grant.status !== 'active') return grant.status;
    return GrantUtils.isExpired(grant) ? 'expired' : 'active';
  },

  // Format grant for display
  formatGrantForDisplay: (grant: Grant) => ({
    ...grant,
    scopes: GrantUtils.parseScopes(grant.scope),
    effectiveStatus: GrantUtils.getEffectiveStatus(grant),
    isExpired: GrantUtils.isExpired(grant),
    isActive: GrantUtils.isActive(grant),
  }),

  // Get scope descriptions
  getScopeDescription: (scope: string): string => {
    const descriptions: Record<string, string> = {
      'tools:read': 'Read access to file system tools (ListFiles, ReadFile)',
      'tools:write': 'Write access to file system tools (CreateFile, UpdateFile, DeleteFile)',
      'tools:execute': 'Execute system tools and commands',
      'data:export': 'Export user data and generate reports',
      'system:analyze': 'System analysis and monitoring tools',
      'system:admin': 'Administrative system access',
      'network:access': 'Access external APIs and network resources',
      'notifications:send': 'Send notifications and alerts',
      'payroll:access': 'Access payroll and employee data',
      'database:write': 'Database write operations',
    };
    return descriptions[scope] || 'Custom permission scope';
  },

  // Get tool descriptions
  getToolDescription: (tool: string): string => {
    const descriptions: Record<string, string> = {
      'ListFiles': 'List files and directories',
      'ReadFile': 'Read file contents',
      'CreateFile': 'Create new files',
      'UpdateFile': 'Modify existing files',
      'DeleteFile': 'Remove files',
      'MoveFile': 'Move and rename files',
      'ExportData': 'Export data to various formats',
      'GenerateReport': 'Create analytical reports',
      'CreateBackup': 'Create data backups',
      'SystemCheck': 'Perform system health checks',
      'AnalyzeAnomaly': 'Detect system anomalies',
      'HealthMonitor': 'Monitor system health',
      'SendAlert': 'Send system alerts',
      'CreateNotification': 'Create user notifications',
      'NotifyStakeholders': 'Notify relevant stakeholders',
      'HttpRequest': 'Make HTTP requests to external APIs',
      'ApiCall': 'Call external API endpoints',
      'WebhookTrigger': 'Trigger webhook notifications',
      'DataSync': 'Synchronize data between systems',
    };
    return descriptions[tool] || 'Custom tool access';
  },
};

export default grantAPI;
