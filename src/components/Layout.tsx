import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  Bot, 
  Activity, 
  MessageCircle, 
  Clock, 
  Shield, 
  FileText, 
  Plus,
  Settings
} from 'lucide-react';
import NewChatModal from './NewChatModal';

interface LayoutProps {
  children: React.ReactNode;
  authStatus: any;
}

const Layout: React.FC<LayoutProps> = ({ children, authStatus }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  const sessionId = params.sessionId;
  const isWorkloadsSection = location.pathname.startsWith('/workloads');
  const isGrantsSection = location.pathname === '/grants';
  const isSessionSpecific = sessionId && location.pathname.includes(sessionId);

  // Session-specific tabs (only show when we have a sessionId)
  const sessionTabs = sessionId ? [
    { id: 'chat', label: 'Agent Chat', icon: MessageCircle, path: `/workloads/${sessionId}/chat` },
    { id: 'cron', label: 'Cron Description', icon: Clock, path: `/workloads/${sessionId}/cron` },
    { id: 'grants', label: 'Grant Management', icon: Shield, path: `/workloads/${sessionId}/grants` },
    { id: 'audit', label: 'Consent Vault', icon: FileText, path: `/workloads/${sessionId}/audit` }
  ] : [];

  const getActiveTab = () => {
    if (location.pathname === '/workloads') return 'overview';
    if (location.pathname === '/grants') return 'grants';
    if (sessionId) {
      if (location.pathname.includes('/chat')) return 'chat';
      if (location.pathname.includes('/cron')) return 'cron';
      if (location.pathname.includes('/grants')) return 'grants';
      if (location.pathname.includes('/audit')) return 'audit';
    }
    return 'overview';
  };

  const activeTab = getActiveTab();

  const handleCreateWorkload = (type: 'chat' | 'cron' | 'event') => {
    setShowNewChatModal(false);
    
    // Generate a new session ID
    const newSessionId = `S${Date.now().toString().slice(-6)}`;
    
    switch (type) {
      case 'chat':
        navigate(`/workloads/${newSessionId}/chat`);
        break;
      case 'cron':
        navigate(`/workloads/${newSessionId}/cron`);
        break;
      case 'event':
        // For now, navigate to overview - could be expanded later
        navigate('/workloads');
        break;
    }
  };

  return (
    <>
      {/* Header */}
      <div className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">MCP Consent Management System</h1>
                <p className="text-sm text-gray-400">AI Agent Consent & Authorization Demo</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <img 
                  src={authStatus.user.avatar} 
                  alt={authStatus.user.name}
                  className="w-8 h-8 rounded-full border-2 border-blue-400"
                />
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{authStatus.user.name}</p>
                  <p className="text-xs text-gray-400">{authStatus.user.role}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 rounded-full">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-400">System Online</span>
              </div>
              <div className="text-sm text-gray-400">
                Tokens: <span className="text-blue-400 font-mono">1,247</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="bg-gray-800/60 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => navigate('/workloads')}
              className={`${
                isWorkloadsSection
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200`}
            >
              <Activity className="w-4 h-4" />
              <span>Workloads</span>
            </button>
            
            <button
              onClick={() => navigate('/grants')}
              className={`${
                isGrantsSection
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200`}
            >
              <Settings className="w-4 h-4" />
              <span>Grants</span>
            </button>
            
            <button
              onClick={() => navigate('/audit')}
              className={`${
                location.pathname === '/audit'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200`}
            >
              <FileText className="w-4 h-4" />
              <span>Audit Log</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Session-specific Sub-tabs */}
      {isSessionSpecific && (
        <div className="bg-gray-800/40 backdrop-blur-sm border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/workloads')}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
                >
                  ← Back to Overview
                </button>
                <div className="text-sm text-gray-400">
                  Session: <span className="text-white font-mono">{sessionId}</span>
                </div>
              </div>
              
              <nav className="flex space-x-6" aria-label="Session Tabs">
                {sessionTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => navigate(tab.path)}
                      className={`${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                      } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors duration-200`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Workloads Overview Actions */}
      {location.pathname === '/workloads' && (
        <div className="bg-gray-800/40 backdrop-blur-sm border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-3">
              <div className="text-sm text-gray-400">
                Workloads Overview
              </div>
              
              <button
                onClick={() => setShowNewChatModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors duration-200"
              >
                <Plus className="w-4 h-4" />
                <span>New Workload</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <NewChatModal
          onClose={() => setShowNewChatModal(false)}
          onCreateChat={handleCreateWorkload}
        />
      )}
    </>
  );
};

export default Layout;