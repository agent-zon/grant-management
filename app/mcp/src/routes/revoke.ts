import { Router, Request, Response } from "express";
import { sessionManager } from "../services/session-manager";

const router = Router();

/**
 * Revoke session authorization
 * POST /revoke?sessionId=xxx
 * DELETE /revoke?sessionId=xxx
 */
router.post("/", (req: Request, res: Response) => {
  handleRevoke(req, res);
});

router.delete("/", (req: Request, res: Response) => {
  handleRevoke(req, res);
});

function handleRevoke(req: Request, res: Response): void {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    res.status(400).json({ error: "Session ID required" });
    return;
  }

  const revoked = sessionManager.revokeSession(sessionId);

  if (revoked) {
    res.json({
      success: true,
      message: `Session ${sessionId} authorization revoked`,
    });
  } else {
    res.status(404).json({ error: "Session not found" });
  }
}

export { router as revokeRouter };
