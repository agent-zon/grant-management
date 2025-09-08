import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ConsentManager } from './consent-manager.js';
import { 
  createConsentMiddleware, 
  addSessionIdHeader, 
  createConsentCallbackHandler 
} from './consent-middleware.js';
import { ConsentConfig, ConsentDecision } from './types.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Configuration
const config: ConsentConfig = {
  tokenLifetimeMinutes: parseInt(process.env.CONSENT_TOKEN_LIFETIME_MINUTES || '15'),
  idpAuthUrl: process.env.IDP_AUTH_URL || 'https://idp.example.com/auth',
  idpClientId: process.env.IDP_CLIENT_ID || 'mcp-consent-client',
  consentBaseUrl: process.env.CONSENT_BASE_URL || `http://localhost:${PORT}`,
  toolScopeMappings: {
    'ListFiles': ['tools:read'],
    'ReadFile': ['tools:read'],
    'GetFileInfo': ['tools:read'],
    'CreateFile': ['tools:write'],
    'UpdateFile': ['tools:write'],
    'DeleteFile': ['tools:write'],
    'ExportData': ['data:export'],
    'GenerateReport': ['data:export'],
    'HttpRequest': ['network:access'],
    'ApiCall': ['network:access'],
    'ConfigureSystem': ['system:admin'],
    'ManageUsers': ['system:admin'],
    'addTask': ['todo:plan'],
    'completeTask': ['todos:worker'],
    'whoami': [], // No scopes required
    'nextTask': [] // No scopes required
  }
};

// Initialize consent manager
const consentManager = new ConsentManager(config);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add session ID header middleware
app.use(addSessionIdHeader);

// Consent middleware for MCP requests
app.use('/mcp', createConsentMiddleware({
  consentManager,
  config: {
    idpAuthUrl: config.idpAuthUrl,
    idpClientId: config.idpClientId,
    consentBaseUrl: config.consentBaseUrl
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = consentManager.getStats();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    stats
  });
});

// Consent UI endpoints
app.get('/consent/request/:requestId', (req, res) => {
  const { requestId } = req.params;
  const request = consentManager.getPendingRequest(requestId);
  
  if (!request) {
    return res.status(404).json({ error: 'Consent request not found' });
  }

  res.json(request);
});

app.get('/consent/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const requests = consentManager.getPendingRequestsForSession(sessionId);
  
  res.json(requests);
});

