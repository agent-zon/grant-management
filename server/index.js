import express from 'express';
import cors from 'cors';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GrantDatabase } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Grant Management API',
      version: '1.0.0',
      description: 'OAuth 2.0 Grant Management API for Agent Authorization System',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Grant: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Unique grant identifier' },
            client_id: { type: 'string', description: 'OAuth client identifier' },
            user_id: { type: 'string', description: 'User identifier' },
            scope: { type: 'string', description: 'Granted scopes (space-separated)' },
            status: { 
              type: 'string', 
              enum: ['active', 'revoked', 'expired'],
              description: 'Grant status'
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
            expires_at: { type: 'string', format: 'date-time', nullable: true },
            session_id: { type: 'string', nullable: true },
            workload_id: { type: 'string', nullable: true },
            grant_data: { type: 'object', nullable: true }
          }
        },
        ConsentRequest: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            agent_id: { type: 'string' },
            session_id: { type: 'string' },
            requested_scopes: { 
              type: 'array',
              items: { type: 'string' }
            },
            tools: {
              type: 'array',
              items: { type: 'string' }
            },
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'denied', 'expired']
            },
            created_at: { type: 'string', format: 'date-time' },
            expires_at: { type: 'string', format: 'date-time' },
            authorization_link: { type: 'string' },
            workload_id: { type: 'string', nullable: true },
            reason: { type: 'string', nullable: true }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./server/index.js'] // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Middleware for authentication (simplified for demo)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      error: 'unauthorized', 
      message: 'Access token is required' 
    });
  }
  
  // In a real implementation, verify JWT token here
  // For demo purposes, we'll accept any token
  req.user = { id: 'demo-user', client_id: 'demo-client' };
  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'internal_server_error',
    message: 'An internal server error occurred',
    timestamp: new Date().toISOString()
  });
};

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  });
});

