import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "8080", 10),
  mcpServerUrl: process.env.MCP_SERVER_URL || "http://localhost:3000/mcp",
  authServerUrl:
    process.env.AUTH_SERVER_URL || "http://localhost:4004/oauth-server",
  grantManagementUrl:
    process.env.GRANT_MANAGEMENT_URL ||
    "http://localhost:4004/grants-management",
  clientId: process.env.MCP_CLIENT_ID || "mcp-agent-client",
  baseUrl: process.env.BASE_URL || "http://localhost:8080",
};

console.log("🔧 MCP Proxy Configuration:", {
  port: config.port,
  mcpServerUrl: config.mcpServerUrl,
  authServerUrl: config.authServerUrl,
  grantManagementUrl: config.grantManagementUrl,
  clientId: config.clientId,
  baseUrl: config.baseUrl,
});
