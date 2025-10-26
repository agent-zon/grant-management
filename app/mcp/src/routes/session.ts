import { Router, Request, Response } from "express";
import { sessionManager } from "../services/session-manager";

const router = Router();

/**
 * Get session information
 * GET /session?sessionId=xxx
 */
router.get("/", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID required" });
  }

  const session = sessionManager.getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  // Get authorized tools
  const authorizedTools = await sessionManager.getAuthorizedTools(sessionId);

  res.json({
    sessionId: session.sessionId,
    grant_id: session.grant_id,
    agent_id: session.agent_id,
    user_id: session.user_id,
    created_at: session.created_at,
    last_used: session.last_used,
    authorized_tools: authorizedTools,
    has_grant: !!session.grant_id,
  });
});

export { router as sessionRouter };
