import express, { Request, Response } from 'express';
import { authMiddleware } from './middleware/auth-middleware.js';
import { createMcpProxy } from './middleware/proxy-middleware.js';
import { GRANT_MANAGEMENT_SRV, OAUTH_SERVER_SRV } from './constants/urls.js';

const app = express();
const PORT = process.env.PORT || 4004;

// Health check endpoint (no auth required)
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Apply authentication middleware to all routes except health
//app.use(authMiddleware);

// Mount MCP proxy at /proxy
// Note: Do NOT apply body parser middleware before proxy routes
// The proxy middleware handles request buffering internally
app.use('/proxy', createMcpProxy());

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('[Server] Error:', err);
  
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message
    });
  }
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`[Server] Agent Agentity Proxy started on port ${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/health`);
  console.log(`[Server] Proxy endpoint: http://localhost:${PORT}/proxy`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Server] Grant Management Base: ${GRANT_MANAGEMENT_SRV}`);
  console.log(`[Server] OAuth Server Base: ${OAUTH_SERVER_SRV}`);
});

// Graceful shutdown handling
const shutdown = () => {
  console.log('[Server] Shutting down gracefully...');
  
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
