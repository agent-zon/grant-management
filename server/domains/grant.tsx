import React from 'react';
import { Request, Response, Router } from 'express';
import { renderToString } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Key,
  Lock,
  Unlock,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { GrantDatabase } from '../database.js';

// Create Express router for this domain
const router = Router();

// =============================================================================
// API ROUTES
// =============================================================================

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
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Grant'
 */
router.get('/api/grants', authenticateToken, (req: Request, res: Response) => {
  try {
    const { status = 'active', session_id } = req.query;
    const clientId = (req as any).user.client_id;
    
    let grants: Grant[];
    if (session_id) {
      grants = GrantDatabase.getGrantsBySession(session_id as string, status as string);
    } else {
      grants = GrantDatabase.getGrantsByClient(clientId, status as string);
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Grant'
 *       404:
 *         description: Grant not found
 */
router.get('/api/grants/:grantId', authenticateToken, (req: Request, res: Response) => {
  try {
    const grant = GrantDatabase.getGrant(req.params.grantId);
    
    if (!grant) {
      return res.status(404).json({ 
        error: 'not_found', 
        message: 'Grant not found' 
      });
    }
    
    // Verify the grant belongs to the authenticated client
    const clientId = (req as any).user.client_id;
    if (grant.client_id !== clientId) {
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
router.post('/api/grants', authenticateToken, (req: Request, res: Response) => {
  try {
    const { user_id, scope, session_id, workload_id, expires_at, grant_data } = req.body;
    const clientId = (req as any).user.client_id;
    
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
router.delete('/api/grants/:grantId', authenticateToken, (req: Request, res: Response) => {
  try {
    const grant = GrantDatabase.getGrant(req.params.grantId);
    
    if (!grant) {
      return res.status(404).json({ 
        error: 'not_found', 
        message: 'Grant not found' 
      });
    }
    
    const clientId = (req as any).user.client_id;
    if (grant.client_id !== clientId) {
      return res.status(403).json({ 
        error: 'forbidden', 
        message: 'Access denied to this grant' 
      });
    }
    
    const userId = (req as any).user.id;
    GrantDatabase.revokeGrant(req.params.grantId, userId);
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
// UI COMPONENTS
// =============================================================================

interface GrantItemProps {
  grant: Grant;
  onToggle: (grantId: string) => void;
}

const GrantItem: React.FC<GrantItemProps> = ({ grant, onToggle }) => {
  const isActive = grant.status === 'active';
  const scopes = grant.scope.split(' ').filter(s => s.length > 0);
  
  const getScopeDescription = (scope: string): string => {
    const descriptions: Record<string, string> = {
      'tools:read': 'Read access to file system tools',
      'tools:write': 'Write access to file system tools', 
      'tools:execute': 'Execute system tools and commands',
      'data:export': 'Export user data and generate reports',
      'system:analyze': 'System analysis and monitoring tools',
      'system:admin': 'Administrative system access',
      'network:access': 'Access external APIs and network resources',
      'notifications:send': 'Send notifications and alerts',
      'payroll:access': 'Access payroll and employee data',
      'database:write': 'Database write operations',
    };
    return descriptions[scope] || 'Custom permission scope';
  };

  return (
    <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            isActive ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}>
            {isActive ? 
              <Unlock className="w-5 h-5 text-green-400" /> : 
              <Lock className="w-5 h-5 text-red-400" />
            }
          </div>
          <div>
            <h4 className="text-sm font-medium text-white">{grant.scope}</h4>
            <p className="text-xs text-gray-400">{getScopeDescription(grant.scope)}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={`px-2 py-1 text-xs rounded capitalize ${
            isActive 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {grant.status}
          </span>
          <button
            onClick={() => onToggle(grant.id)}
            className={`px-3 py-1 rounded text-xs transition-colors duration-200 ${
              isActive
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isActive ? 'Revoke' : 'Grant'}
          </button>
        </div>
      </div>

      {/* Grant Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-400">Status</p>
          <p className="text-sm text-white font-mono capitalize">{grant.status}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Created At</p>
          <p className="text-sm text-white">{new Date(grant.created_at).toLocaleString()}</p>
        </div>
        {grant.expires_at && (
          <div>
            <p className="text-xs text-gray-400">Expires At</p>
            <p className="text-sm text-white">{new Date(grant.expires_at).toLocaleString()}</p>
          </div>
        )}
        {grant.session_id && (
          <div>
            <p className="text-xs text-gray-400">Session</p>
            <p className="text-sm text-white font-mono">{grant.session_id}</p>
          </div>
        )}
      </div>

      {/* Scopes */}
      <div>
        <p className="text-xs text-gray-400 mb-2">Granted Scopes</p>
        <div className="flex flex-wrap gap-1">
          {scopes.map((scope, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded"
              title={getScopeDescription(scope)}
            >
              {scope}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

interface GrantsPageProps {
  grants: Grant[];
  loading: boolean;
  error?: string;
  sessionId?: string;
  showAllGrants?: boolean;
}

const GrantsPage: React.FC<GrantsPageProps> = ({ 
  grants, 
  loading, 
  error, 
  sessionId, 
  showAllGrants 
}) => {
  const handleToggleGrant = async (grantId: string) => {
    try {
      const grant = grants.find(g => g.id === grantId);
      if (!grant) return;

      if (grant.status === 'active') {
        // Revoke the grant
        await fetch(`/api/grants/${grantId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'demo-token'}`
          }
        });
      } else {
        // Create a new grant (reactivate)
        await fetch('/api/grants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || 'demo-token'}`
          },
          body: JSON.stringify({
            user_id: grant.user_id,
            scope: grant.scope,
            session_id: grant.session_id,
            workload_id: grant.workload_id
          })
        });
      }
      
      // Reload the page to see updated data
      window.location.reload();
    } catch (err) {
      console.error('Error toggling grant:', err);
      alert('Failed to update grant');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">
                {showAllGrants ? 'All User Grants' : sessionId ? `Session ${sessionId} Grants` : 'Grant Management Dashboard'}
              </h2>
              {sessionId && !showAllGrants && (
                <p className="text-sm text-blue-400 mt-1">
                  Session-specific consent grants
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-400">Live Data</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Your Consent Grants</h3>
          </div>
          
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
              <p className="text-gray-400 mt-2">Loading grants...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
              <p className="text-red-400">⚠️ {error}</p>
            </div>
          )}

          <div className="space-y-4">
            {grants.map((grant) => (
              <GrantItem 
                key={grant.id} 
                grant={grant} 
                onToggle={handleToggleGrant}
              />
            ))}
            
            {!loading && grants.length === 0 && (
              <div className="text-center py-8">
                <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No grants found</p>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Active Grants</p>
                <p className="text-xl font-bold text-white">
                  {grants.filter(g => g.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Revoked Grants</p>
                <p className="text-xl font-bold text-white">
                  {grants.filter(g => g.status === 'revoked').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Expired Grants</p>
                <p className="text-xl font-bold text-white">
                  {grants.filter(g => g.status === 'expired').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Grants</p>
                <p className="text-xl font-bold text-white">
                  {grants.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// SSR ROUTES
// =============================================================================

// SSR route for grants page
router.get('/grants', (req: Request, res: Response) => {
  try {
    // In a real app, you'd get this from authentication
    const clientId = 'demo-client';
    const { status = 'all', session_id } = req.query;
    
    let grants: Grant[];
    if (session_id) {
      grants = GrantDatabase.getGrantsBySession(session_id as string, status as string);
    } else {
      grants = GrantDatabase.getGrantsByClient(clientId, status as string);
    }

    const helmetContext = {};
    const appHtml = renderToString(
      <HelmetProvider context={helmetContext}>
        <GrantsPage 
          grants={grants}
          loading={false}
          sessionId={session_id as string}
          showAllGrants={!session_id}
        />
      </HelmetProvider>
    );

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
<body>
  <div id="root">${appHtml}</div>
  <script>
    // Add client-side interactivity
    window.__INITIAL_DATA__ = ${JSON.stringify({ grants, loading: false })};
  </script>
</body>
</html>`;

    res.send(html);
  } catch (error) {
    console.error('Error rendering grants page:', error);
    res.status(500).send('Internal server error');
  }
});

// SSR route for session-specific grants
router.get('/workloads/:sessionId/grants', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { status = 'all' } = req.query;
    
    const grants = GrantDatabase.getGrantsBySession(sessionId, status as string);

    const helmetContext = {};
    const appHtml = renderToString(
      <HelmetProvider context={helmetContext}>
        <GrantsPage 
          grants={grants}
          loading={false}
          sessionId={sessionId}
          showAllGrants={false}
        />
      </HelmetProvider>
    );

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Session ${sessionId} Grants - Agent Authorization System</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body>
  <div id="root">${appHtml}</div>
  <script>
    window.__INITIAL_DATA__ = ${JSON.stringify({ grants, loading: false, sessionId })};
  </script>
</body>
</html>`;

    res.send(html);
  } catch (error) {
    console.error('Error rendering session grants page:', error);
    res.status(500).send('Internal server error');
  }
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Middleware for authentication (simplified for demo)
function authenticateToken(req: Request, res: Response, next: any) {
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
  (req as any).user = { id: 'demo-user', client_id: 'demo-client' };
  next();
}

export default router;
