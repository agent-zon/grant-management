import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Shield, 
  User, 
  Bot, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Key,
  AlertTriangle,
  Filter,
  Download,
  Search
} from 'lucide-react';

interface AuditEntry {
  id: string;
  timestamp: Date;
  type: 'consent_granted' | 'consent_denied' | 'token_issued' | 'token_expired' | 'tool_blocked' | 'workload_started' | 'workload_completed';
  actor: 'user' | 'agent' | 'system' | 'guard';
  actorId: string;
  sessionId: string;
  workloadId?: string;
  message: string;
  details: any;
  severity: 'info' | 'warning' | 'error' | 'success';
}

interface AuditLogPageProps {
  entries?: AuditEntry[];
}

const AuditLogPage: React.FC<AuditLogPageProps> = ({ entries: propEntries }) => {
  const [entries, setEntries] = useState<AuditEntry[]>(propEntries || [
    {
      id: 'audit-1',
      timestamp: new Date(Date.now() - 180000),
      type: 'consent_granted',
      actor: 'user',
      actorId: 'john.smith',
      sessionId: 'S126',
      workloadId: 'wl-005',
      message: 'User granted consent for scopes: payroll:access, data:export',
      details: {
        scopes: ['payroll:access', 'data:export'],
        tools: ['PayrollQuery', 'EmployeeData', 'ExportData'],
        duration: '15 minutes'
      },
      severity: 'success'
    },
    {
      id: 'audit-2',
      timestamp: new Date(Date.now() - 120000),
      type: 'token_issued',
      actor: 'system',
      actorId: 'mcp-guard',
      sessionId: 'S126',
      workloadId: 'wl-005',
      message: 'Session token issued for granted scopes',
      details: {
        tokenId: 'token-def456',
        scopes: ['payroll:access', 'data:export'],
        expiresAt: new Date(Date.now() + 600000)
      },
      severity: 'info'
    },
    {
      id: 'audit-3',
      timestamp: new Date(Date.now() - 300000),
      type: 'consent_denied',
      actor: 'user',
      actorId: 'john.smith',
      sessionId: 'S124',
      workloadId: 'wl-002',
      message: 'User denied consent for scope: deployment:hotfix',
      details: {
        requestedScopes: ['deployment:hotfix'],
        deniedScopes: ['deployment:hotfix'],
        reason: 'User chose to manually review hotfix before deployment'
      },
      severity: 'warning'
    },
    {
      id: 'audit-4',
      timestamp: new Date(Date.now() - 420000),
      type: 'tool_blocked',
      actor: 'system',
      actorId: 'mcp-guard',
      sessionId: 'S124',
      workloadId: 'wl-002',
      message: 'Tool execution blocked: DeployHotfix - insufficient scope',
      details: {
        tool: 'DeployHotfix',
        requiredScope: 'deployment:hotfix',
        availableScopes: ['system:analyze', 'notifications:send'],
        httpStatus: 403
      },
      severity: 'error'
    },
    {
      id: 'audit-5',
      timestamp: new Date(Date.now() - 600000),
      type: 'workload_started',
      actor: 'system',
      actorId: 'grafana-webhook',
      sessionId: 'S124',
      workloadId: 'wl-002',
      message: 'System anomaly response workload initiated by Grafana alert',
      details: {
        trigger: 'grafana_alert',
        alertName: 'High CPU Usage',
        severity: 'critical',
        affectedService: 'prod-server-03'
      },
      severity: 'warning'
    },
    {
      id: 'audit-6',
      timestamp: new Date(Date.now() - 900000),
      type: 'consent_granted',
      actor: 'user',
      actorId: 'john.smith',
      sessionId: 'S125',
      workloadId: 'wl-004',
      message: 'User granted consent for scopes: tools:read, tools:write',
      details: {
        scopes: ['tools:read', 'tools:write'],
        tools: ['ListFiles', 'ReadFile', 'CreateFile', 'UpdateFile'],
        duration: '15 minutes'
      },
      severity: 'success'
    },
    {
      id: 'audit-7',
      timestamp: new Date(Date.now() - 1200000),
      type: 'token_expired',
      actor: 'system',
      actorId: 'mcp-guard',
      sessionId: 'S123',
      workloadId: 'wl-001',
      message: 'Session token expired for completed workload',
      details: {
        tokenId: 'token-abc123',
        originalScopes: ['tools:read', 'data:export', 'tools:write', 'notifications:send'],
        lifetimeMinutes: 15,
        toolsExecuted: 18
      },
      severity: 'info'
    },
    {
      id: 'audit-8',
      timestamp: new Date(Date.now() - 1800000),
      type: 'workload_completed',
      actor: 'agent',
      actorId: 'agent-A1',
      sessionId: 'S123',
      workloadId: 'wl-001',
      message: 'Daily work analysis workload completed successfully',
      details: {
        duration: '4 minutes 23 seconds',
        toolsUsed: ['AnalyzeWorkDay', 'GenerateReport', 'CreateActionItems', 'SendNotification'],
        tasksCompleted: 23,
        reportsGenerated: 1,
        actionItemsCreated: 5
      },
      severity: 'success'
    },
    {
      id: 'audit-9',
      timestamp: new Date(Date.now() - 2400000),
      type: 'consent_granted',
      actor: 'user',
      actorId: 'john.smith',
      sessionId: 'S123',
      workloadId: 'wl-001',
      message: 'User granted consent for scopes: tools:read, data:export, tools:write, notifications:send',
      details: {
        scopes: ['tools:read', 'data:export', 'tools:write', 'notifications:send'],
        tools: ['AnalyzeWorkDay', 'GenerateReport', 'CreateActionItems', 'SendNotification'],
        duration: '15 minutes',
        trigger: 'cron_job'
      },
      severity: 'success'
    },
    {
      id: 'audit-10',
      timestamp: new Date(Date.now() - 3000000),
      type: 'workload_started',
      actor: 'system',
      actorId: 'cron-scheduler',
      sessionId: 'S123',
      workloadId: 'wl-001',
      message: 'Daily work analysis cron job triggered',
      details: {
        trigger: 'cron',
        schedule: '0 18 * * 1-5',
        description: 'Every weekday at 6:00 PM'
      },
      severity: 'info'
    },
    {
      id: 'audit-11',
      timestamp: new Date(Date.now() - 7200000),
      type: 'tool_blocked',
      actor: 'system',
      actorId: 'mcp-guard',
      sessionId: 'S122',
      message: 'Tool execution blocked: CreateFile - no active session token',
      details: {
        tool: 'CreateFile',
        requiredScope: 'tools:write',
        reason: 'No valid session token found',
        httpStatus: 401
      },
      severity: 'error'
    },
    {
      id: 'audit-12',
      timestamp: new Date(Date.now() - 10800000),
      type: 'consent_denied',
      actor: 'user',
      actorId: 'john.smith',
      sessionId: 'S121',
      message: 'User denied consent for scope: system:admin',
      details: {
        requestedScopes: ['system:admin', 'tools:write'],
        approvedScopes: ['tools:write'],
        deniedScopes: ['system:admin'],
        reason: 'Administrative access requires additional approval'
      },
      severity: 'warning'
    }
  ]);

  const [filteredEntries, setFilteredEntries] = useState<AuditEntry[]>(entries);
  const [filters, setFilters] = useState({
    type: 'all',
    actor: 'all',
    severity: 'all',
    sessionId: '',
    workloadId: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Apply filters
  useEffect(() => {
    let filtered = entries;

    if (filters.type !== 'all') {
      filtered = filtered.filter(entry => entry.type === filters.type);
    }

    if (filters.actor !== 'all') {
      filtered = filtered.filter(entry => entry.actor === filters.actor);
    }

    if (filters.severity !== 'all') {
      filtered = filtered.filter(entry => entry.severity === filters.severity);
    }

    if (filters.sessionId) {
      filtered = filtered.filter(entry => entry.sessionId.toLowerCase().includes(filters.sessionId.toLowerCase()));
    }

    if (filters.workloadId) {
      filtered = filtered.filter(entry => entry.workloadId?.toLowerCase().includes(filters.workloadId.toLowerCase()));
    }

    if (searchTerm) {
      filtered = filtered.filter(entry => 
        entry.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.actorId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEntries(filtered);
  }, [entries, filters, searchTerm]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'consent_granted': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'consent_denied': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'token_issued': return <Key className="w-4 h-4 text-blue-400" />;
      case 'token_expired': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'tool_blocked': return <Shield className="w-4 h-4 text-orange-400" />;
      case 'workload_started': return <Bot className="w-4 h-4 text-purple-400" />;
      case 'workload_completed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      case 'info': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const exportAuditLog = () => {
    const csvContent = [
      ['Timestamp', 'Type', 'Actor', 'Session', 'Workload', 'Message'],
      ...filteredEntries.map(entry => [
        entry.timestamp.toISOString(),
        entry.type,
        `${entry.actor}:${entry.actorId}`,
        entry.sessionId,
        entry.workloadId || '',
        entry.message
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Consent Vault</h2>
            <p className="text-sm text-gray-400">Track all consent decisions and system events</p>
          </div>
          <button
            onClick={exportAuditLog}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors duration-200"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="consent_granted">Consent Granted</option>
              <option value="consent_denied">Consent Denied</option>
              <option value="token_issued">Token Issued</option>
              <option value="token_expired">Token Expired</option>
              <option value="tool_blocked">Tool Blocked</option>
              <option value="workload_started">Workload Started</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full bg-gray-700 border border-gray-600 rounded px-10 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Audit Entries */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
        <div className="p-4 border-b border-gray-600">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Audit Entries</h3>
            <span className="text-sm text-gray-400">
              Showing {filteredEntries.length} of {entries.length} entries
            </span>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No audit entries match your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="p-4 hover:bg-gray-700/30 transition-colors duration-200">
                  <div className="flex items-start space-x-4">
                    {/* Type Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getTypeIcon(entry.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-white capitalize">
                            {entry.type.replace('_', ' ')}
                          </span>
                          <div className="flex items-center space-x-1 px-2 py-1 bg-gray-600/50 rounded text-xs">
                            <User className="w-3 h-3" />
                            <span className="text-gray-300">{entry.actorId}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-400">
                          <span>Session: {entry.sessionId}</span>
                          {entry.workloadId && <span>Workload: {entry.workloadId}</span>}
                          <span>{entry.timestamp.toLocaleString()}</span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-300 mb-2">{entry.message}</p>

                      {/* Details */}
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <div className="bg-gray-700/50 rounded p-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            {Object.entries(entry.details).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-400 capitalize">{key.replace('_', ' ')}:</span>
                                <span className="text-gray-300 font-mono">
                                  {Array.isArray(value) ? value.join(', ') : 
                                   value instanceof Date ? value.toLocaleString() :
                                   typeof value === 'object' ? JSON.stringify(value) :
                                   String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Severity Indicator */}
                    <div className={`flex-shrink-0 ${getSeverityColor(entry.severity)}`}>
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogPage;