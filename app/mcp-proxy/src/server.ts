import express from "express";
import cors from "cors";
import { proxyRouter } from "./routes/proxy";
import { callbackRouter } from "./routes/callback";
import { sessionRouter } from "./routes/session";
import { healthRouter } from "./routes/health";
import { revokeRouter } from "./routes/revoke";
import { errorHandler } from "./middleware/error-handler";
import { config } from "./config";

const app = express();

// Middleware
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "mcp-session-id",
      "x-session-id",
      "session-id",
      "mcp-agent-id",
      "x-agent-id",
      "agent-id",
      "mcp-user-id",
      "x-user-id",
      "user-id",
    ],
  })
);

app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/proxy", proxyRouter);
app.use("/callback", callbackRouter);
app.use("/session", sessionRouter);
app.use("/health", healthRouter);
app.use("/revoke", revokeRouter);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    service: "MCP Consent Proxy",
    version: "1.0.0",
    endpoints: {
      proxy: "POST /proxy",
      callback: "GET /callback",
      session: "GET /session",
      health: "GET /health",
      revoke: "POST /revoke",
    },
  });
});

// Error handling
app.use(errorHandler);

// Start server
const PORT = config.port || 8080;
const server = app.listen(PORT, () => {
  console.log("========================================");
  console.log(`🚀 MCP Proxy server running on port ${PORT}`);
  console.log(`📡 Downstream MCP server: ${config.mcpServerUrl}`);
  console.log(`🔐 Authorization server: ${config.authServerUrl}`);
  console.log(`📊 Grant Management: ${config.grantManagementUrl}`);
  console.log(`🆔 Client ID: ${config.clientId}`);
  console.log("========================================");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});
