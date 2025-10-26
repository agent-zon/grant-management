import { Router, Request, Response } from "express";
import { sessionManager } from "../services/session-manager";
import { config } from "../config";

const router = Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get("/", (req: Request, res: Response) => {
  const stats = sessionManager.getStats();

  res.json({
    status: "healthy",
    service: "MCP Consent Proxy",
    version: "1.0.0",
    config: {
      mcpServerUrl: config.mcpServerUrl,
      authServerUrl: config.authServerUrl,
      grantManagementUrl: config.grantManagementUrl,
    },
    sessions: stats,
    timestamp: new Date().toISOString(),
  });
});

export { router as healthRouter };
