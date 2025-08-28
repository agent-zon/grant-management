import React, { useState } from 'react';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  User,
  Lock,
  Unlock,
  ExternalLink
} from 'lucide-react';

interface ConsentRequest {
  id: string;
  agentId: string;
  sessionId: string;
  requestedScopes: string[];
  tools: string[];
  reason: string;
  timestamp: Date;
  workloadId?: string;
}

interface ConsentPromptProps {
  request: ConsentRequest;
  onApprove: (scopes: string[]) => void;
  onDeny: () => void;
  onDismiss: () => void;
}

const ConsentPrompt: React.FC<ConsentPromptProps> = ({ 
  request, 
  onApprove, 
  onDeny, 
  onDismiss 
}) => {
  const [selectedScopes, setSelectedScopes] = useState<string[]>(request.requestedScopes);
  const [isProcessing, setIsProcessing] = useState(false);

  const scopeDescriptions: Record<string, string> = {
    'tools:read': 'Read access to files and data (ListFiles, ReadFile, GetFileInfo)',
    'tools:write': 'Write access to create and modify files (CreateFile, UpdateFile, DeleteFile)',
    'data:export': 'Export user data and generate reports (ExportData, GenerateReport)',
    'network:access': 'Access external APIs and network resources (HttpRequest, ApiCall)',
    'system:admin': 'Administrative access to system configuration (ConfigureSystem, ManageUsers)'
  };

  const handleScopeToggle = (scope: string) => {
    setSelectedScopes(prev => 
      prev.includes(scope) 
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
    onApprove(selectedScopes);
  };

  const handleDeny = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onDeny();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border-b border-gray-700 p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Shield className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Consent Required</h3>
              <p className="text-sm text-gray-400">Agent requesting tool access permissions</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Request Details */}
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">Agent Request</span>
              <span className="text-xs text-gray-400 font-mono">{request.agentId}</span>
            </div>
            <p className="text-sm text-gray-300 mb-2">{request.reason}</p>
            <div className="flex flex-wrap gap-1">
              {request.tools.map((tool, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>

          {/* Scope Selection */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Grant Permissions</h4>
            <div className="space-y-2">
              {request.requestedScopes.map((scope) => (
                <div key={scope} className="flex items-start space-x-3">
                  <button
                    onClick={() => handleScopeToggle(scope)}
                    className={`mt-1 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors duration-200 ${
                      selectedScopes.includes(scope)
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-500 hover:border-gray-400'
                    }`}
                    disabled={isProcessing}
                  >
                    {selectedScopes.includes(scope) && (
                      <CheckCircle className="w-3 h-3 text-white" />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-white">{scope}</span>
                      {selectedScopes.includes(scope) ? (
                        <Unlock className="w-3 h-3 text-green-400" />
                      ) : (
                        <Lock className="w-3 h-3 text-red-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {scopeDescriptions[scope] || 'Permission for specific tool access'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning */}
          {selectedScopes.length === 0 && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-400">
                  No permissions selected. Agent will not be able to execute requested tools.
                </span>
              </div>
            </div>
          )}

          {/* Session Info */}
          <div className="text-xs text-gray-400 bg-gray-700/30 rounded p-2">
            <div className="flex justify-between">
              <span>Session: {request.sessionId}</span>
              <span>Expires: 15 minutes</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-700 p-4 flex items-center justify-between">
          <button
            onClick={onDismiss}
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors duration-200"
            disabled={isProcessing}
          >
            Decide Later
          </button>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDeny}
              disabled={isProcessing}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors duration-200 flex items-center space-x-2"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              <span>Deny</span>
            </button>
            
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors duration-200 flex items-center space-x-2"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span>Grant ({selectedScopes.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentPrompt;