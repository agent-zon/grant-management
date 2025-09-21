import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Shield, 
  User, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Key,
  Lock,
  Unlock,
  Eye,
  Settings,
  Activity,
  FileText,
  Globe,
  Database
} from 'lucide-react';
import { grantAPI, Grant, GrantUtils } from '../services/api';

interface SessionToken {
  id: string;
  sessionId: string;
  scopes: string[];
  issuedAt: Date;
  expiresAt: Date;
  status: 'active' | 'expired' | 'revoked';
  usage: number;
  lastActivity?: Date;
}

interface ConsentManagementPageProps {
  authStatus: any;
  showAllGrants?: boolean;
}

const ConsentManagementPage: React.FC<ConsentManagementPageProps> = ({ authStatus, showAllGrants }) => {
  const { sessionId, workloadFilter } = useParams<{ sessionId?: string; workloadFilter?: string }>();
  const effectiveWorkloadFilter = workloadFilter || (new URLSearchParams(window.location.search)).get('workload');

  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize API with auth token
  useEffect(() => {
    if (authStatus?.token) {
      grantAPI.setToken(authStatus.token);
    }
  }, [authStatus]);

  // Load grants from API
  useEffect(() => {
    const loadGrants = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params: any = {};
        if (effectiveWorkloadFilter) {
          params.session_id = getSessionIdForWorkload(effectiveWorkloadFilter);
        }
        
        const fetchedGrants = await grantAPI.getGrants(params);
        setGrants(fetchedGrants);
      } catch (err) {
        console.error('Error loading grants:', err);
        setError(err instanceof Error ? err.message : 'Failed to load grants');
        // Fallback to mock data if API fails
        setGrants(mockGrants);
      } finally {
        setLoading(false);
      }
    };

    loadGrants();
  }, [effectiveWorkloadFilter]);

  // Helper function to map workload IDs to session IDs
  const getSessionIdForWorkload = (workloadId: string): string => {
    const workloadSessionMap: Record<string, string> = {
      'wl-001': 'S123', // Daily Work Analysis
      'wl-002': 'S124', // System Anomaly Response
      'wl-004': 'S125', // File Management Assistant
      'wl-005': 'S126', // Payroll Assistance Chat
    };
    return workloadSessionMap[workloadId] || workloadId;
  };

  // Mock data for fallback
  const mockGrants: Grant[] = [
    {
      id: '1',
      client_id: 'demo-client',
      user_id: 'demo-user',
      scope: 'tools:read',
      status: 'active',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 300000).toISOString(),
      session_id: 'S123',
    },
    {
      id: '2',
      client_id: 'demo-client',
      user_id: 'demo-user',
      scope: 'tools:write',
      status: 'revoked',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '3',
      client_id: 'demo-client',
      user_id: 'demo-user',
      scope: 'data:export',
      status: 'active',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 1800000).toISOString(),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      session_id: 'S123',
    }
  ];

  // Filter grants based on workload parameter
  const filteredGrants = effectiveWorkloadFilter 
    ? grants.filter(grant => {
        // Map workload IDs to their associated session IDs
        const workloadSessionMap: Record<string, string> = {
          'wl-001': 'S123', // Daily Work Analysis
          'wl-002': 'S124', // System Anomaly Response
          'wl-004': 'S125', // File Management Assistant
          'wl-005': 'S126', // Payroll Assistance Chat
        };
        return grant.session_id === workloadSessionMap[effectiveWorkloadFilter];
      })
    : grants;

  const [displayedGrants, setDisplayedGrants] = useState<Grant[]>([]);

  // Update displayed grants when filter changes
  useEffect(() => {
    setDisplayedGrants(filteredGrants);
  }, [filteredGrants]);

  // Get workload name for filter display
  const getWorkloadName = (workloadId: string) => {
    const workloadNames: Record<string, string> = {
      'wl-001': 'Daily Work Analysis & Reports',
      'wl-002': 'System Anomaly Response',
      'wl-004': 'File Management Assistant',
      'wl-005': 'Payroll Assistance Chat',
    };
    return workloadNames[workloadId] || workloadId;
  };

  // Mock data for tokens (in real implementation, fetch from API)
  const tokens = [
    {
      id: 'token-1',
      sessionId: 'S123',
      scopes: ['tools:read', 'data:export'],
      issuedAt: new Date(Date.now() - 3600000),
      expiresAt: new Date(Date.now() + 300000),
      status: 'active' as const,
      usage: 18,
      lastActivity: new Date(Date.now() - 300000)
    }
  ];

  // Mock data for requests (in real implementation, fetch from API)
  const requests = [
    {
      id: 'req-1',
      agentId: 'agent-A1',
      sessionId: 'S125',
      requestedScopes: ['tools:write', 'system:admin'],
      tools: ['CreateFile', 'ConfigureSystem'],
      timestamp: new Date(Date.now() - 300000),
      status: 'pending' as const,
      authorizationLink: 'https://idp.example.com/auth?scopes=tools:write+system:admin&session=S125'
    }
  ];

  const toggleGrant = async (grantId: string) => {
    try {
      const grant = grants.find(g => g.id === grantId);
      if (!grant) return;

      if (grant.status === 'active') {
        // Revoke the grant
        await grantAPI.revokeGrant(grantId);
        setGrants(prev => prev.map(g => 
          g.id === grantId 
            ? { ...g, status: 'revoked' as const, updated_at: new Date().toISOString() }
            : g
        ));
      } else {
        // For demo purposes, we'll create a new grant instead of reactivating
        // In a real system, you might have a reactivate endpoint
        const newGrant = await grantAPI.createGrant({
          user_id: grant.user_id,
          scope: grant.scope,
          session_id: grant.session_id,
          workload_id: grant.workload_id
        });
        
        // Remove old grant and add new one
        setGrants(prev => prev.filter(g => g.id !== grantId).concat(newGrant));
      }
    } catch (err) {
      console.error('Error toggling grant:', err);
      setError(err instanceof Error ? err.message : 'Failed to update grant');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': case 'approved': case 'granted': return 'text-green-400';
      case 'expired': case 'denied': return 'text-red-400';
      case 'pending': return 'text-yellow-400';
      case 'revoked': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': case 'approved': case 'granted': return <CheckCircle className="w-4 h-4" />;
      case 'expired': case 'denied': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'revoked': return <Lock className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              {showAllGrants ? 'All User Grants' : sessionId ? `Session ${sessionId} Grants` : 'Grant Management Dashboard'}
            </h2>
            {sessionId && !showAllGrants && (
              <p className="text-sm text-blue-400 mt-1">
                Session-specific consent grants
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-400">Live Monitoring</span>
          </div>
        </div>
      </div>

      {/* Consent Grants Content */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Your Consent Grants</h3>
          {effectiveWorkloadFilter && (
            <button
              onClick={() => window.history.back()}
              className="text-sm text-blue-400 hover:text-blue-300 underline"
            >
              ← Back to All Grants
            </button>
          )}
        </div>
        
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading grants...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
            <p className="text-red-400">⚠️ {error}</p>
            <p className="text-sm text-gray-400 mt-1">Showing cached data if available</p>
          </div>
        )}

        <div className="space-y-4">
          {displayedGrants.map((grant) => {
            const formattedGrant = GrantUtils.formatGrantForDisplay(grant);
            const scopes = GrantUtils.parseScopes(grant.scope);
            const isGranted = grant.status === 'active';
            
            return (
              <div key={grant.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      isGranted ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {isGranted ? 
                        <Unlock className="w-5 h-5 text-green-400" /> : 
                        <Lock className="w-5 h-5 text-red-400" />
                      }
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white">{grant.scope}</h4>
                      <p className="text-xs text-gray-400">{GrantUtils.getScopeDescription(grant.scope)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs rounded ${
                      isGranted 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {formattedGrant.effectiveStatus}
                    </span>
                    <button
                      onClick={() => toggleGrant(grant.id)}
                      className={`px-3 py-1 rounded text-xs transition-colors duration-200 ${
                        isGranted
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {isGranted ? 'Revoke' : 'Grant'}
                    </button>
                  </div>
                </div>

                {/* Grant Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-400">Status</p>
                    <p className="text-sm text-white font-mono capitalize">{formattedGrant.effectiveStatus}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Created At</p>
                    <p className="text-sm text-white">{new Date(grant.created_at).toLocaleString()}</p>
                  </div>
                  {grant.expires_at && (
                    <div>
                      <p className="text-xs text-gray-400">Expires At</p>
                      <p className="text-sm text-white">{new Date(grant.expires_at).toLocaleString()}</p>
                    </div>
                  )}
                  {grant.session_id && (
                    <div>
                      <p className="text-xs text-gray-400">Session</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-white font-mono">{grant.session_id}</p>
                        <button
                          onClick={() => {
                            // Navigate to workloads page and highlight the specific workload
                            window.dispatchEvent(new CustomEvent('navigateToWorkload', {
                              detail: { sessionId: grant.session_id }
                            }));
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors duration-200"
                          title="View workload details"
                        >
                          View Workload
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scopes */}
                <div>
                  <p className="text-xs text-gray-400 mb-2">Granted Scopes</p>
                  <div className="flex flex-wrap gap-1">
                    {scopes.map((scope, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded"
                        title={GrantUtils.getScopeDescription(scope)}
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Active Grants</p>
              <p className="text-xl font-bold text-white">
                {displayedGrants.filter(g => g.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Key className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Active Tokens</p>
              <p className="text-xl font-bold text-white">
                {tokens.filter(t => t.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Pending Requests</p>
              <p className="text-xl font-bold text-white">
                {requests.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Grants</p>
              <p className="text-xl font-bold text-white">
                {displayedGrants.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentManagementPage;