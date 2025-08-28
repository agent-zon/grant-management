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

interface ConsentGrant {
  id: string;
  scope: string;
  description: string;
  granted: boolean;
  grantedAt?: Date;
  expiresAt?: Date;
  sessionId?: string;
  usage: number;
  lastUsed?: Date;
  toolsIncluded: string[];
}

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

interface ConsentRequest {
  id: string;
  agentId: string;
  sessionId: string;
  requestedScopes: string[];
  tools: string[];
  timestamp: Date;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  authorizationLink?: string;
  userResponse?: {
    approvedScopes: string[];
    deniedScopes: string[];
    timestamp: Date;
  };
}

interface ConsentManagementPageProps {
  authStatus: any;
  showAllGrants?: boolean;
}

const ConsentManagementPage: React.FC<ConsentManagementPageProps> = ({ authStatus, showAllGrants }) => {
  const { sessionId, workloadFilter } = useParams<{ sessionId?: string; workloadFilter?: string }>();
  const effectiveWorkloadFilter = workloadFilter || (new URLSearchParams(window.location.search)).get('workload');

  const [grants, setGrants] = useState<ConsentGrant[]>([
    {
      id: '1',
      scope: 'tools:read',
      description: 'Read access to file system tools (ListFiles, ReadFile)',
      granted: true,
      grantedAt: new Date(Date.now() - 3600000),
      sessionId: 'S123',
      usage: 15,
      lastUsed: new Date(Date.now() - 300000),
      toolsIncluded: ['ListFiles', 'ReadFile', 'GetFileInfo']
    },
    {
      id: '2',
      scope: 'tools:write',
      description: 'Write access to file system tools (CreateFile, UpdateFile, DeleteFile)',
      granted: false,
      usage: 0,
      toolsIncluded: ['CreateFile', 'UpdateFile', 'DeleteFile', 'MoveFile']
    },
    {
      id: '3',
      scope: 'data:export',
      description: 'Export user data and generate reports',
      granted: true,
      grantedAt: new Date(Date.now() - 7200000),
      expiresAt: new Date(Date.now() + 86400000),
      sessionId: 'S123',
      usage: 3,
      lastUsed: new Date(Date.now() - 1800000),
      toolsIncluded: ['ExportData', 'GenerateReport', 'CreateBackup']
    },
    {
      id: '4',
      scope: 'system:analyze',
      description: 'System analysis and monitoring tools (SystemCheck, AnalyzeAnomaly)',
      granted: true,
      grantedAt: new Date(Date.now() - 600000),
      sessionId: 'S124',
      usage: 8,
      lastUsed: new Date(Date.now() - 360000),
      toolsIncluded: ['GatherSystemInfo', 'AnalyzeAnomaly', 'SystemCheck', 'HealthMonitor']
    },
    {
      id: '5',
      scope: 'notifications:send',
      description: 'Send notifications and alerts (CreateNotification, SendAlert)',
      granted: true,
      grantedAt: new Date(Date.now() - 420000),
      sessionId: 'S124',
      usage: 5,
      lastUsed: new Date(Date.now() - 360000),
      toolsIncluded: ['CreateNotification', 'SendAlert', 'NotifyStakeholders']
    },
    {
      id: '6',
      scope: 'deployment:hotfix',
      description: 'Deploy emergency hotfixes and patches (DeployHotfix, RollbackPatch)',
      granted: false,
      usage: 0,
      toolsIncluded: ['DeployHotfix', 'RollbackPatch', 'ValidateDeployment']
    },
    {
      id: '7',
      scope: 'payroll:access',
      description: 'Access payroll system and employee data (PayrollQuery, EmployeeData)',
      granted: true,
      grantedAt: new Date(Date.now() - 180000),
      sessionId: 'S126',
      usage: 12,
      lastUsed: new Date(Date.now() - 60000),
      toolsIncluded: ['PayrollQuery', 'EmployeeData', 'SalaryCalculation', 'TaxComputation']
    },
    {
      id: '8',
      scope: 'network:access',
      description: 'Access external APIs and network resources (HttpRequest, ApiCall)',
      granted: true,
      grantedAt: new Date(Date.now() - 3600000),
      expiresAt: new Date(Date.now() + 300000),
      sessionId: 'S125',
      usage: 25,
      lastUsed: new Date(Date.now() - 900000),
      toolsIncluded: ['HttpRequest', 'ApiCall', 'WebhookTrigger', 'DataSync']
    },
    {
      id: '9',
      scope: 'system:admin',
      description: 'Administrative system access (ConfigureSystem, ManageUsers)',
      granted: false,
      usage: 0,
      toolsIncluded: ['ConfigureSystem', 'ManageUsers', 'SystemRestart', 'SecurityConfig']
    },
    {
      id: '10',
      scope: 'database:write',
      description: 'Database write operations (UpdateRecord, DeleteRecord)',
      granted: false,
      usage: 0,
      toolsIncluded: ['UpdateRecord', 'DeleteRecord', 'CreateTable', 'ModifySchema']
    },
    {
      id: '11',
      scope: 'file:backup',
      description: 'File backup and archival operations (CreateBackup, ArchiveFiles)',
      granted: true,
      grantedAt: new Date(Date.now() - 86400000),
      expiresAt: new Date(Date.now() + 7200000),
      sessionId: 'S122',
      usage: 3,
      lastUsed: new Date(Date.now() - 3600000),
      toolsIncluded: ['CreateBackup', 'ArchiveFiles', 'CompressData', 'VerifyBackup']
    },
    {
      id: '12',
      scope: 'analytics:generate',
      description: 'Generate analytics reports and insights (AnalyzeData, CreateReport)',
      granted: true,
      grantedAt: new Date(Date.now() - 7200000),
      sessionId: 'S123',
      usage: 15,
      lastUsed: new Date(Date.now() - 300000),
      toolsIncluded: ['AnalyzeWorkDay', 'GenerateReport', 'CreateInsights', 'DataVisualization']
    }
  ]);

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
        return grant.sessionId === workloadSessionMap[effectiveWorkloadFilter];
      })
    : grants;

  const [displayedGrants, setDisplayedGrants] = useState(filteredGrants);

  // Update displayed grants when filter changes
  useEffect(() => {
    setDisplayedGrants(filteredGrants);
  }, [effectiveWorkloadFilter, grants]);

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

  const [tokens, setTokens] = useState<SessionToken[]>([
    {
      id: 'token-1',
      sessionId: 'S123',
      scopes: ['tools:read', 'data:export'],
      issuedAt: new Date(Date.now() - 3600000),
      expiresAt: new Date(Date.now() + 300000),
      status: 'active',
      usage: 18,
      lastActivity: new Date(Date.now() - 300000)
    }
  ]);

  const [requests, setRequests] = useState<ConsentRequest[]>([
    {
      id: 'req-1',
      agentId: 'agent-A1',
      sessionId: 'S125',
      requestedScopes: ['tools:write', 'system:admin'],
      tools: ['CreateFile', 'ConfigureSystem'],
      timestamp: new Date(Date.now() - 300000),
      status: 'pending',
      authorizationLink: 'https://idp.example.com/auth?scopes=tools:write+system:admin&session=S125'
    }
  ]);

  const toggleGrant = (grantId: string) => {
    setGrants(prev => prev.map(grant => 
      grant.id === grantId 
        ? { 
            ...grant, 
            granted: !grant.granted,
            grantedAt: !grant.granted ? new Date() : undefined,
            sessionId: !grant.granted ? `S${Math.floor(Math.random() * 1000)}` : undefined
          }
        : grant
    ));
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
        
        <div className="space-y-4">
          {displayedGrants.map((grant) => (
            <div key={grant.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    grant.granted ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    {grant.granted ? 
                      <Unlock className="w-5 h-5 text-green-400" /> : 
                      <Lock className="w-5 h-5 text-red-400" />
                    }
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">{grant.scope}</h4>
                    <p className="text-xs text-gray-400">{grant.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs rounded ${
                    grant.granted 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {grant.granted ? 'Granted' : 'Denied'}
                  </span>
                  <button
                    onClick={() => toggleGrant(grant.id)}
                    className={`px-3 py-1 rounded text-xs transition-colors duration-200 ${
                      grant.granted
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {grant.granted ? 'Revoke' : 'Grant'}
                  </button>
                </div>
              </div>

              {/* Grant Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-400">Usage Count</p>
                  <p className="text-sm text-white font-mono">{grant.usage}</p>
                </div>
                {grant.grantedAt && (
                  <div>
                    <p className="text-xs text-gray-400">Granted At</p>
                    <p className="text-sm text-white">{grant.grantedAt.toLocaleString()}</p>
                  </div>
                )}
                {grant.sessionId && (
                  <div>
                    <p className="text-xs text-gray-400">Session</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-white font-mono">{grant.sessionId}</p>
                      <button
                        onClick={() => {
                          // Navigate to workloads page and highlight the specific workload
                          window.dispatchEvent(new CustomEvent('navigateToWorkload', {
                            detail: { sessionId: grant.sessionId }
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

              {/* Included Tools */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Included Tools</p>
                <div className="flex flex-wrap gap-1">
                  {grant.toolsIncluded.map((tool, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
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
                {displayedGrants.filter(g => g.granted).length}
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
              <p className="text-sm text-gray-400">Total Usage</p>
              <p className="text-xl font-bold text-white">
                {displayedGrants.reduce((sum, g) => sum + g.usage, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentManagementPage;