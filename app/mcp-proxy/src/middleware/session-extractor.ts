import type { Request, Response, NextFunction } from "express";

/**
 * Extract session ID from request headers or generate one
 */
export function extractSessionId(
  headers: Record<string, string | string[] | undefined>
): string {
  const sessionId =
    (headers["mcp-session-id"] as string) ||
    (headers["x-session-id"] as string) ||
    (headers["session-id"] as string);

  if (sessionId) {
    return Array.isArray(sessionId) ? sessionId[0] : sessionId;
  }

  // Generate new session ID
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Extract agent ID from request headers
 */
export function extractAgentId(
  headers: Record<string, string | string[] | undefined>
): string | undefined {
  const agentId =
    (headers["mcp-agent-id"] as string) ||
    (headers["x-agent-id"] as string) ||
    (headers["agent-id"] as string);

  if (agentId) {
    return Array.isArray(agentId) ? agentId[0] : agentId;
  }

  return undefined;
}

/**
 * Extract user ID from request headers or context
 */
export function extractUserId(
  headers: Record<string, string | string[] | undefined>
): string | undefined {
  const userId =
    (headers["mcp-user-id"] as string) ||
    (headers["x-user-id"] as string) ||
    (headers["user-id"] as string);

  if (userId) {
    return Array.isArray(userId) ? userId[0] : userId;
  }

  return undefined;
}

/**
 * Middleware to extract and attach session info to request
 */
export function sessionExtractorMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const sessionId = extractSessionId(req.headers);
  const agentId = extractAgentId(req.headers);
  const userId = extractUserId(req.headers);

  // Attach to request object
  (req as any).sessionId = sessionId;
  (req as any).agentId = agentId;
  (req as any).userId = userId;

  // Set session ID in response header
  res.setHeader("mcp-session-id", sessionId);

  next();
}
