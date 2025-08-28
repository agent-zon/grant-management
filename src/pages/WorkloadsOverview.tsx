import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Pause,
  Play,
  Shield,
  User,
  Bot,
  Zap,
  FileText,
  Database,
  Globe,
  Settings,
  MessageCircle,
  ExternalLink
} from 'lucide-react';

interface Workload {
  id: string;
  name: string;
  description: string;
  type: 'data_analysis' | 'system_config' | 'report_generation' | 'chat' | 'scheduled_task' | 'cron' | 'event';
  status: 'running' | 'pending_consent' | 'completed' | 'failed' | 'paused';
  progress: number;
  startedAt: Date;
  estimatedCompletion?: Date;
  completedAt?: Date;
  requiredScopes: string[];
  grantedScopes: string[];
  pendingScopes: string[];
  tools: string[];
  agentId: string;
  sessionId: string;
  logs: WorkloadLog[];
  trigger: {
    type: 'chat' | 'cron' | 'event' | 'grafana_alert';
    description: string;
    details?: string;
  };
  prompt?: {
    original: string;
    processed: string;
    parameters: Record<string, any>;
    context: string;
  };
}

interface WorkloadLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: any;
}

interface WorkloadsOverviewProps {
  onConsentRequest: (workloadId: string, scopes: string[]) => void;
}

