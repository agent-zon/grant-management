import { Router } from 'express';
import { GrantDatabase } from '../database.js';

// Create Express router for MCP integration
const router = Router();

// MCP tool scope mappings (matching the middleware configuration)
const TOOL_SCOPE_MAPPINGS = {
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
};

// =============================================================================
// MCP CONSENT ENDPOINTS
// =============================================================================

/**
 * @swagger
 * /mcp/consent/request:
 *   post:
 *     summary: Create MCP consent request
 *     tags: [MCP Integration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - toolName
 *               - agentId
 *             properties:
 *               sessionId:
 *                 type: string
 *               toolName:
 *                 type: string
 *               agentId:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Consent request created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestId:
 *                   type: string
 *                 consentUrl:
 *                   type: string
 *                 requiredScopes:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/mcp/consent/request', async (req, res) => {
  try {
    const { sessionId, toolName, agentId, reason } = req.body;
    
    if (!sessionId || !toolName || !agentId) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'sessionId, toolName, and agentId are required'
      });
    }
    
    // Get required scopes for the tool
    const requiredScopes = TOOL_SCOPE_MAPPINGS[toolName] || [];
    
    if (requiredScopes.length === 0) {
      return res.status(200).json({
        message: 'No consent required for this tool',
        toolName,
        requiredScopes: []
      });
    }
    
    // Create consent request in our database
    const result = GrantDatabase.createConsentRequest(
      agentId,
      sessionId,
      requiredScopes,
      [toolName],
      null, // workloadId
      reason || `Tool '${toolName}' requires additional permissions`
    );
    
    const consentUrl = `${req.protocol}://${req.get('host')}/consent/${result.id}`;
    
    res.status(201).json({
      requestId: result.id,
      consentUrl,
      requiredScopes,
      toolName,
      sessionId,
      message: `Tool '${toolName}' requires permissions: ${requiredScopes.join(', ')}`
    });
  } catch (error) {
    console.error('Error creating MCP consent request:', error);
    res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to create consent request'
    });
  }
});

/**
 * @swagger
 * /mcp/consent/{requestId}/decision:
 *   post:
 *     summary: Process MCP consent decision
 *     tags: [MCP Integration]
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - decision
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [approve, deny]
 *               approvedScopes:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Decision processed successfully
 */
router.post('/mcp/consent/:requestId/decision', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { decision, approvedScopes = [] } = req.body;
    
    const request = GrantDatabase.getConsentRequest(requestId);
    if (!request) {
      return res.status(404).json({
        error: 'not_found',
        message: 'Consent request not found'
      });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Consent request has already been processed'
      });
    }
    
    const userResponse = {
      approved_scopes: decision === 'approve' ? approvedScopes : [],
      denied_scopes: decision === 'deny' ? JSON.parse(request.requested_scopes) : [],
      timestamp: new Date().toISOString()
    };
    
    // Update consent request status
    GrantDatabase.updateConsentRequest(requestId, decision === 'approve' ? 'approved' : 'denied', userResponse);
    
    // If approved, create grants for approved scopes
    if (decision === 'approve' && approvedScopes.length > 0) {
      const scope = approvedScopes.join(' ');
      GrantDatabase.createGrant(
        'mcp-client', // Default client ID for MCP
        'mcp-user',   // Default user ID for MCP
        scope,
        request.session_id,
        null, // workloadId
        null, // expires_at (let it use default)
        { toolName: JSON.parse(request.tools)[0] }
      );
      
      // Create session token for immediate use
      GrantDatabase.createSessionToken(
        request.session_id,
        approvedScopes,
        'mcp-client',
        15 * 60 // 15 minutes
      );
    }
    
    res.json({
      success: true,
      decision,
      requestId,
      sessionId: request.session_id,
      approvedScopes: decision === 'approve' ? approvedScopes : []
    });
  } catch (error) {
    console.error('Error processing MCP consent decision:', error);
    res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to process consent decision'
    });
  }
});

