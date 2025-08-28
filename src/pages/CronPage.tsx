import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Clock, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Plus, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Calendar,
  Settings,
  Activity,
  Database,
  FileText,
  Globe,
  Bot,
  Save,
  X
} from 'lucide-react';

interface CronJob {
  id: string;
  name: string;
  description: string;
  schedule: string;
  scheduleDescription: string;
  type: 'data_analysis' | 'system_maintenance' | 'report_generation' | 'backup';
  status: 'active' | 'paused' | 'disabled' | 'error';
  lastRun?: Date;
  nextRun: Date;
  runCount: number;
  successCount: number;
  errorCount: number;
  requiredScopes: string[];
  tools: string[];
  agentId: string;
  createdAt: Date;
  updatedAt: Date;
  workloadId?: string;
  logs: CronLog[];
}

interface CronLog {
  id: string;
  timestamp: Date;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  duration?: number;
  message: string;
  workloadId?: string;
}

interface CronPageProps {
  onNavigateToWorkload: (workloadId: string) => void;
}

const CronPage: React.FC<CronPageProps> = ({ onNavigateToWorkload }) => {
  const [cronJobs, setCronJobs] = useState<CronJob[]>([
    {
      id: 'cron-001',
      name: 'Data Analysis Pipeline',
      description: 'Automated quarterly business intelligence report generation',
      schedule: '0 9 1 */3 *',
      scheduleDescription: 'Every 3 months on the 1st at 9:00 AM',
      type: 'data_analysis',
      status: 'active',
      lastRun: new Date(Date.now() - 7200000), // 2 hours ago
      nextRun: new Date(Date.now() + 7776000000), // ~3 months from now
      runCount: 12,
      successCount: 10,
      errorCount: 2,
      requiredScopes: ['tools:read', 'data:export', 'tools:write'],
      tools: ['ListFiles', 'ReadFile', 'ExportData', 'CreateFile', 'GenerateReport'],
      agentId: 'agent-CRON-DA',
      createdAt: new Date(Date.now() - 31536000000), // 1 year ago
      updatedAt: new Date(Date.now() - 86400000), // 1 day ago
      workloadId: 'wl-001',
      logs: [
        {
          id: 'log-1',
          timestamp: new Date(Date.now() - 7200000),
          status: 'started',
          message: 'Quarterly data analysis pipeline initiated'
        },
        {
          id: 'log-2',
          timestamp: new Date(Date.now() - 7140000),
          status: 'completed',
          duration: 3600,
          message: 'Data analysis completed successfully',
          workloadId: 'wl-001'
        }
      ]
    },
    {
      id: 'cron-002',
      name: 'System Health Check',
      description: 'Daily system monitoring and health assessment',
      schedule: '0 6 * * *',
      scheduleDescription: 'Daily at 6:00 AM',
      type: 'system_maintenance',
      status: 'active',
      lastRun: new Date(Date.now() - 21600000), // 6 hours ago
      nextRun: new Date(Date.now() + 64800000), // 18 hours from now
      runCount: 365,
      successCount: 360,
      errorCount: 5,
      requiredScopes: ['system:monitor', 'tools:read'],
      tools: ['SystemCheck', 'HealthMonitor', 'LogAnalyzer'],
      agentId: 'agent-HEALTH',
      createdAt: new Date(Date.now() - 31536000000),
      updatedAt: new Date(Date.now() - 86400000),
      logs: [
        {
          id: 'log-3',
          timestamp: new Date(Date.now() - 21600000),
          status: 'completed',
          duration: 300,
          message: 'System health check completed - all systems operational'
        }
      ]
    },
    {
      id: 'cron-003',
      name: 'Weekly Backup',
      description: 'Automated weekly data backup and archival',
      schedule: '0 2 * * 0',
      scheduleDescription: 'Every Sunday at 2:00 AM',
      type: 'backup',
      status: 'paused',
      lastRun: new Date(Date.now() - 604800000), // 1 week ago
      nextRun: new Date(Date.now() + 172800000), // 2 days from now
      runCount: 52,
      successCount: 50,
      errorCount: 2,
      requiredScopes: ['data:export', 'tools:write', 'storage:access'],
      tools: ['CreateBackup', 'ExportData', 'ArchiveFiles'],
      agentId: 'agent-BACKUP',
      createdAt: new Date(Date.now() - 31536000000),
      updatedAt: new Date(Date.now() - 604800000),
      logs: [
        {
          id: 'log-4',
          timestamp: new Date(Date.now() - 604800000),
          status: 'completed',
          duration: 1800,
          message: 'Weekly backup completed successfully'
        }
      ]
    }
  ]);

  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'paused': return 'text-yellow-400';
      case 'disabled': return 'text-gray-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'disabled': return <XCircle className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'data_analysis': return <Database className="w-4 h-4" />;
      case 'system_maintenance': return <Settings className="w-4 h-4" />;
      case 'report_generation': return <FileText className="w-4 h-4" />;
      case 'backup': return <Globe className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'data_analysis': return 'bg-blue-500/20 text-blue-400';
      case 'system_maintenance': return 'bg-red-500/20 text-red-400';
      case 'report_generation': return 'bg-green-500/20 text-green-400';
      case 'backup': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const toggleJobStatus = (jobId: string) => {
    setCronJobs(prev => prev.map(job => 
      job.id === jobId 
        ? { 
            ...job, 
            status: job.status === 'active' ? 'paused' : 'active',
            updatedAt: new Date()
          }
        : job
    ));
  };

  const deleteJob = (jobId: string) => {
    setCronJobs(prev => prev.filter(job => job.id !== jobId));
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Cron Jobs & Scheduled Tasks</h2>
            <p className="text-sm text-gray-400">Manage automated agent workflows and schedules</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>New Cron Job</span>
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Play className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-400">Active Jobs</span>
            </div>
            <p className="text-lg font-bold text-white">
              {cronJobs.filter(job => job.status === 'active').length}
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-400">Total Runs</span>
            </div>
            <p className="text-lg font-bold text-white">
              {cronJobs.reduce((sum, job) => sum + job.runCount, 0)}
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-400">Success Rate</span>
            </div>
            <p className="text-lg font-bold text-white">
              {Math.round((cronJobs.reduce((sum, job) => sum + job.successCount, 0) / 
                cronJobs.reduce((sum, job) => sum + job.runCount, 0)) * 100)}%
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-gray-400">Next Run</span>
            </div>
            <p className="text-sm font-bold text-white">
              {cronJobs
                .filter(job => job.status === 'active')
                .sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime())[0]
                ?.nextRun.toLocaleString() || 'None scheduled'}
            </p>
          </div>
        </div>
      </div>

      {/* Cron Jobs List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {cronJobs.map((job) => (
          <div key={job.id} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  job.status === 'active' ? 'bg-green-500/20' :
                  job.status === 'paused' ? 'bg-yellow-500/20' :
                  job.status === 'error' ? 'bg-red-500/20' : 'bg-gray-500/20'
                }`}>
                  <div className={getStatusColor(job.status)}>
                    {getStatusIcon(job.status)}
                  </div>
                </div>
                <div className={`p-1 rounded ${getTypeColor(job.type)}`}>
                  {getTypeIcon(job.type)}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">{job.name}</h3>
                  <p className="text-xs text-gray-400">{job.description}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {job.workloadId && (
                  <button
                    onClick={() => onNavigateToWorkload(job.workloadId!)}
                    className="p-1 text-blue-400 hover:text-blue-300 transition-colors duration-200"
                    title="View current workload"
                  >
                    <Activity className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setEditingJob(job)}
                  className="p-1 text-gray-400 hover:text-gray-300 transition-colors duration-200"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleJobStatus(job.id)}
                  className={`p-1 transition-colors duration-200 ${
                    job.status === 'active' 
                      ? 'text-yellow-400 hover:text-yellow-300' 
                      : 'text-green-400 hover:text-green-300'
                  }`}
                >
                  {job.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => deleteJob(job.id)}
                  className="p-1 text-red-400 hover:text-red-300 transition-colors duration-200"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Schedule Info */}
            <div className="bg-gray-700/50 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Schedule</span>
                <span className="text-xs text-gray-400 font-mono">{job.schedule}</span>
              </div>
              <p className="text-sm text-white">{job.scheduleDescription}</p>
              <div className="grid grid-cols-2 gap-4 mt-2 text-xs">
                <div>
                  <span className="text-gray-400">Last Run:</span>
                  <p className="text-white">{job.lastRun?.toLocaleString() || 'Never'}</p>
                </div>
                <div>
                  <span className="text-gray-400">Next Run:</span>
                  <p className="text-white">{job.nextRun.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <p className="text-lg font-bold text-white">{job.runCount}</p>
                <p className="text-xs text-gray-400">Total Runs</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-400">{job.successCount}</p>
                <p className="text-xs text-gray-400">Success</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-400">{job.errorCount}</p>
                <p className="text-xs text-gray-400">Errors</p>
              </div>
            </div>

            {/* Required Scopes */}
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-1">Required Scopes</p>
              <div className="flex flex-wrap gap-1">
                {job.requiredScopes.map((scope, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            </div>

            {/* Recent Logs */}
            {job.logs.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Recent Activity</p>
                <div className="space-y-1">
                  {job.logs.slice(-2).map((log) => (
                    <div key={log.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          log.status === 'completed' ? 'bg-green-400' :
                          log.status === 'failed' ? 'bg-red-400' :
                          log.status === 'started' ? 'bg-blue-400' : 'bg-gray-400'
                        }`}></div>
                        <span className="text-gray-300">{log.message}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {log.duration && (
                          <span className="text-gray-400">{formatDuration(log.duration)}</span>
                        )}
                        <span className="text-gray-400">{log.timestamp.toLocaleTimeString()}</span>
                      </div>
                    </div>
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

export default CronPage;