const WorkloadsOverview: React.FC<WorkloadsOverviewProps> = ({ onConsentRequest }) => {
  const navigate = useNavigate();
  const [workloads, setWorkloads] = useState<Workload[]>([
    {
      id: 'wl-001',
      name: 'Daily Work Analysis & Reports',
      description: 'Analyze work day productivity, generate reports, and create action items',
      type: 'cron',
      status: 'completed',
      progress: 100,
      startedAt: new Date(Date.now() - 300000),
      completedAt: new Date(Date.now() - 60000),
      requiredScopes: ['tools:read', 'data:export', 'tools:write', 'notifications:send'],
      grantedScopes: ['tools:read', 'data:export', 'tools:write', 'notifications:send'],
      pendingScopes: [],
      tools: ['AnalyzeWorkDay', 'GenerateReport', 'CreateActionItems', 'SendNotification'],
      agentId: 'agent-A1',
      sessionId: 'S123',
      trigger: {
        type: 'cron',
        description: 'Daily work analysis scheduled task',
        details: 'Triggered by cron job: 0 18 * * 1-5 (Every weekday at 6:00 PM)'
      },
      logs: [
        {
          id: 'log-1',
          timestamp: new Date(Date.now() - 300000),
          level: 'info',
          message: 'Daily work analysis started - analyzing productivity metrics'
        },
        {
          id: 'log-2',
          timestamp: new Date(Date.now() - 240000),
          level: 'success',
          message: 'Successfully analyzed 8 hours of work data, 23 tasks completed'
        },
        {
          id: 'log-3',
          timestamp: new Date(Date.now() - 120000),
          level: 'success',
          message: 'Generated daily productivity report and created 5 action items'
        },
        {
          id: 'log-4',
          timestamp: new Date(Date.now() - 60000),
          level: 'success',
          message: 'Daily analysis completed - report sent to team leads'
        }
      ]
    },
    {
      id: 'wl-002',
      name: 'System Anomaly Response',
      description: 'Grafana alert triggered - analyzing system anomaly and preparing hotfix',
      type: 'event',
      status: 'pending_consent',
      progress: 75,
      startedAt: new Date(Date.now() - 600000),
      estimatedCompletion: new Date(Date.now() + 300000),
      requiredScopes: ['system:analyze', 'notifications:send', 'deployment:hotfix'],
      grantedScopes: ['system:analyze', 'notifications:send'],
      pendingScopes: ['deployment:hotfix'],
      tools: ['GatherSystemInfo', 'AnalyzeAnomaly', 'CreateNotification', 'DeployHotfix'],
      agentId: 'agent-SRE',
      sessionId: 'S124',
      trigger: {
        type: 'grafana_alert',
        description: 'High CPU usage anomaly detected',
        details: 'Grafana Alert: CPU usage >95% for 5+ minutes on prod-server-03'
      },
      logs: [
        {
          id: 'log-5',
          timestamp: new Date(Date.now() - 600000),
          level: 'warning',
          message: 'Grafana alert received - CPU anomaly detected on prod-server-03'
        },
        {
          id: 'log-6',
          timestamp: new Date(Date.now() - 540000),
          level: 'info',
          message: 'Gathering system information and analyzing anomaly patterns'
        },
        {
          id: 'log-7',
          timestamp: new Date(Date.now() - 480000),
          level: 'success',
          message: 'Root cause identified: Memory leak in payment-service v2.1.3'
        },
        {
          id: 'log-8',
          timestamp: new Date(Date.now() - 420000),
          level: 'success',
          message: 'Downtime notification sent to stakeholders'
        },
        {
          id: 'log-9',
          timestamp: new Date(Date.now() - 360000),
          level: 'info',
          message: 'Hotfix prepared: payment-service v2.1.4 - requires deployment consent'
        }
      ]
    },
    {
      id: 'wl-004',
      name: 'File Management Assistant',
      description: 'Assist with file management operations and organization',
      type: 'chat',
      status: 'running',
      progress: 60,
      startedAt: new Date(Date.now() - 1200000),
      requiredScopes: ['tools:read', 'tools:write', 'data:export'],
      grantedScopes: ['tools:read'],
      pendingScopes: ['tools:write', 'data:export'],
      tools: ['ListFiles', 'ReadFile', 'CreateFile', 'ExportData'],
      agentId: 'agent-CHAT',
      sessionId: 'S125',
      trigger: {
        type: 'chat',
        description: 'User requested help with file management',
        details: 'User needs assistance organizing and managing project files'
      },
      prompt: {
        original: 'Help me organize my project files and clean up the directory structure',
        processed: 'File management assistance: 1) Analyze current file structure 2) Identify organization opportunities 3) Propose cleanup actions 4) Execute approved file operations',
        parameters: {
          chatTitle: 'File Management Assistant',
          taskType: 'file_organization',
          targetDirectory: '/projects/',
          cleanupMode: true
        },
        context: 'User needs help organizing project files and improving directory structure'
      },
      logs: [
        {
          id: 'log-10',
          timestamp: new Date(Date.now() - 1200000),
          level: 'info',
          message: 'File management chat session started'
        },
        {
          id: 'log-11',
          timestamp: new Date(Date.now() - 900000),
          level: 'success',
          message: 'File structure analysis completed'
        },
        {
          id: 'log-12',
          timestamp: new Date(Date.now() - 300000),
          level: 'warning',
          message: 'Consent required for file write operations'
        }
      ]
    },
    {
      id: 'wl-005',
      name: 'Payroll Assistance Chat',
      description: 'Assist with payroll processing and employee data management',
      type: 'chat',
      status: 'pending_consent',
      progress: 10,
      startedAt: new Date(Date.now() - 180000),
      requiredScopes: ['tools:read', 'data:export', 'payroll:access'],
      grantedScopes: [],
      pendingScopes: ['tools:read', 'data:export', 'payroll:access'],
      tools: ['ReadFile', 'ExportData', 'PayrollQuery', 'EmployeeData'],
      agentId: 'agent-PAYROLL',
      sessionId: 'S126',
      trigger: {
        type: 'chat',
        description: 'User requested help with payroll processing',
        details: 'User needs assistance with payroll calculations and employee data export'
      },
      prompt: {
        original: 'Help me process this month\'s payroll and export employee salary data',
        processed: 'Payroll assistance: 1) Access payroll system 2) Calculate monthly salaries 3) Validate employee data 4) Export payroll reports',
        parameters: {
          chatTitle: 'Payroll Assistance Chat',
          payrollPeriod: 'December 2024',
          employeeCount: 247,
          exportFormat: 'CSV'
        },
        context: 'User needs help processing monthly payroll and exporting employee salary data'
      },
      logs: [
        {
          id: 'log-13',
          timestamp: new Date(Date.now() - 180000),
          level: 'info',
          message: 'Payroll assistance chat session initiated'
        },
        {
          id: 'log-14',
          timestamp: new Date(Date.now() - 120000),
          level: 'warning',
          message: 'Consent required for payroll:access and data:export scopes'
        },
        {
          id: 'log-15',
          timestamp: new Date(Date.now() - 60000),
          level: 'info',
          message: 'Waiting for user consent to access payroll system'
        }
      ]
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-400';
      case 'pending_consent': return 'text-yellow-400';
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'paused': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="w-4 h-4" />;
      case 'pending_consent': return <Shield className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'data_analysis': return <Database className="w-4 h-4" />;
      case 'system_config': return <Settings className="w-4 h-4" />;
      case 'report_generation': return <FileText className="w-4 h-4" />;
      case 'chat': return <MessageCircle className="w-4 h-4" />;
      case 'scheduled_task': return <Clock className="w-4 h-4" />;
      case 'cron': return <Clock className="w-4 h-4" />;
      case 'event': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'data_analysis': return 'bg-blue-500/20 text-blue-400';
      case 'system_config': return 'bg-red-500/20 text-red-400';
      case 'report_generation': return 'bg-green-500/20 text-green-400';
      case 'chat': return 'bg-purple-500/20 text-purple-400';
      case 'scheduled_task': return 'bg-yellow-500/20 text-yellow-400';
      case 'cron': return 'bg-yellow-500/20 text-yellow-400';
      case 'event': return 'bg-orange-500/20 text-orange-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const handleRequestConsent = (workloadId: string) => {
    const workload = workloads.find(w => w.id === workloadId);
    if (workload && workload.pendingScopes.length > 0) {
      onConsentRequest(workloadId, workload.pendingScopes);
    }
  };

  const handleNavigateToChat = (workloadId: string) => {
    // Map workload ID to session ID
    const workloadSessionMap: Record<string, string> = {
      'wl-001': 'S123',
      'wl-002': 'S124', 
      'wl-004': 'S125',
      'wl-005': 'S126'
    };
    
    const sessionId = workloadSessionMap[workloadId] || 'S999';
    navigate(`/workloads/${sessionId}/chat`);
  };

  // Simulate consent being granted and agent continuing work
  const simulateConsentGranted = (workloadId: string, grantedScopes: string[]) => {
    setWorkloads(prev => prev.map(workload => {
      if (workload.id === workloadId) {
        const updatedWorkload = {
          ...workload,
          status: 'running' as const,
          grantedScopes: [...workload.grantedScopes, ...grantedScopes],
          pendingScopes: workload.pendingScopes.filter(scope => !grantedScopes.includes(scope)),
          progress: Math.min(workload.progress + 30, 90),
          logs: [
            ...workload.logs,
            {
              id: `log-consent-${Date.now()}`,
              timestamp: new Date(),
              level: 'success' as const,
              message: `Consent granted for scopes: ${grantedScopes.join(', ')}`
            },
            {
              id: `log-resume-${Date.now() + 1}`,
              timestamp: new Date(Date.now() + 1000),
              level: 'info' as const,
              message: 'Tool execution resumed - agent continuing with task'
            }
          ]
        };

        // Simulate tool execution and completion
        setTimeout(() => {
          setWorkloads(prev2 => prev2.map(w => {
            if (w.id === workloadId) {
              return {
                ...w,
                progress: Math.min(w.progress + 20, 100),
                logs: [
                  ...w.logs,
                  {
                    id: `log-tools-${Date.now()}`,
                    timestamp: new Date(),
                    level: 'success' as const,
                    message: `Successfully executed tools: ${grantedScopes.includes('tools:write') ? 'CreateFile, UpdateFile' : ''} ${grantedScopes.includes('data:export') ? 'ExportData, GenerateReport' : ''} ${grantedScopes.includes('tools:read') ? 'ListFiles, ReadFile' : ''}`.trim()
                  },
                  {
                    id: `log-processing-${Date.now() + 1}`,
                    timestamp: new Date(Date.now() + 500),
                    level: 'info' as const,
                    message: 'Agent processing task with granted permissions...'
                  }
                ]
              };
            }
            return w;
          }));
        }, 2000);

        // Complete the workload
        setTimeout(() => {
          setWorkloads(prev3 => prev3.map(w => {
            if (w.id === workloadId) {
              return {
                ...w,
                status: 'completed' as const,
                progress: 100,
                completedAt: new Date(),
                logs: [
                  ...w.logs,
                  {
                    id: `log-complete-${Date.now()}`,
                    timestamp: new Date(),
                    level: 'success' as const,
                    message: 'Task completed successfully with user-granted permissions'
                  }
                ]
              };
            }
            return w;
          }));
        }, 5000);

        return updatedWorkload;
      }
      return workload;
    }));
  };

  // Listen for consent approval
  useEffect(() => {
    const handleConsentApproval = (event: CustomEvent) => {
      const { workloadId, grantedScopes } = event.detail;
      simulateConsentGranted(workloadId, grantedScopes);
    };

    window.addEventListener('consentApproved', handleConsentApproval as EventListener);
    return () => window.removeEventListener('consentApproved', handleConsentApproval as EventListener);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Workloads Overview</h2>
            <p className="text-sm text-gray-400">Agent session management and monitoring</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              Active: <span className="text-blue-400 font-mono">{workloads.filter(w => w.status === 'running').length}</span>
            </div>
            <div className="text-sm text-gray-400">
              Pending: <span className="text-yellow-400 font-mono">{workloads.filter(w => w.status === 'pending_consent').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Workloads Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workloads.map((workload) => (
          <div key={workload.id} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  workload.status === 'running' ? 'bg-blue-500/20' :
                  workload.status === 'pending_consent' ? 'bg-yellow-500/20' :
                  workload.status === 'completed' ? 'bg-green-500/20' :
                  workload.status === 'failed' ? 'bg-red-500/20' : 'bg-gray-500/20'
                }`}>
                  <div className={getStatusColor(workload.status)}>
                    {getStatusIcon(workload.status)}
                  </div>
                </div>
                <div className={`p-1 rounded ${getTypeColor(workload.type)}`}>
                  {getTypeIcon(workload.type)}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">{workload.name}</h3>
                  <p className="text-xs text-gray-400">{workload.description}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500 capitalize">{workload.type.replace('_', ' ')}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">{workload.agentId}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-blue-400 capitalize">
                      {workload.trigger.type}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Chat Link Button */}
              {workload.type === 'chat' && (
                <button
                  onClick={() => handleNavigateToChat(workload.id)}
                  className="flex items-center space-x-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs transition-colors duration-200"
                  title="Open Chat Interface"
                >
                  <MessageCircle className="w-3 h-3" />
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Progress</span>
                <span className="text-xs text-white font-mono">{Math.round(workload.progress)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    workload.status === 'running' ? 'bg-blue-500' :
                    workload.status === 'pending_consent' ? 'bg-yellow-500' :
                    workload.status === 'completed' ? 'bg-green-500' :
                    workload.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                  }`}
                  style={{ width: `${workload.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Status and Actions */}
            <div className="flex items-center justify-between">
              <div className={`flex items-center space-x-2 ${getStatusColor(workload.status)}`}>
                {getStatusIcon(workload.status)}
                <span className="text-xs capitalize">{workload.status.replace('_', ' ')}</span>
              </div>
              
              {workload.status === 'pending_consent' && (
                <button
                  onClick={() => handleRequestConsent(workload.id)}
                  className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs transition-colors duration-200"
                >
                  Grant Consent
                </button>
              )}
            </div>

            {/* Pending Scopes */}
            {workload.pendingScopes.length > 0 && (
              <div className="mt-3 p-2 bg-yellow-500/20 border border-yellow-500/30 rounded">
                <div className="flex items-center space-x-2 mb-1">
                  <AlertTriangle className="w-3 h-3 text-yellow-400" />
                  <span className="text-xs text-yellow-400 font-medium">Consent Required</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {workload.pendingScopes.map((scope, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkloadsOverview;