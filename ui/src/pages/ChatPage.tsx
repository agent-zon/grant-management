import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Bot, User, Code, Database, Globe, Zap, ExternalLink, Copy, Download, MessageCircle } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  tools?: string[];
  status?: 'processing' | 'completed' | 'error';
  artifacts?: DeploymentArtifact[];
}

interface DeploymentArtifact {
  type: 'url' | 'config' | 'code' | 'documentation';
  title: string;
  content: string;
  description?: string;
}

interface ChatPageProps {
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  authStatus: any;
  onConsentRequest: (workloadId: string, scopes: string[]) => void;
}

const ChatPage: React.FC<ChatPageProps> = ({ isProcessing, setIsProcessing, authStatus, onConsentRequest }) => {
  const { sessionId } = useParams<{ sessionId: string }>();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: sessionId 
        ? `Connected to session ${sessionId}. I can help you with file operations, data analysis, and system tasks - but I'll need your consent for specific tool access.`
        : 'MCP Consent Agent initialized. Welcome John! I can help you with file operations, data analysis, and system tasks - but I\'ll need your consent for specific tool access.',
      timestamp: new Date(),
      status: 'completed'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const simulateAgentResponse = (userMessage: string) => {
    setIsProcessing(true);
    
    // Check if this is a request that requires consent
    const requiresWriteAccess = userMessage.toLowerCase().includes('create') || 
                               userMessage.toLowerCase().includes('write') ||
                               userMessage.toLowerCase().includes('modify') ||
                               userMessage.toLowerCase().includes('update');
    
    const requiresExportAccess = userMessage.toLowerCase().includes('export') || 
                                userMessage.toLowerCase().includes('download') ||
                                userMessage.toLowerCase().includes('backup');
    
    if (requiresWriteAccess || requiresExportAccess) {
      // Simulate agent needing consent for specific tools
      const requiredScopes = [];
      if (requiresWriteAccess) requiredScopes.push('tools:write');
      if (requiresExportAccess) requiredScopes.push('data:export');
      
      // Add processing message
      const processingMessage: Message = {
        id: Date.now().toString(),
        type: 'agent',
        content: 'I need additional permissions to complete this request. Let me check what consent is required...',
        timestamp: new Date(),
        status: 'processing',
        tools: ['mcp-guard', 'scope-validator', 'consent-manager']
      };
      
      setMessages(prev => [...prev, processingMessage]);

      // Simulate consent requirement detection
      setTimeout(() => {
        const consentMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'agent',
          content: `I need your consent to access the following scopes to complete your request:\n\n` +
                  `${requiredScopes.map(scope => `• ${scope}`).join('\n')}\n\n` +
                  `This will allow me to use tools like ${requiresWriteAccess ? 'CreateFile, UpdateFile' : ''} ${requiresExportAccess ? 'ExportData, GenerateReport' : ''}.\n\n` +
                  `Would you like to grant these permissions? I'll request consent now.`,
          timestamp: new Date(),
          status: 'completed',
          tools: requiredScopes,
          artifacts: [
            {
              type: 'url',
              title: 'Grant Consent',
              content: 'Click to open consent dialog',
              description: `Grant ${requiredScopes.join(', ')} permissions`
            }
          ]
        };
        
        setMessages(prev => prev.map(msg => 
          msg.id === processingMessage.id 
            ? consentMessage
            : msg
        ));
        
        // Trigger consent request
        setTimeout(() => {
          onConsentRequest(sessionId || `chat-${Date.now()}`, requiredScopes);
        }, 500);
      }, 1500);
      
      return;
    }
    
    // Add processing message
    const processingMessage: Message = {
      id: Date.now().toString(),
      type: 'agent',
      content: 'Processing your request...',
      timestamp: new Date(),
      status: 'processing',
      tools: ['code-executor', 'api-client', 'database']
    };
    
    setMessages(prev => [...prev, processingMessage]);

    // Simulate processing time
    setTimeout(() => {
      const responses = [
        {
          content: `I've successfully accessed your file system using the granted tools:read scope and completed the analysis. Here are the results:`,
          tools: ['ListFiles', 'ReadFile', 'GetFileInfo', 'mcp-guard'],
          artifacts: [
            {
              type: 'config',
              title: 'File System Analysis - Completed',
              content: `{
  "total_files": 247,
  "directories": 12,
  "file_types": {
    "documents": 89,
    "images": 156,
    "code": 2
  },
  "permissions": "tools:read",
  "status": "analysis_complete",
  "recommendations": "Ready for organization"
}`,
              description: 'Analysis completed successfully with granted permissions'
            }
          ]
        }
      ];

      const randomResponse = responses[0];
      
      setMessages(prev => prev.map(msg => 
        msg.id === processingMessage.id 
          ? { ...msg, content: randomResponse.content, status: 'completed', tools: randomResponse.tools, artifacts: randomResponse.artifacts }
          : msg
      ));
      
      setIsProcessing(false);
    }, 2000);
  };

  // Listen for consent approval and continue agent work
  useEffect(() => {
    const handleConsentApproval = (event: CustomEvent) => {
      const { workloadId: approvedWorkloadId, grantedScopes } = event.detail;
      
      // If this chat is associated with the workload that got consent
      if (sessionId === approvedWorkloadId || !sessionId) {
        // Add message showing consent was granted
        const consentGrantedMessage: Message = {
          id: `consent-granted-${Date.now()}`,
          type: 'agent',
          content: `✅ Consent granted! I now have access to: ${grantedScopes.join(', ')}\n\nResuming task execution...`,
          timestamp: new Date(),
          status: 'processing',
          tools: ['consent-manager', 'token-validator']
        };
        
        setMessages(prev => [...prev, consentGrantedMessage]);
        
        // Simulate agent continuing work with granted permissions
        setTimeout(() => {
          const toolExecutionMessage: Message = {
            id: `tool-execution-${Date.now()}`,
            type: 'agent',
            content: `🔧 Executing tools with granted permissions...\n\n` +
                    `${grantedScopes.includes('tools:write') ? '• Creating and updating files\n' : ''}` +
                    `${grantedScopes.includes('data:export') ? '• Exporting data and generating reports\n' : ''}` +
                    `${grantedScopes.includes('tools:read') ? '• Reading file system data\n' : ''}`,
            timestamp: new Date(),
            status: 'processing',
            tools: grantedScopes.includes('tools:write') ? ['CreateFile', 'UpdateFile'] : 
                   grantedScopes.includes('data:export') ? ['ExportData', 'GenerateReport'] :
                   ['ListFiles', 'ReadFile']
          };
          
          setMessages(prev => prev.map(msg => 
            msg.id === consentGrantedMessage.id 
              ? toolExecutionMessage
              : msg
          ));
          
          // Complete the task
          setTimeout(() => {
            const completionMessage: Message = {
              id: `completion-${Date.now()}`,
              type: 'agent',
              content: `✅ Task completed successfully!\n\n` +
                      `I've executed all requested operations using the permissions you granted:\n\n` +
                      `${grantedScopes.includes('tools:write') ? '• Files created and organized\n' : ''}` +
                      `${grantedScopes.includes('data:export') ? '• Data exported and reports generated\n' : ''}` +
                      `${grantedScopes.includes('tools:read') ? '• File system analyzed\n' : ''}` +
                      `\nAll operations completed within your consent boundaries.`,
              timestamp: new Date(),
              status: 'completed',
              tools: grantedScopes.includes('tools:write') ? ['CreateFile', 'UpdateFile'] : 
                     grantedScopes.includes('data:export') ? ['ExportData', 'GenerateReport'] :
                     ['ListFiles', 'ReadFile'],
              artifacts: [
                {
                  type: 'config',
                  title: 'Task Completion Summary',
                  content: `{
  "status": "completed",
  "granted_scopes": ${JSON.stringify(grantedScopes)},
  "tools_executed": ${JSON.stringify(grantedScopes.includes('tools:write') ? ['CreateFile', 'UpdateFile'] : 
                                    grantedScopes.includes('data:export') ? ['ExportData', 'GenerateReport'] :
                                    ['ListFiles', 'ReadFile'])},
  "completion_time": "${new Date().toISOString()}",
  "consent_compliant": true
}`,
                  description: 'Task completed successfully with user-granted permissions'
                }
              ]
            };
            
            setMessages(prev => prev.map(msg => 
              msg.id === toolExecutionMessage.id 
                ? completionMessage
                : msg
            ));
            
            setIsProcessing(false);
          }, 3000);
        }, 2000);
      }
    };

    window.addEventListener('consentApproved', handleConsentApproval as EventListener);
    return () => window.removeEventListener('consentApproved', handleConsentApproval as EventListener);
  }, [sessionId, setIsProcessing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date(),
      status: 'completed'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    
    // Simulate agent response
    setTimeout(() => simulateAgentResponse(inputMessage), 500);
  };

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case 'ListFiles': return <Database className="w-3 h-3" />;
      case 'ReadFile': return <Code className="w-3 h-3" />;
      case 'CreateFile': return <Zap className="w-3 h-3" />;
      case 'UpdateFile': return <Code className="w-3 h-3" />;
      case 'DeleteFile': return <Globe className="w-3 h-3" />;
      case 'ExportData': return <Database className="w-3 h-3" />;
      case 'GenerateReport': return <Code className="w-3 h-3" />;
      case 'mcp-guard': return <Globe className="w-3 h-3" />;
      case 'scope-validator': return <Database className="w-3 h-3" />;
      case 'consent-manager': return <Zap className="w-3 h-3" />;
      case 'session-manager': return <MessageCircle className="w-3 h-3" />;
      case 'token-validator': return <Zap className="w-3 h-3" />;
      case 'HttpRequest': return <Globe className="w-3 h-3" />;
      default: return <Zap className="w-3 h-3" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case 'url': return <ExternalLink className="w-4 h-4" />;
      case 'config': return <Code className="w-4 h-4" />;
      case 'code': return <Code className="w-4 h-4" />;
      case 'documentation': return <Database className="w-4 h-4" />;
      default: return <Code className="w-4 h-4" />;
    }
  };

  const getArtifactColor = (type: string) => {
    switch (type) {
      case 'url': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'config': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'code': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'documentation': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const effectiveWorkloadId = sessionId || `chat-${Date.now()}`;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
      {/* Chat Header */}
      <div className="bg-gray-700/50 px-6 py-4 border-b border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">MCP Consent Assistant</h3>
              <p className="text-sm text-gray-400">AI Agent with consent-aware tool access</p>
              {effectiveWorkloadId && (
                <p className="text-xs text-blue-400">Workload: {effectiveWorkloadId}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-400">Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
              message.type === 'user'
                ? 'bg-blue-600 text-white'
                : message.type === 'system'
                ? 'bg-gray-700 text-gray-300'
                : 'bg-gray-700 text-white'
            }`}>
              <div className="flex items-start space-x-2">
                {message.type !== 'user' && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm">{message.content}</p>
                  
                  {message.tools && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {message.tools.map((tool, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center space-x-1 px-2 py-1 bg-gray-600/50 rounded text-xs text-gray-300"
                        >
                          {getToolIcon(tool)}
                          <span>{tool}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {message.status === 'processing' && (
                    <div className="mt-2 flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-gray-400">Processing...</span>
                    </div>
                  )}
                  
                  {/* Deployment Artifacts */}
                  {message.artifacts && message.artifacts.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <h4 className="text-sm font-medium text-white">Generated Artifacts:</h4>
                      {message.artifacts.map((artifact, index) => (
                        <div key={index} className={`p-3 rounded-lg border ${getArtifactColor(artifact.type)}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              {getArtifactIcon(artifact.type)}
                              <span className="text-sm font-medium">{artifact.title}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {artifact.type === 'url' && (
                                <button
                                  onClick={() => window.open(artifact.content, '_blank')}
                                  className="p-1 hover:bg-white/10 rounded transition-colors duration-200"
                                  title="Open URL"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={() => copyToClipboard(artifact.content)}
                                className="p-1 hover:bg-white/10 rounded transition-colors duration-200"
                                title="Copy to clipboard"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          {artifact.description && (
                            <p className="text-xs opacity-80 mb-2">{artifact.description}</p>
                          )}
                          <div className="bg-black/20 rounded p-2 font-mono text-xs overflow-x-auto">
                            {artifact.type === 'code' || artifact.type === 'config' ? (
                              <pre className="whitespace-pre-wrap">{artifact.content}</pre>
                            ) : (
                              <span>{artifact.content}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-600 p-4">
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Try: 'Create a new configuration file' or 'Export my project data'"
            className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing || !inputMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            'Create a new configuration file',
            'Export my project data',
            'Can you list my files with current permissions?',
            'Update my system settings',
            'Show me my current tool access permissions',
            'Generate a backup of my data',
            'Modify the database configuration'
          ].map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setInputMessage(suggestion)}
              className="text-xs bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 px-3 py-2 rounded-lg transition-colors duration-200 max-w-xs text-left"
              disabled={isProcessing}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;