// Consent decision endpoint
app.post('/consent/decision', (req, res) => {
  try {
    const decision: ConsentDecision = {
      requestId: req.body.requestId,
      approvedScopes: req.body.approvedScopes || [],
      decision: req.body.decision,
      timestamp: new Date()
    };

    const success = consentManager.processConsentDecision(decision);
    
    if (success) {
      res.json({ 
        success: true,
        message: 'Consent decision processed successfully'
      });
    } else {
      res.status(400).json({ 
        error: 'Failed to process consent decision' 
      });
    }
  } catch (error) {
    console.error('Error processing consent decision:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// Consent callback from IDP
app.get('/consent/callback', createConsentCallbackHandler(consentManager));

// Consent UI page
app.get('/consent/:requestId', (req, res) => {
  const { requestId } = req.params;
  
  // Serve the consent UI HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP Consent Request</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://unpkg.com/lucide-react@latest/dist/umd/lucide-react.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        const { useState, useEffect } = React;
        const { Shield, CheckCircle, XCircle, Clock, AlertTriangle, User, Lock, Unlock, ExternalLink } = LucideReact;

        const ConsentPrompt = ({ requestId }) => {
            const [request, setRequest] = useState(null);
            const [selectedScopes, setSelectedScopes] = useState([]);
            const [isProcessing, setIsProcessing] = useState(false);
            const [error, setError] = useState(null);

            useEffect(() => {
                fetch(\`/consent/request/\${requestId}\`)
                    .then(res => res.json())
                    .then(data => {
                        setRequest(data);
                        setSelectedScopes(data.requestedScopes || []);
                    })
                    .catch(err => setError('Failed to load consent request'));
            }, [requestId]);

            const scopeDescriptions = {
                'tools:read': 'Read access to files and data (ListFiles, ReadFile, GetFileInfo)',
                'tools:write': 'Write access to create and modify files (CreateFile, UpdateFile, DeleteFile)',
                'data:export': 'Export user data and generate reports (ExportData, GenerateReport)',
                'network:access': 'Access external APIs and network resources (HttpRequest, ApiCall)',
                'system:admin': 'Administrative access to system configuration (ConfigureSystem, ManageUsers)',
                'todo:plan': 'Plan and create new tasks (addTask)',
                'todos:worker': 'Complete and manage existing tasks (completeTask)'
            };

            const handleScopeToggle = (scope) => {
                setSelectedScopes(prev => 
                    prev.includes(scope) 
                        ? prev.filter(s => s !== scope)
                        : [...prev, scope]
                );
            };

            const handleApprove = async () => {
                setIsProcessing(true);
                try {
                    const response = await fetch('/consent/decision', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            requestId,
                            approvedScopes: selectedScopes,
                            decision: 'approve'
                        })
                    });
                    
                    if (response.ok) {
                        alert('Consent granted successfully! You can now close this window.');
                        window.close();
                    } else {
                        throw new Error('Failed to approve consent');
                    }
                } catch (err) {
                    setError('Failed to approve consent');
                } finally {
                    setIsProcessing(false);
                }
            };

            const handleDeny = async () => {
                setIsProcessing(true);
                try {
                    const response = await fetch('/consent/decision', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            requestId,
                            approvedScopes: [],
                            decision: 'deny'
                        })
                    });
                    
                    if (response.ok) {
                        alert('Consent denied. The agent will not be able to use the requested tools.');
                        window.close();
                    } else {
                        throw new Error('Failed to deny consent');
                    }
                } catch (err) {
                    setError('Failed to deny consent');
                } finally {
                    setIsProcessing(false);
                }
            };

            if (error) {
                return (
                    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                        <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full shadow-2xl p-6">
                            <div className="flex items-center space-x-3 mb-4">
                                <XCircle className="w-6 h-6 text-red-400" />
                                <h3 className="text-lg font-bold text-white">Error</h3>
                            </div>
                            <p className="text-gray-300">{error}</p>
                        </div>
                    </div>
                );
            }

            if (!request) {
                return (
                    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                        <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full shadow-2xl p-6">
                            <div className="flex items-center space-x-3 mb-4">
                                <Clock className="w-6 h-6 text-blue-400 animate-spin" />
                                <h3 className="text-lg font-bold text-white">Loading...</h3>
                            </div>
                        </div>
                    </div>
                );
            }

            return (
                <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full shadow-2xl">
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

                        <div className="p-4 space-y-4">
                            <div className="bg-gray-700/50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-white">Agent Request</span>
                                    <span className="text-xs text-gray-400 font-mono">{request.agentId}</span>
                                </div>
                                <p className="text-sm text-gray-300 mb-2">{request.reason}</p>
                                <div className="flex flex-wrap gap-1">
                                    {request.tools.map((tool, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                                            {tool}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-medium text-white mb-3">Grant Permissions</h4>
                                <div className="space-y-2">
                                    {request.requestedScopes.map((scope) => (
                                        <div key={scope} className="flex items-start space-x-3">
                                            <button
                                                onClick={() => handleScopeToggle(scope)}
                                                className={\`mt-1 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors duration-200 \${
                                                    selectedScopes.includes(scope)
                                                        ? 'bg-green-500 border-green-500'
                                                        : 'border-gray-500 hover:border-gray-400'
                                                }\`}
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

                            <div className="text-xs text-gray-400 bg-gray-700/30 rounded p-2">
                                <div className="flex justify-between">
                                    <span>Session: {request.sessionId}</span>
                                    <span>Expires: 15 minutes</span>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-700 p-4 flex items-center justify-between">
                            <button
                                onClick={() => window.close()}
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

        ReactDOM.render(<ConsentPrompt requestId="${requestId}" />, document.getElementById('root'));
    </script>
</body>
</html>`;

  res.send(html);
});

// Proxy MCP requests to the actual MCP server
app.all('/mcp', async (req, res) => {
  try {
    const mcpServerUrl = process.env.MCP_SERVER_URL || 'http://localhost:3000/mcp';
    const sessionId = (req as any).sessionId || generateSessionId();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'mcp-session-id': sessionId
    };
    
    // Check if we have a valid consent token for this session
    const consentToken = consentManager.validateToken(sessionId);
    if (consentToken) {
      // Add consent token to headers for downstream MCP server
      headers['x-consent-scopes'] = consentToken.scopes.join(' ');
      headers['x-consent-agent-id'] = consentToken.agentId;
    }
    
    // Copy safe headers
    const safeHeaders = ['authorization', 'x-request-id', 'user-agent'];
    for (const header of safeHeaders) {
      const value = req.headers[header];
      if (typeof value === 'string') {
        headers[header] = value;
      }
    }

    const response = await fetch(mcpServerUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();

    // Check if the response is a 403 with insufficient_scope error
    if (response.status === 403 && data.error && data.error.message === 'insufficient_scope') {
      // Extract tool name from the request
      const toolName = req.body?.params?.name;
      
      if (toolName) {
        // Get required scopes for this tool
        const requiredScopes = consentManager.getRequiredScopes(toolName);
        
        // Create consent request
        const consentRequest = consentManager.createConsentRequest(sessionId, requiredScopes, toolName);
        
        // Generate authorization URL
        const authUrl = consentManager.generateAuthorizationUrl(
          sessionId,
          requiredScopes,
          config.idpAuthUrl,
          config.idpClientId
        );
        
        // Return consent request with authorization URL
        const consentResponse = {
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'Consent required',
            data: {
              sessionId,
              requiredScopes,
              toolName,
              authorizationUrl: authUrl,
              consentUrl: `${config.consentBaseUrl}/consent/${consentRequest.id}`,
              message: `Tool '${toolName}' requires additional permissions: ${requiredScopes.join(', ')}`
            }
          },
          id: req.body?.id || null
        };

        return res.status(403).json(consentResponse);
      }
    }

    // Pass through the original response
    res.status(response.status).json(data);
  } catch (error) {
    console.error('MCP proxy error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error',
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      },
      id: req.body?.id || null
    });
  }
});

// Helper function to generate session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Start server
app.listen(PORT, () => {
  console.log(`MCP Consent Server running on port ${PORT}`);
  console.log(`Consent UI available at: http://localhost:${PORT}/consent/:requestId`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
