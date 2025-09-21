import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Code, Database, Globe, Zap, ExternalLink, Copy, Download, MessageCircle, Shield } from 'lucide-react';
import { Form, useLoaderData, useActionData, useFetcher, Link, redirect } from 'react-router';
import type { Route } from './+types/chat.$sessionId';

interface Message {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
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

interface ConsentRequest {
  id: string;
  workloadId: string;
  requiredScopes: string[];
  reason: string;
  status: 'pending' | 'approved' | 'denied';
}

// Store chat state in memory (in real app, this would be in database)
let chatSessions: Record<string, Message[]> = {};
let pendingConsentRequests: ConsentRequest[] = [];

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `AI Chat - Session ${params.sessionId}` },
    { name: "description", content: "Chat with AI agent with consent-aware tool access" },
  ];
}

export function loader({ params }: Route.LoaderArgs) {
  const { sessionId } = params;
  
  // Initialize session if it doesn't exist
  if (!chatSessions[sessionId]) {
    chatSessions[sessionId] = [
      {
        id: '1',
        type: 'system',
        content: `Connected to session ${sessionId}. I can help you with file operations, data analysis, and system tasks - but I'll need your consent for specific tool access.`,
        timestamp: new Date().toISOString(),
        status: 'completed'
      }
    ];
  }
  
  return {
    messages: chatSessions[sessionId],
    sessionId,
    pendingRequests: pendingConsentRequests.filter(r => r.workloadId === sessionId)
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { sessionId } = params;
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'send-message') {
    const message = formData.get('message') as string;

    if (!message.trim()) {
      return { success: false, error: 'Message cannot be empty' };
    }

    // Initialize session if it doesn't exist
    if (!chatSessions[sessionId]) {
      chatSessions[sessionId] = [];
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };

    chatSessions[sessionId].push(userMessage);

    // Check if message requires consent
    const requiresWriteAccess = message.toLowerCase().includes('create') || 
                               message.toLowerCase().includes('write') ||
                               message.toLowerCase().includes('modify') ||
                               message.toLowerCase().includes('update');
    
    const requiresExportAccess = message.toLowerCase().includes('export') || 
                                message.toLowerCase().includes('download') ||
                                message.toLowerCase().includes('backup');

    if (requiresWriteAccess || requiresExportAccess) {
      const requiredScopes = [];
      if (requiresWriteAccess) requiredScopes.push('tools:write');
      if (requiresExportAccess) requiredScopes.push('data:export');

      // Create consent request
      const consentRequest: ConsentRequest = {
        id: `consent-${Date.now()}`,
        workloadId: sessionId,
        requiredScopes,
        reason: `Agent needs ${requiredScopes.join(', ')} permissions to complete: "${message}"`,
        status: 'pending'
      };

      pendingConsentRequests.push(consentRequest);

      // Add agent response requesting consent
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'agent',
        content: `I need your consent to access the following scopes to complete your request:\n\n` +
                `${requiredScopes.map(scope => `• ${scope}`).join('\n')}\n\n` +
                `This will allow me to use tools like ${requiresWriteAccess ? 'CreateFile, UpdateFile' : ''} ${requiresExportAccess ? 'ExportData, GenerateReport' : ''}.\n\n` +
                `Please grant consent to proceed.`,
        timestamp: new Date().toISOString(),
        status: 'completed',
        tools: requiredScopes,
        artifacts: [
          {
            type: 'url',
            title: 'Grant Consent',
            content: `/consent-modal?request=${consentRequest.id}`,
            description: `Grant ${requiredScopes.join(', ')} permissions`
          }
        ]
      };

      chatSessions[sessionId].push(agentMessage);

      return {
        success: true,
        requiresConsent: true,
        consentRequestId: consentRequest.id,
        requiredScopes
      };
    }

    // Add normal agent response
    const agentMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: 'agent',
      content: `I've successfully processed your request using the available permissions. Here are the results:`,
      timestamp: new Date().toISOString(),
      status: 'completed',
      tools: ['ListFiles', 'ReadFile', 'GetFileInfo'],
      artifacts: [
        {
          type: 'config',
          title: 'Task Results',
          content: `{
  "status": "completed",
  "permissions_used": ["tools:read"],
  "completion_time": "${new Date().toISOString()}",
  "result": "Task completed successfully"
}`,
          description: 'Task completed with available permissions'
        }
      ]
    };

    chatSessions[sessionId].push(agentMessage);

    return {
      success: true,
      requiresConsent: false
    };
  }

  if (intent === 'approve-consent') {
    const requestId = formData.get('requestId') as string;
    const grantedScopes = formData.getAll('scopes') as string[];

    // Find and update consent request
    const request = pendingConsentRequests.find(r => r.id === requestId);
    if (request) {
      request.status = 'approved';

      // Add success message to chat
      if (chatSessions[sessionId]) {
        const successMessage: Message = {
          id: `consent-approved-${Date.now()}`,
          type: 'agent',
          content: `✅ Consent granted! I now have access to: ${grantedScopes.join(', ')}\n\nTask completed successfully with your approved permissions.`,
          timestamp: new Date().toISOString(),
          status: 'completed',
          tools: grantedScopes.includes('tools:write') ? ['CreateFile', 'UpdateFile'] : ['ExportData', 'GenerateReport']
        };

        chatSessions[sessionId].push(successMessage);
      }

      return {
        success: true,
        message: 'Consent approved and task completed',
        grantedScopes
      };
    }

    return { success: false, error: 'Consent request not found' };
  }

  return null;
}

