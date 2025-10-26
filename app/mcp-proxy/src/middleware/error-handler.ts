import type { Request, Response, NextFunction } from "express";

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error("[ErrorHandler] Error occurred:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Check if response already sent
  if (res.headersSent) {
    return next(err);
  }

  // Send JSON-RPC error for MCP requests
  if (req.path === "/proxy") {
    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: "Internal server error",
        data: { error: err.message },
      },
      id: null,
    });
  } else {
    // Send standard HTTP error for other requests
    res.status(500).json({
      error: "Internal server error",
      message: err.message,
    });
  }
}
