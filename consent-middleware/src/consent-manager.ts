import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { 
  ConsentRequest, 
  ConsentToken, 
  ToolScopeMapping, 
  ConsentConfig,
  ConsentDecision,
  McpToolCall
} from './types.js';

export class ConsentManager {
  private pendingRequests: Map<string, ConsentRequest> = new Map();
  private activeTokens: Map<string, ConsentToken> = new Map();
  private config: ConsentConfig;

  constructor(config: ConsentConfig) {
    this.config = config;
    
    // Clean up expired tokens every 5 minutes
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if a tool call is authorized for the given session
   */
  isToolAuthorized(sessionId: string, toolName: string): { authorized: boolean; missingScopes?: string[] } {
    const token = this.activeTokens.get(sessionId);
    
    if (!token) {
      const requiredScopes = this.getRequiredScopes(toolName);
      return { authorized: false, missingScopes: requiredScopes };
    }

    if (this.isTokenExpired(token)) {
      this.activeTokens.delete(sessionId);
      const requiredScopes = this.getRequiredScopes(toolName);
      return { authorized: false, missingScopes: requiredScopes };
    }

    const requiredScopes = this.getRequiredScopes(toolName);
    const missingScopes = requiredScopes.filter(scope => !token.scopes.includes(scope));
    
    return { 
      authorized: missingScopes.length === 0, 
      missingScopes: missingScopes.length > 0 ? missingScopes : undefined 
    };
  }

  /**
   * Get required scopes for a tool
   */
  getRequiredScopes(toolName: string): string[] {
    return this.config.toolScopeMappings[toolName] || [];
  }

  /**
   * Generate authorization URL for consent request
   */
  generateAuthorizationUrl(
    sessionId: string, 
    requiredScopes: string[], 
    idpAuthUrl: string, 
    idpClientId: string
  ): string {
    const state = this.createConsentRequest(sessionId, requiredScopes);
    const scopeParam = requiredScopes.join(' ');
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: idpClientId,
      redirect_uri: `${this.config.consentBaseUrl}/consent/callback`,
      scope: scopeParam,
      state: state.id,
      session_id: sessionId
    });

    return `${idpAuthUrl}?${params.toString()}`;
  }

  /**
   * Create a new consent request
   */
  createConsentRequest(sessionId: string, requiredScopes: string[], toolName?: string): ConsentRequest {
    const request: ConsentRequest = {
      id: uuidv4(),
      agentId: 'mcp-agent', // Could be extracted from session context
      sessionId,
      requestedScopes: requiredScopes,
      tools: toolName ? [toolName] : [],
      reason: `Tool access request for ${toolName || 'multiple tools'}`,
      timestamp: new Date(),
      status: 'pending'
    };

    this.pendingRequests.set(request.id, request);
    
    // Auto-expire requests after 15 minutes
    setTimeout(() => {
      if (this.pendingRequests.has(request.id)) {
        const req = this.pendingRequests.get(request.id)!;
        req.status = 'expired';
        this.pendingRequests.delete(request.id);
      }
    }, 15 * 60 * 1000);

    return request;
  }

  /**
   * Process consent decision
   */
  processConsentDecision(decision: ConsentDecision): boolean {
    const request = this.pendingRequests.get(decision.requestId);
    
    if (!request) {
      return false;
    }

    request.status = decision.decision === 'approve' ? 'approved' : 'denied';
    
    if (decision.decision === 'approve' && decision.approvedScopes.length > 0) {
      // Issue token for approved scopes
      const token: ConsentToken = {
        sessionId: request.sessionId,
        scopes: decision.approvedScopes,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + this.config.tokenLifetimeMinutes * 60 * 1000),
        agentId: request.agentId
      };

      this.activeTokens.set(request.sessionId, token);
    }

    this.pendingRequests.delete(decision.requestId);
    return true;
  }

  /**
   * Get pending consent request
   */
  getPendingRequest(requestId: string): ConsentRequest | undefined {
    return this.pendingRequests.get(requestId);
  }

  /**
   * Get all pending requests for a session
   */
  getPendingRequestsForSession(sessionId: string): ConsentRequest[] {
    return Array.from(this.pendingRequests.values())
      .filter(req => req.sessionId === sessionId && req.status === 'pending');
  }

  /**
   * Validate and extract token from session
   */
  validateToken(sessionId: string): ConsentToken | null {
    const token = this.activeTokens.get(sessionId);
    
    if (!token || this.isTokenExpired(token)) {
      if (token) {
        this.activeTokens.delete(sessionId);
      }
      return null;
    }

    return token;
  }

  /**
   * Revoke token for session
   */
  revokeToken(sessionId: string): boolean {
    return this.activeTokens.delete(sessionId);
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token: ConsentToken): boolean {
    return new Date() > token.expiresAt;
  }

  /**
   * Clean up expired tokens
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    
    for (const [sessionId, token] of this.activeTokens.entries()) {
      if (now > token.expiresAt) {
        this.activeTokens.delete(sessionId);
      }
    }
  }

  /**
   * Get consent statistics
   */
  getStats(): {
    pendingRequests: number;
    activeTokens: number;
    expiredTokens: number;
  } {
    const now = new Date();
    let expiredTokens = 0;
    
    for (const token of this.activeTokens.values()) {
      if (now > token.expiresAt) {
        expiredTokens++;
      }
    }

    return {
      pendingRequests: this.pendingRequests.size,
      activeTokens: this.activeTokens.size - expiredTokens,
      expiredTokens
    };
  }
}
