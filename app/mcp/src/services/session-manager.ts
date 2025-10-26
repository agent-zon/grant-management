// Session Manager - Tracks MCP sessions and their associated grants

import type {
  SessionState,
  AuthorizationResult,
  AuthorizationDetail,
} from "../types";
import { grantManagementClient } from "./grant-management-client";

/**
 * Manages MCP sessions and their association with OAuth grants
 * Provides session-to-grant mapping and tool authorization validation
 */
export class SessionManager {
  private sessions = new Map<string, SessionState>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired sessions every 15 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupExpired();
      },
      15 * 60 * 1000
    );
  }

  /**
   * Create a new session
   */
  createSession(
    sessionId: string,
    agentId?: string,
    userId?: string,
    mcpServerUrl?: string
  ): SessionState {
    console.log(`[SessionManager] Creating session: ${sessionId}`);

    const session: SessionState = {
      sessionId,
      created_at: new Date(),
      agent_id: agentId,
      user_id: userId,
      mcp_server_url: mcpServerUrl,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get or create session
   */
  getOrCreateSession(
    sessionId: string,
    agentId?: string,
    userId?: string,
    mcpServerUrl?: string
  ): SessionState {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.createSession(sessionId, agentId, userId, mcpServerUrl);
    }
    return session;
  }

  /**
   * Attach grant to session after successful authorization
   */
  attachGrant(
    sessionId: string,
    grant_id: string,
    authorization_details?: AuthorizationDetail[]
  ): void {
    console.log(
      `[SessionManager] Attaching grant ${grant_id} to session ${sessionId}`
    );

    const session = this.sessions.get(sessionId);
    if (session) {
      session.grant_id = grant_id;
      session.authorization_details = authorization_details;
      session.last_used = new Date();
    } else {
      console.warn(
        `[SessionManager] Session ${sessionId} not found when attaching grant`
      );
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SessionState | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.last_used = new Date();
    }
    return session;
  }

  /**
   * Check if session has an active grant
   */
  hasGrant(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return !!session?.grant_id;
  }

  /**
   * Validate tool access for a session by querying the Grant Management API
   */
  async validateToolAccess(
    sessionId: string,
    toolName: string
  ): Promise<AuthorizationResult> {
    const session = this.sessions.get(sessionId);

    if (!session?.grant_id) {
      return {
        authorized: false,
        reason: "no_grant",
        missingTools: [toolName],
      };
    }

    try {
      // Query grant from Grant Management API
      const grant = await grantManagementClient.getGrant(session.grant_id);

      if (!grant) {
        console.warn(`[SessionManager] Grant ${session.grant_id} not found`);
        return {
          authorized: false,
          reason: "grant_not_found",
          missingTools: [toolName],
        };
      }

      if (grant.status !== "active") {
        console.warn(
          `[SessionManager] Grant ${session.grant_id} is not active: ${grant.status}`
        );
        return {
          authorized: false,
          reason: "grant_inactive",
          missingTools: [toolName],
        };
      }

      // Check if tool is in authorization_details
      const hasToolPermission = this.checkToolPermission(
        grant.authorization_details as any[],
        toolName
      );

      if (hasToolPermission) {
        console.log(
          `[SessionManager] Tool ${toolName} authorized for session ${sessionId}`
        );
        return {
          authorized: true,
          grant_id: session.grant_id,
        };
      } else {
        console.log(
          `[SessionManager] Tool ${toolName} not authorized for session ${sessionId}`
        );
        return {
          authorized: false,
          reason: "tool_not_granted",
          missingTools: [toolName],
          grant_id: session.grant_id,
        };
      }
    } catch (error) {
      console.error("[SessionManager] Error validating tool access:", error);
      return {
        authorized: false,
        reason: "validation_error",
        missingTools: [toolName],
      };
    }
  }

  /**
   * Validate multiple tools at once
   */
  async validateToolsAccess(
    sessionId: string,
    toolNames: string[]
  ): Promise<AuthorizationResult> {
    const session = this.sessions.get(sessionId);

    if (!session?.grant_id) {
      return {
        authorized: false,
        reason: "no_grant",
        missingTools: toolNames,
      };
    }

    try {
      const grant = await grantManagementClient.getGrant(session.grant_id);

      if (!grant || grant.status !== "active") {
        return {
          authorized: false,
          reason: grant ? "grant_inactive" : "grant_not_found",
          missingTools: toolNames,
        };
      }

      // Check which tools are missing
      const missingTools = toolNames.filter(
        (tool) =>
          !this.checkToolPermission(grant.authorization_details as any[], tool)
      );

      if (missingTools.length === 0) {
        return {
          authorized: true,
          grant_id: session.grant_id,
        };
      } else {
        return {
          authorized: false,
          reason: "tools_not_granted",
          missingTools,
          grant_id: session.grant_id,
        };
      }
    } catch (error) {
      console.error("[SessionManager] Error validating tools access:", error);
      return {
        authorized: false,
        reason: "validation_error",
        missingTools: toolNames,
      };
    }
  }

  /**
   * Check if a tool is in the authorization_details
   */
  private checkToolPermission(
    authorizationDetails: any[],
    toolName: string
  ): boolean {
    if (!authorizationDetails || !Array.isArray(authorizationDetails)) {
      return false;
    }

    // Find MCP authorization details
    const mcpDetails = authorizationDetails.filter(
      (detail) => detail.type_code === "mcp" || detail.type === "mcp"
    );

    // Check if tool is in any of the MCP details
    for (const detail of mcpDetails) {
      if (detail.tools) {
        // Handle both object and array formats
        if (typeof detail.tools === "object" && !Array.isArray(detail.tools)) {
          if (toolName in detail.tools) {
            return true;
          }
        } else if (Array.isArray(detail.tools)) {
          if (detail.tools.includes(toolName)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Get all tools authorized for a session
   */
  async getAuthorizedTools(sessionId: string): Promise<string[]> {
    const session = this.sessions.get(sessionId);

    if (!session?.grant_id) {
      return [];
    }

    try {
      const grant = await grantManagementClient.getGrant(session.grant_id);

      if (!grant || grant.status !== "active") {
        return [];
      }

      const tools: string[] = [];
      const authDetails = grant.authorization_details as any[];

      if (authDetails && Array.isArray(authDetails)) {
        for (const detail of authDetails) {
          if (detail.type_code === "mcp" || detail.type === "mcp") {
            if (detail.tools) {
              if (
                typeof detail.tools === "object" &&
                !Array.isArray(detail.tools)
              ) {
                tools.push(...Object.keys(detail.tools));
              } else if (Array.isArray(detail.tools)) {
                tools.push(...detail.tools);
              }
            }
          }
        }
      }

      return [...new Set(tools)]; // Deduplicate
    } catch (error) {
      console.error("[SessionManager] Error getting authorized tools:", error);
      return [];
    }
  }

  /**
   * Revoke session (remove grant association)
   */
  revokeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.grant_id = undefined;
      session.authorization_details = undefined;
      return true;
    }
    return false;
  }

  /**
   * Delete session completely
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Cleanup expired sessions (older than 24 hours)
   */
  private cleanupExpired(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      const age = now.getTime() - session.created_at.getTime();
      if (age > maxAge) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[SessionManager] Cleaned up ${cleaned} expired sessions`);
    }
  }

  /**
   * Get statistics about sessions
   */
  getStats(): {
    total: number;
    withGrants: number;
    withoutGrants: number;
  } {
    let withGrants = 0;
    let withoutGrants = 0;

    for (const session of this.sessions.values()) {
      if (session.grant_id) {
        withGrants++;
      } else {
        withoutGrants++;
      }
    }

    return {
      total: this.sessions.size,
      withGrants,
      withoutGrants,
    };
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