/**
 * @swagger
 * /mcp/session/{sessionId}/token:
 *   get:
 *     summary: Get session token and scopes
 *     tags: [MCP Integration]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session token information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: string
 *                 scopes:
 *                   type: array
 *                   items:
 *                     type: string
 *                 issuedAt:
 *                   type: string
 *                   format: date-time
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                 valid:
 *                   type: boolean
 *       404:
 *         description: No valid token found
 */
router.get('/mcp/session/:sessionId/token', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get active session tokens
    const tokens = GrantDatabase.getSessionTokensBySession(sessionId, 'active');
    
    if (tokens.length === 0) {
      return res.status(404).json({
        error: 'no_token',
        message: 'No valid session token found',
        sessionId
      });
    }
    
    // Get the most recent token
    const token = tokens.sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime())[0];
    
    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(token.expires_at);
    const isExpired = now > expiresAt;
    
    if (isExpired) {
      return res.status(404).json({
        error: 'token_expired',
        message: 'Session token has expired',
        sessionId,
        expiresAt: token.expires_at
      });
    }
    
    res.json({
      sessionId: token.session_id,
      scopes: JSON.parse(token.scopes),
      issuedAt: token.issued_at,
      expiresAt: token.expires_at,
      valid: true,
      usageCount: token.usage_count
    });
  } catch (error) {
    console.error('Error getting session token:', error);
    res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to get session token'
    });
  }
});

/**
 * @swagger
 * /mcp/tool/{toolName}/scopes:
 *   get:
 *     summary: Get required scopes for a tool
 *     tags: [MCP Integration]
 *     parameters:
 *       - in: path
 *         name: toolName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tool scope information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 toolName:
 *                   type: string
 *                 requiredScopes:
 *                   type: array
 *                   items:
 *                     type: string
 *                 requiresConsent:
 *                   type: boolean
 */
router.get('/mcp/tool/:toolName/scopes', (req, res) => {
  try {
    const { toolName } = req.params;
    const requiredScopes = TOOL_SCOPE_MAPPINGS[toolName] || [];
    
    res.json({
      toolName,
      requiredScopes,
      requiresConsent: requiredScopes.length > 0
    });
  } catch (error) {
    console.error('Error getting tool scopes:', error);
    res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to get tool scopes'
    });
  }
});

/**
 * @swagger
 * /mcp/session/{sessionId}/authorize:
 *   post:
 *     summary: Check if session is authorized for tool
 *     tags: [MCP Integration]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toolName
 *             properties:
 *               toolName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Authorization check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authorized:
 *                   type: boolean
 *                 toolName:
 *                   type: string
 *                 sessionId:
 *                   type: string
 *                 requiredScopes:
 *                   type: array
 *                   items:
 *                     type: string
 *                 missingScopes:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/mcp/session/:sessionId/authorize', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { toolName } = req.body;
    
    if (!toolName) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'toolName is required'
      });
    }
    
    const requiredScopes = TOOL_SCOPE_MAPPINGS[toolName] || [];
    
    // If no scopes required, tool is authorized
    if (requiredScopes.length === 0) {
      return res.json({
        authorized: true,
        toolName,
        sessionId,
        requiredScopes: [],
        missingScopes: []
      });
    }
    
    // Get session tokens to check scopes
    const tokens = GrantDatabase.getSessionTokensBySession(sessionId, 'active');
    
    if (tokens.length === 0) {
      return res.json({
        authorized: false,
        toolName,
        sessionId,
        requiredScopes,
        missingScopes: requiredScopes
      });
    }
    
    // Get all scopes from active tokens
    const allScopes = new Set();
    const now = new Date();
    
    for (const token of tokens) {
      const expiresAt = new Date(token.expires_at);
      if (now <= expiresAt) {
        const tokenScopes = JSON.parse(token.scopes);
        tokenScopes.forEach(scope => allScopes.add(scope));
      }
    }
    
    const availableScopes = Array.from(allScopes);
    const missingScopes = requiredScopes.filter(scope => !availableScopes.includes(scope));
    const authorized = missingScopes.length === 0;
    
    res.json({
      authorized,
      toolName,
      sessionId,
      requiredScopes,
      missingScopes,
      availableScopes
    });
  } catch (error) {
    console.error('Error checking authorization:', error);
    res.status(500).json({
      error: 'internal_server_error',
      message: 'Failed to check authorization'
    });
  }
});

// =============================================================================
// MCP CONSENT UI (Enhanced)
// =============================================================================

/**
 * Enhanced consent screen that integrates with our grant management system
 */
