import { Router } from 'express';
import { GrantDatabase } from '../database.js';

// Create Express router for grant domain
const router = Router();

// =============================================================================
// API ROUTES
// =============================================================================

// Middleware for authentication (simplified for demo)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      error: 'unauthorized', 
      message: 'Access token is required' 
    });
  }
  
  // In a real implementation, verify JWT token here
  req.user = { id: 'demo-user', client_id: 'demo-client' };
  next();
}

/**
 * @swagger
 * /api/grants:
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
 *           enum: [active, revoked, expired, all]
 *         description: Filter grants by status
 *       - in: query
 *         name: session_id
 *         schema:
 *           type: string
 *         description: Filter grants by session ID
 *     responses:
 *       200:
 *         description: List of grants
 */
router.get('/api/grants', authenticateToken, (req, res) => {
  try {
    const { status = 'active', session_id } = req.query;
    const clientId = req.user.client_id;
    
    let grants;
    if (session_id) {
      grants = GrantDatabase.getGrantsBySession(session_id, status);
    } else {
      grants = GrantDatabase.getGrantsByClient(clientId, status);
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
 * /api/grants/{grantId}:
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
 *       404:
 *         description: Grant not found
 */
router.get('/api/grants/:grantId', authenticateToken, (req, res) => {
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
 * /api/grants:
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
 */
router.post('/api/grants', authenticateToken, (req, res) => {
  try {
    const { user_id, scope, session_id, workload_id, expires_at, grant_data } = req.body;
    const clientId = req.user.client_id;
    
    if (!user_id || !scope) {
      return res.status(400).json({ 
        error: 'invalid_request', 
        message: 'user_id and scope are required' 
      });
    }
    
    const result = GrantDatabase.createGrant(
      clientId,
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
 * /api/grants/{grantId}:
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
 */
router.delete('/api/grants/:grantId', authenticateToken, (req, res) => {
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

// =============================================================================
// SSR ROUTES (Simple HTML for now)
// =============================================================================

// SSR route for grants page
router.get('/grants', (req, res) => {
  try {
    // In a real app, you'd get this from authentication
    const clientId = 'demo-client';
    const { status = 'all', session_id } = req.query;
    
    let grants;
    if (session_id) {
      grants = GrantDatabase.getGrantsBySession(session_id, status);
    } else {
      grants = GrantDatabase.getGrantsByClient(clientId, status);
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grant Management - Agent Authorization System</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
  <div class="container mx-auto px-4 py-8">
    <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 mb-6">
      <h1 class="text-2xl font-bold text-white mb-4">Grant Management Dashboard</h1>
      <p class="text-gray-400">OAuth 2.0 Grant Management System with SSR</p>
      <div class="mt-4 flex items-center space-x-2">
        <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        <span class="text-sm text-green-400">Live Data from SQLite</span>
      </div>
    </div>
    
    <div class="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
      <h2 class="text-lg font-medium text-white mb-4">Active Grants</h2>
      <div class="space-y-4">
        ${grants.map(grant => `
          <div class="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-sm font-medium text-white">${grant.scope}</h3>
                <p class="text-xs text-gray-400">Created: ${new Date(grant.created_at).toLocaleString()}</p>
                ${grant.session_id ? `<p class="text-xs text-blue-400">Session: ${grant.session_id}</p>` : ''}
              </div>
              <span class="px-2 py-1 text-xs rounded capitalize ${
                grant.status === 'active' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }">
                ${grant.status}
              </span>
            </div>
          </div>
        `).join('')}
        
        ${grants.length === 0 ? `
          <div class="text-center py-8">
            <p class="text-gray-400">No grants found</p>
            <a href="/api-docs" class="text-blue-400 hover:text-blue-300 underline mt-2 inline-block">
              View API Documentation
            </a>
          </div>
        ` : ''}
      </div>
    </div>
    
    <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
        <h3 class="text-sm text-gray-400">Total Grants</h3>
        <p class="text-2xl font-bold text-white">${grants.length}</p>
      </div>
      <div class="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
        <h3 class="text-sm text-gray-400">Active Grants</h3>
        <p class="text-2xl font-bold text-green-400">${grants.filter(g => g.status === 'active').length}</p>
      </div>
      <div class="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
        <h3 class="text-sm text-gray-400">Revoked Grants</h3>
        <p class="text-2xl font-bold text-red-400">${grants.filter(g => g.status === 'revoked').length}</p>
      </div>
    </div>
    
    <div class="mt-6 text-center">
      <a href="/api-docs" class="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-200">
        View API Documentation
      </a>
    </div>
  </div>
</body>
</html>`;

    res.send(html);
  } catch (error) {
    console.error('Error rendering grants page:', error);
    res.status(500).send('Internal server error');
  }
});

export default router;
