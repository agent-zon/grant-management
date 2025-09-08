import { Request, Response, NextFunction } from 'express';
import { ConsentManager } from './consent-manager.js';
import { McpToolCall, McpResponse, ConsentAuthRequest } from './types.js';

export interface ConsentMiddlewareOptions {
  consentManager: ConsentManager;
  config: {
    idpAuthUrl: string;
    idpClientId: string;
    consentBaseUrl: string;
  };
}

export function createConsentMiddleware(options: ConsentMiddlewareOptions) {
  const { consentManager, config } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract session ID from headers or create one
      const sessionId = req.headers['mcp-session-id'] as string || 
                       req.headers['x-session-id'] as string ||
                       generateSessionId();

      // Add session ID to request for downstream use
      (req as any).sessionId = sessionId;

      // Let the request pass through to the downstream MCP server
      // We'll handle 403 responses in the proxy handler
      next();
    } catch (error) {
      console.error('Consent middleware error:', error);
      
      const errorResponse: McpResponse = {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error in consent middleware',
          data: { error: error instanceof Error ? error.message : 'Unknown error' }
        },
        id: req.body?.id || null
      };

      return res.status(500).json(errorResponse);
    }
  };
}

/**
 * Generate a session ID if none provided
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Middleware to add session ID to response headers
 */
export function addSessionIdHeader(req: Request, res: Response, next: NextFunction) {
  const sessionId = (req as any).sessionId;
  if (sessionId) {
    res.setHeader('mcp-session-id', sessionId);
  }
  next();
}

/**
 * Middleware to handle consent callback from IDP
 */
export function createConsentCallbackHandler(consentManager: ConsentManager) {
  return async (req: Request, res: Response) => {
    try {
      const { state, code, error } = req.query;
      
      if (error) {
        return res.status(400).json({ 
          error: 'Authorization denied',
          details: error 
        });
      }

      if (!state || !code) {
        return res.status(400).json({ 
          error: 'Missing required parameters' 
        });
      }

      const request = consentManager.getPendingRequest(state as string);
      if (!request) {
        return res.status(404).json({ 
          error: 'Consent request not found or expired' 
        });
      }

      // In a real implementation, you would exchange the code for tokens
      // For now, we'll simulate approval with all requested scopes
      const decision = {
        requestId: state as string,
        approvedScopes: request.requestedScopes,
        decision: 'approve' as const,
        timestamp: new Date()
      };

      const success = consentManager.processConsentDecision(decision);
      
      if (success) {
        return res.json({ 
          success: true,
          message: 'Consent granted successfully',
          sessionId: request.sessionId,
          scopes: decision.approvedScopes
        });
      } else {
        return res.status(400).json({ 
          error: 'Failed to process consent decision' 
        });
      }
    } catch (error) {
      console.error('Consent callback error:', error);
      return res.status(500).json({ 
        error: 'Internal server error' 
      });
    }
  };
}