router.get('/consent/:requestId', (req, res) => {
  try {
    const { requestId } = req.params;
    const request = GrantDatabase.getConsentRequest(requestId);
    
    if (!request) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Consent Request Not Found</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
          <div class="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full shadow-2xl p-6 text-center">
            <h1 class="text-xl font-bold text-red-400 mb-4">Request Not Found</h1>
            <p class="text-gray-300">The consent request you're looking for doesn't exist or has expired.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    if (request.status !== 'pending') {
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Request Already Processed</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
          <div class="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full shadow-2xl p-6 text-center">
            <h1 class="text-xl font-bold text-green-400 mb-4">Request Already Processed</h1>
            <p class="text-gray-300">This consent request has already been ${request.status}.</p>
            <div class="mt-4 px-4 py-2 bg-${request.status === 'approved' ? 'green' : 'red'}-500/20 text-${request.status === 'approved' ? 'green' : 'red'}-400 rounded-lg">
              Status: ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </div>
          </div>
        </body>
        </html>
      `);
    }
    
    const requestedScopes = JSON.parse(request.requested_scopes);
    const tools = JSON.parse(request.tools);
    
    // Render enhanced consent screen
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>MCP Agent Authorization Request</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div class="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full shadow-2xl">
          <div class="bg-gradient-to-r from-orange-500/20 to-red-500/20 border-b border-gray-700 p-6">
            <div class="flex items-center space-x-3">
              <div class="p-3 bg-orange-500/20 rounded-lg">
                <svg class="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
              <div>
                <h1 class="text-xl font-bold text-white">🤖 MCP Agent Authorization</h1>
                <p class="text-gray-400">An AI agent is requesting tool access permissions</p>
              </div>
            </div>
          </div>

          <div class="p-6 space-y-6">
            <div class="bg-gray-700/50 rounded-lg p-4">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-400">Agent ID:</span>
                  <p class="text-white font-mono">${request.agent_id}</p>
                </div>
                <div>
                  <span class="text-gray-400">Session ID:</span>
                  <p class="text-white font-mono">${request.session_id}</p>
                </div>
              </div>
              <div class="mt-3">
                <span class="text-gray-400">Requested:</span>
                <p class="text-white">${new Date(request.created_at).toLocaleString()}</p>
              </div>
            </div>
            
            ${request.reason ? `
              <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h3 class="text-blue-400 font-medium mb-2">🔍 Reason for Request</h3>
                <p class="text-gray-300">${request.reason}</p>
              </div>
            ` : ''}
            
            <div>
              <h3 class="text-white font-medium mb-3">🛠️ Tools Requesting Access</h3>
              <div class="space-y-2">
                ${tools.map(tool => `
                  <div class="bg-gray-700/50 rounded-lg p-3 border-l-4 border-green-500">
                    <div class="flex items-center justify-between">
                      <span class="text-green-400 font-medium">${tool}</span>
                      <span class="text-xs text-gray-400 bg-gray-600/50 px-2 py-1 rounded">MCP Tool</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div>
              <h3 class="text-white font-medium mb-3">🔑 Required Permissions</h3>
              <div class="space-y-3" id="scopes-container">
                ${requestedScopes.map(scope => `
                  <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                    <div class="flex items-start space-x-3">
                      <input type="checkbox" id="scope-${scope}" class="mt-1 w-4 h-4 text-green-500 rounded border-gray-600 bg-gray-700 focus:ring-green-500" checked onchange="updateSelection()">
                      <div class="flex-1">
                        <label for="scope-${scope}" class="block text-white font-medium cursor-pointer">${scope}</label>
                        <p class="text-sm text-gray-400 mt-1">${getScopeDescription(scope)}</p>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <h4 class="text-yellow-400 font-medium mb-2">⚠️ Security Notice</h4>
              <p class="text-sm text-gray-300">
                These permissions will be granted for this session only. You can revoke them at any time through the Grant Management dashboard.
              </p>
            </div>
          </div>

          <div class="border-t border-gray-700 p-6 flex items-center justify-between">
            <button onclick="window.close()" class="text-gray-400 hover:text-gray-300 transition-colors">
              Decide Later
            </button>
            
            <div class="flex space-x-3">
              <button onclick="handleDecision('deny')" id="deny-btn" 
                class="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2">
                <span>❌ Deny</span>
              </button>
              
              <button onclick="handleDecision('approve')" id="approve-btn"
                class="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2">
                <span id="approve-text">✅ Grant (<span id="selected-count">${requestedScopes.length}</span>)</span>
              </button>
            </div>
          </div>
        </div>
        
        <script>
          function getScopeDescription(scope) {
            const descriptions = {
              'tools:read': 'Read access to files and data',
              'tools:write': 'Write access to create and modify files',
              'data:export': 'Export user data and generate reports',
              'network:access': 'Access external APIs and network resources',
              'system:admin': 'Administrative access to system configuration',
              'todo:plan': 'Plan and create new tasks',
              'todos:worker': 'Complete and manage existing tasks'
            };
            return descriptions[scope] || 'Permission for specific tool access';
          }
          
          function updateSelection() {
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
            document.getElementById('selected-count').textContent = selectedCount;
          }
          
          async function handleDecision(decision) {
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            const approvedScopes = Array.from(checkboxes)
              .filter(cb => cb.checked)
              .map(cb => cb.id.replace('scope-', ''));
            
            document.getElementById('deny-btn').disabled = true;
            document.getElementById('approve-btn').disabled = true;
            
            try {
              const response = await fetch('/mcp/consent/${requestId}/decision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  decision: decision,
                  approvedScopes: decision === 'approve' ? approvedScopes : []
                })
              });
              
              const result = await response.json();
              
              if (result.success) {
                document.body.innerHTML = \`
                  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
                    <div class="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full shadow-2xl p-6 text-center">
                      <div class="mb-4">
                        \${decision === 'approve' ? '✅' : '❌'}
                      </div>
                      <h1 class="text-xl font-bold text-white mb-4">
                        Request \${decision === 'approve' ? 'Approved' : 'Denied'}
                      </h1>
                      <p class="text-gray-300 mb-4">
                        Your decision has been recorded. The agent can now \${decision === 'approve' ? 'proceed with the granted permissions' : 'handle the denial appropriately'}.
                      </p>
                      \${decision === 'approve' ? \`
                        <div class="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                          <p class="text-green-400 text-sm">Granted \${approvedScopes.length} permission(s)</p>
                        </div>
                      \` : ''}
                      <button onclick="window.close()" class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                        Close Window
                      </button>
                    </div>
                  </div>
                \`;
              } else {
                alert('Error: ' + (result.message || 'Failed to process request'));
                document.getElementById('deny-btn').disabled = false;
                document.getElementById('approve-btn').disabled = false;
              }
            } catch (error) {
              console.error('Error:', error);
              alert('An error occurred while processing your request.');
              document.getElementById('deny-btn').disabled = false;
              document.getElementById('approve-btn').disabled = false;
            }
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error rendering MCP consent screen:', error);
    res.status(500).send('Internal server error');
  }
});

// Helper function for scope descriptions
function getScopeDescription(scope) {
  const descriptions = {
    'tools:read': 'Read access to files and data (ListFiles, ReadFile, GetFileInfo)',
    'tools:write': 'Write access to create and modify files (CreateFile, UpdateFile, DeleteFile)',
    'data:export': 'Export user data and generate reports (ExportData, GenerateReport)',
    'network:access': 'Access external APIs and network resources (HttpRequest, ApiCall)',
    'system:admin': 'Administrative access to system configuration (ConfigureSystem, ManageUsers)',
    'todo:plan': 'Plan and create new tasks (addTask)',
    'todos:worker': 'Complete and manage existing tasks (completeTask)'
  };
  return descriptions[scope] || 'Permission for specific tool access';
}

export default router;