/**
 * @swagger
 * /grants:
 *   get:
 *     summary: Get all grants for the authenticated client
 *     tags: [Grants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, revoked, expired]
 *         description: Filter grants by status
 *       - in: query
 *         name: session_id
 *         schema:
 *           type: string
 *         description: Filter grants by session ID
 *     responses:
 *       200:
 *         description: List of grants
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Grant'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.get('/grants', authenticateToken, (req, res) => {
  try {
    const { status = 'active', session_id } = req.query;
    
    let grants;
    if (session_id) {
      grants = GrantDatabase.getGrantsBySession(session_id, status);
    } else {
      grants = GrantDatabase.getGrantsByClient(req.user.client_id, status);
    }
    
    res.json(grants);
  } catch (error) {
    console.error('Error fetching grants:', error);
    res.status(500).json({ 
      error: 'internal_server_error', 
      message: 'Failed to fetch grants' 
    });
  }
});

/**
 * @swagger
 * /grants/{grantId}:
 *   get:
 *     summary: Get a specific grant by ID
 *     tags: [Grants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Grant ID
 *     responses:
 *       200:
 *         description: Grant details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Grant'
 *       404:
 *         description: Grant not found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.get('/grants/:grantId', authenticateToken, (req, res) => {
  try {
    const grant = GrantDatabase.getGrant(req.params.grantId);
    
    if (!grant) {
      return res.status(404).json({ 
        error: 'not_found', 
        message: 'Grant not found' 
      });
    }
    
    // Verify the grant belongs to the authenticated client
    if (grant.client_id !== req.user.client_id) {
      return res.status(403).json({ 
        error: 'forbidden', 
        message: 'Access denied to this grant' 
      });
    }
    
    res.json(grant);
  } catch (error) {
    console.error('Error fetching grant:', error);
    res.status(500).json({ 
      error: 'internal_server_error', 
      message: 'Failed to fetch grant' 
    });
  }
});

/**
 * @swagger
 * /grants:
 *   post:
 *     summary: Create a new grant
 *     tags: [Grants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - scope
 *             properties:
 *               user_id:
 *                 type: string
 *               scope:
 *                 type: string
 *                 description: Space-separated list of scopes
 *               session_id:
 *                 type: string
 *               workload_id:
 *                 type: string
 *               expires_at:
 *                 type: string
 *                 format: date-time
 *               grant_data:
 *                 type: object
 *     responses:
 *       201:
 *         description: Grant created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Grant'
 *       400:
 *         description: Invalid request data
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.post('/grants', authenticateToken, (req, res) => {
  try {
    const { user_id, scope, session_id, workload_id, expires_at, grant_data } = req.body;
    
    if (!user_id || !scope) {
      return res.status(400).json({ 
        error: 'invalid_request', 
        message: 'user_id and scope are required' 
      });
    }
    
    const result = GrantDatabase.createGrant(
      req.user.client_id,
      user_id,
      scope,
      session_id,
      workload_id,
      expires_at,
      grant_data
    );
    
    const grant = GrantDatabase.getGrant(result.id);
    res.status(201).json(grant);
  } catch (error) {
    console.error('Error creating grant:', error);
    res.status(500).json({ 
      error: 'internal_server_error', 
      message: 'Failed to create grant' 
    });
  }
});

/**
 * @swagger
 * /grants/{grantId}:
 *   put:
 *     summary: Update a grant
 *     tags: [Grants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grantId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scope:
 *                 type: string
 *               grant_data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Grant updated successfully
 *       404:
 *         description: Grant not found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.put('/grants/:grantId', authenticateToken, (req, res) => {
  try {
    const grant = GrantDatabase.getGrant(req.params.grantId);
    
    if (!grant) {
      return res.status(404).json({ 
        error: 'not_found', 
        message: 'Grant not found' 
      });
    }
    
    if (grant.client_id !== req.user.client_id) {
      return res.status(403).json({ 
        error: 'forbidden', 
        message: 'Access denied to this grant' 
      });
    }
    
    const { scope, grant_data } = req.body;
    
    GrantDatabase.updateGrant(
      req.params.grantId,
      scope || grant.scope,
      grant_data,
      req.user.id
    );
    
    const updatedGrant = GrantDatabase.getGrant(req.params.grantId);
    res.json(updatedGrant);
  } catch (error) {
    console.error('Error updating grant:', error);
    res.status(500).json({ 
      error: 'internal_server_error', 
      message: 'Failed to update grant' 
    });
  }
});

/**
 * @swagger
 * /grants/{grantId}:
 *   delete:
 *     summary: Revoke a grant
 *     tags: [Grants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Grant revoked successfully
 *       404:
 *         description: Grant not found
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.delete('/grants/:grantId', authenticateToken, (req, res) => {
  try {
    const grant = GrantDatabase.getGrant(req.params.grantId);
    
    if (!grant) {
      return res.status(404).json({ 
        error: 'not_found', 
        message: 'Grant not found' 
      });
    }
    
    if (grant.client_id !== req.user.client_id) {
      return res.status(403).json({ 
        error: 'forbidden', 
        message: 'Access denied to this grant' 
      });
    }
    
    GrantDatabase.revokeGrant(req.params.grantId, req.user.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error revoking grant:', error);
    res.status(500).json({ 
      error: 'internal_server_error', 
      message: 'Failed to revoke grant' 
    });
  }
});

/**
 * @swagger
 * /consent-requests:
 *   get:
 *     summary: Get pending consent requests
 *     tags: [Consent]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending consent requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ConsentRequest'
 */
app.get('/consent-requests', authenticateToken, (req, res) => {
  try {
    const requests = GrantDatabase.getPendingConsentRequests();
    res.json(requests);
  } catch (error) {
    console.error('Error fetching consent requests:', error);
    res.status(500).json({ 
      error: 'internal_server_error', 
      message: 'Failed to fetch consent requests' 
    });
  }
});

/**
 * @swagger
 * /consent-requests:
 *   post:
 *     summary: Create a new consent request
 *     tags: [Consent]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - agent_id
 *               - session_id
 *               - requested_scopes
 *               - tools
 *             properties:
 *               agent_id:
 *                 type: string
 *               session_id:
 *                 type: string
 *               requested_scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *               tools:
 *                 type: array
 *                 items:
 *                   type: string
 *               workload_id:
 *                 type: string
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Consent request created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConsentRequest'
 */
app.post('/consent-requests', authenticateToken, (req, res) => {
  try {
    const { agent_id, session_id, requested_scopes, tools, workload_id, reason } = req.body;
    
    if (!agent_id || !session_id || !requested_scopes || !tools) {
      return res.status(400).json({ 
        error: 'invalid_request', 
        message: 'agent_id, session_id, requested_scopes, and tools are required' 
      });
    }
    
    const result = GrantDatabase.createConsentRequest(
      agent_id, session_id, requested_scopes, tools, workload_id, reason
    );
    
    const request = GrantDatabase.getConsentRequest(result.id);
    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating consent request:', error);
    res.status(500).json({ 
      error: 'internal_server_error', 
      message: 'Failed to create consent request' 
    });
  }
});