export default function SessionChat({ loaderData }: Route.ComponentProps) {
  const { messages, sessionId, pendingRequests } = loaderData;
  const actionData = useActionData<typeof action>();
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
 

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/"
            className="text-blue-400 hover:text-blue-300 transition-colors mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-2xl font-bold text-white">AI Chat Assistant</h1>
          <p className="text-gray-400">Session: {sessionId}</p>
        </div>

        {/* Action Results */}
        {actionData && actionData.success && actionData.requiresConsent && (
          <div className="mb-6 bg-yellow-800/50 backdrop-blur-sm rounded-xl border border-yellow-700 p-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-yellow-400" />
              <p className="text-yellow-300">
                Consent required for scopes: {actionData.requiredScopes?.join(', ')}
              </p>
            </div>
          </div>
        )}

        {actionData && actionData.success && !actionData.requiresConsent && (
          <div className="mb-6 bg-green-800/50 backdrop-blur-sm rounded-xl border border-green-700 p-4">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5 text-green-400" />
              <p className="text-green-300">Message processed successfully</p>
            </div>
          </div>
        )}

        {/* Chat Interface */}
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
                  <p className="text-xs text-blue-400">Session: {sessionId}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  to={`/grants?session=${sessionId}`}
                  className="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  Manage Grants
                </Link>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-400">Online</span>
                </div>
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
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      
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
                      
                      {/* Artifacts with Consent Modal */}
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
                                  {artifact.type === 'url' && artifact.content.includes('consent-modal') && (
                                    <ConsentModal 
                                      requestId={artifact.content.split('request=')[1]}
                                      requiredScopes={message.tools || []}
                                      sessionId={sessionId}
                                    />
                                  )}
                                  {artifact.type === 'url' && !artifact.content.includes('consent-modal') && (
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
                              {!artifact.content.includes('consent-modal') && (
                                <div className="bg-black/20 rounded p-2 font-mono text-xs overflow-x-auto">
                                  {artifact.type === 'code' || artifact.type === 'config' ? (
                                    <pre className="whitespace-pre-wrap">{artifact.content}</pre>
                                  ) : (
                                    <span>{artifact.content}</span>
                                  )}
                                </div>
                              )}
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
            <Form method="post" className="flex space-x-3">
              <input type="hidden" name="intent" value="send-message" />
              <input
                type="text"
                name="message"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Try: 'Create a new configuration file' or 'Export my project data'"
                className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                title="Send message"
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </Form>
            
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
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  function getToolIcon(tool: string) {
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
  }

 

  function getArtifactIcon(type: string) {
    switch (type) {
      case 'url': return <ExternalLink className="w-4 h-4" />;
      case 'config': return <Code className="w-4 h-4" />;
      case 'code': return <Code className="w-4 h-4" />;
      case 'documentation': return <Database className="w-4 h-4" />;
      default: return <Code className="w-4 h-4" />;
    }
  }

  function getArtifactColor(type: string) {
    switch (type) {
      case 'url': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'config': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'code': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'documentation': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  }
}

// Consent Modal Component
function ConsentModal({ requestId, requiredScopes, sessionId }: { requestId: string; requiredScopes: string[]; sessionId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const consentFetcher = useFetcher();

  const handleApprove = () => {
    const formData = new FormData();
    formData.set('intent', 'approve-consent');
    formData.set('requestId', requestId);
    requiredScopes.forEach(scope => formData.append('scopes', scope));
    
    consentFetcher.submit(formData, { method: 'post' });
    setIsOpen(false);
  };

  const handleDeny = () => {
    // In a real app, this would update the consent request status
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
      >
        Grant Consent
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Consent Required</h3>
            </div>
            
            <p className="text-gray-300 mb-4">
              The agent is requesting access to the following permissions for session <span className="font-mono text-blue-400">{sessionId}</span>:
            </p>
            
            <div className="space-y-2 mb-6">
              {requiredScopes.map((scope, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-blue-500/10 rounded border border-blue-500/20">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-300">{scope}</span>
                </div>
              ))}
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-6">
              <p className="text-xs text-yellow-300">
                By granting consent, you allow the agent to use the specified tools to complete your request.
                This permission will be active for this session only and can be revoked at any time.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDeny}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Deny
              </button>
              <button
                onClick={handleApprove}
                disabled={consentFetcher.state !== 'idle'}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {consentFetcher.state !== 'idle' ? 'Granting...' : 'Grant Consent'}
              </button>
            </div>

            {/* Quick Grant Options */}
            <div className="mt-4 pt-4 border-t border-gray-600">
              <p className="text-xs text-gray-400 mb-2">Quick Actions:</p>
              <div className="flex space-x-2">
                <Link
                  to={`/grants/tools-read/grant`}
                  className="text-xs text-green-400 hover:text-green-300 underline"
                  onClick={() => setIsOpen(false)}
                >
                  Grant Read Access
                </Link>
                <Link
                  to={`/consent/tools-write/grant`}
                  className="text-xs text-green-400 hover:text-green-300 underline"
                  onClick={() => setIsOpen(false)}
                >
                  Grant Write Access
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