/**
 * @swagger
 * /consent/{requestId}:
 *   get:
 *     summary: Get consent screen for a specific request
 *     tags: [Consent]
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Consent screen HTML
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       404:
 *         description: Consent request not found
 */
app.get('/consent/:requestId', (req, res) => {
  try {
    const request = GrantDatabase.getConsentRequest(req.params.requestId);
    
    if (!request) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Consent Request Not Found</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                   background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
            .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 400px; text-align: center; }
            h1 { color: #e53e3e; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Request Not Found</h1>
            <p>The consent request you're looking for doesn't exist or has expired.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    if (request.status !== 'pending') {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Consent Request Already Processed</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                   background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
            .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 400px; text-align: center; }
            h1 { color: #38a169; margin-bottom: 20px; }
            .status { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; text-transform: capitalize; }
            .approved { background: #c6f6d5; color: #22543d; }
            .denied { background: #fed7d7; color: #742a2a; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Request Already Processed</h1>
            <p>This consent request has already been processed.</p>
            <div class="status ${request.status === 'approved' ? 'approved' : 'denied'}">${request.status}</div>
          </div>
        </body>
        </html>
      `);
    }
    
    // Render consent screen
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Agent Authorization Request</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            margin: 0; padding: 20px; min-height: 100vh; display: flex; align-items: center; justify-content: center; 
          }
          .container { 
            background: white; padding: 40px; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); 
            max-width: 600px; width: 100%; 
          }
          h1 { color: #2d3748; margin-bottom: 10px; text-align: center; }
          .subtitle { color: #718096; text-align: center; margin-bottom: 30px; }
          .section { margin-bottom: 25px; }
          .section h3 { color: #4a5568; margin-bottom: 10px; font-size: 16px; }
          .scope-item, .tool-item { 
            background: #f7fafc; padding: 12px; border-radius: 8px; margin-bottom: 8px; 
            border-left: 4px solid #4299e1; 
          }
          .scope-item strong { color: #2b6cb0; }
          .tool-item { border-left-color: #38a169; }
          .tool-item strong { color: #2f855a; }
          .reason { 
            background: #fff5f5; border: 1px solid #feb2b2; border-radius: 8px; padding: 15px; 
            margin-bottom: 25px; 
          }
          .reason strong { color: #c53030; }
          .actions { 
            display: flex; gap: 15px; justify-content: center; margin-top: 30px; 
          }
          button { 
            padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; 
            cursor: pointer; transition: all 0.2s; min-width: 120px; 
          }
          .approve { background: #48bb78; color: white; }
          .approve:hover { background: #38a169; transform: translateY(-1px); }
          .deny { background: #e53e3e; color: white; }
          .deny:hover { background: #c53030; transform: translateY(-1px); }
          .meta { 
            background: #edf2f7; padding: 15px; border-radius: 8px; margin-bottom: 20px; 
            font-size: 14px; color: #4a5568; 
          }
          .meta div { margin-bottom: 5px; }
          .meta strong { color: #2d3748; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 Agent Authorization Request</h1>
          <p class="subtitle">An AI agent is requesting permission to access additional tools and data</p>
          
          <div class="meta">
            <div><strong>Agent ID:</strong> ${request.agent_id}</div>
            <div><strong>Session ID:</strong> ${request.session_id}</div>
            ${request.workload_id ? `<div><strong>Workload ID:</strong> ${request.workload_id}</div>` : ''}
            <div><strong>Requested:</strong> ${new Date(request.created_at).toLocaleString()}</div>
          </div>
          
          ${request.reason ? `
            <div class="reason">
              <strong>Reason for Request:</strong><br>
              ${request.reason}
            </div>
          ` : ''}
          
          <div class="section">
            <h3>🔑 Requested Permissions</h3>
            ${request.requested_scopes.map(scope => `
              <div class="scope-item">
                <strong>${scope}</strong>
                <div style="font-size: 14px; color: #718096; margin-top: 4px;">
                  ${getScopeDescription(scope)}
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="section">
            <h3>🛠️ Tools to be Accessed</h3>
            ${request.tools.map(tool => `
              <div class="tool-item">
                <strong>${tool}</strong>
                <div style="font-size: 14px; color: #718096; margin-top: 4px;">
                  ${getToolDescription(tool)}
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="actions">
            <button class="deny" onclick="handleResponse('denied')">❌ Deny</button>
            <button class="approve" onclick="handleResponse('approved')">✅ Approve</button>
          </div>
        </div>
        
        <script>
          function handleResponse(status) {
            fetch('/consent/${request.id}/respond', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                status: status,
                approved_scopes: status === 'approved' ? ${JSON.stringify(request.requested_scopes)} : [],
                denied_scopes: status === 'denied' ? ${JSON.stringify(request.requested_scopes)} : []
              })
            })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                document.body.innerHTML = \`
                  <div class="container" style="text-align: center;">
                    <h1>\${status === 'approved' ? '✅ Request Approved' : '❌ Request Denied'}</h1>
                    <p>Your response has been recorded. You can close this window.</p>
                    <div style="margin-top: 20px; padding: 15px; background: \${status === 'approved' ? '#c6f6d5' : '#fed7d7'}; border-radius: 8px;">
                      <strong>Status:</strong> \${status.charAt(0).toUpperCase() + status.slice(1)}
                    </div>
                  </div>
                \`;
              } else {
                alert('Error processing request: ' + data.message);
              }
            })
            .catch(error => {
              console.error('Error:', error);
              alert('An error occurred while processing your request.');
            });
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error rendering consent screen:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * @swagger
 * /consent/{requestId}/respond:
 *   post:
 *     summary: Respond to a consent request
 *     tags: [Consent]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, denied]
 *               approved_scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *               denied_scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Response recorded successfully
 */
app.post('/consent/:requestId/respond', (req, res) => {
  try {
    const request = GrantDatabase.getConsentRequest(req.params.requestId);
    
    if (!request) {
      return res.status(404).json({ 
        success: false,
        message: 'Consent request not found' 
      });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: 'Consent request has already been processed' 
      });
    }
    
    const { status, approved_scopes = [], denied_scopes = [] } = req.body;
    
    const userResponse = {
      approved_scopes,
      denied_scopes,
      timestamp: new Date().toISOString()
    };
    
    GrantDatabase.updateConsentRequest(req.params.requestId, status, userResponse);
    
    // If approved, create grants for approved scopes
    if (status === 'approved' && approved_scopes.length > 0) {
      const scope = approved_scopes.join(' ');
      GrantDatabase.createGrant(
        'demo-client', // In real implementation, get from request
        'demo-user',   // In real implementation, get from session
        scope,
        request.session_id,
        request.workload_id
      );
    }
    
    res.json({ success: true, status });
  } catch (error) {
    console.error('Error responding to consent request:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to process response' 
    });
  }
});

/**
 * @swagger
 * /audit:
 *   get:
 *     summary: Get audit logs
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: grant_id
 *         schema:
 *           type: string
 *         description: Filter logs by grant ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of logs to return
 *     responses:
 *       200:
 *         description: Audit logs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   grant_id:
 *                     type: string
 *                   action:
 *                     type: string
 *                   actor:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                   details:
 *                     type: object
 */
app.get('/audit', authenticateToken, (req, res) => {
  try {
    const { grant_id, limit = 100 } = req.query;
    const logs = GrantDatabase.getAuditLogs(grant_id, parseInt(limit));
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ 
      error: 'internal_server_error', 
      message: 'Failed to fetch audit logs' 
    });
  }
});

// Helper functions for consent screen
function getScopeDescription(scope) {
  const descriptions = {
    'tools:read': 'Read access to file system tools and data',
    'tools:write': 'Write access to create, update, and delete files',
    'tools:execute': 'Execute system tools and commands',
    'data:export': 'Export user data and generate reports',
    'system:analyze': 'Analyze system performance and health',
    'system:admin': 'Administrative access to system configuration',
    'network:access': 'Access external APIs and network resources',
    'notifications:send': 'Send notifications and alerts',
    'payroll:access': 'Access payroll and employee data',
    'database:write': 'Write operations on database records'
  };
  return descriptions[scope] || 'Custom permission scope';
}

function getToolDescription(tool) {
  const descriptions = {
    'ListFiles': 'List files and directories',
    'ReadFile': 'Read file contents',
    'CreateFile': 'Create new files',
    'UpdateFile': 'Modify existing files',
    'DeleteFile': 'Remove files',
    'ExportData': 'Export data to various formats',
    'GenerateReport': 'Create analytical reports',
    'SystemCheck': 'Perform system health checks',
    'AnalyzeAnomaly': 'Detect system anomalies',
    'SendAlert': 'Send system alerts',
    'CreateNotification': 'Create user notifications'
  };
  return descriptions[tool] || 'Custom tool access';
}

// Error handling
app.use(errorHandler);

// Create data directory if it doesn't exist
import fs from 'fs';
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Grant Management API Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});

export default app;
