import express from "express";
import { randomUUID } from "node:crypto";
import { env } from "node:process";

const app = express();
app.use(express.json());

interface AuthInfo {
  scopes: string[];
  agentId: string;
}

/** --------------------------------
 *  Simple MCP server simulation
 *  -------------------------------- */
app.all("/mcp", (req, res) => {
  const body = req.body;
  
  if (!body || body.method !== "tools/call") {
    return res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32601, message: "Method not found" },
      id: body?.id || null
    });
  }

  const toolName = body.params?.name;
  const sessionId = req.header("mcp-session-id") || "default-session";
  
  // Extract auth info from consent headers
  const consentScopes = req.header("x-consent-scopes");
  const consentAgentId = req.header("x-consent-agent-id");
  
  const authInfo: AuthInfo = {
    scopes: consentScopes ? consentScopes.split(' ').filter(Boolean) : [],
    agentId: consentAgentId || 'unknown-agent'
  };

  console.log(`MCP Tool Call: ${toolName}, Session: ${sessionId}, Scopes: ${authInfo.scopes.join(', ')}`);

  // Handle different tools
  switch (toolName) {
    case "whoami":
      return res.json({
        jsonrpc: "2.0",
        result: {
          content: [{ type: "text", text: JSON.stringify(authInfo) }]
        },
        id: body.id
      });

    case "nextTask":
      return res.json({
        jsonrpc: "2.0",
        result: {
          content: [{ type: "text", text: "task details..." }]
        },
        id: body.id
      });

    case "addTask":
      if (!authInfo.scopes.includes("todo:plan")) {
        return res.status(403).json({
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "insufficient_scope",
            data: {
              error: "insufficient_scope",
              required: ["todo:plan"],
              message: "Tool 'addTask' requires 'todo:plan' scope",
              grantUrl: `${env.CONSENT_BASE_URL || 'http://localhost:8080'}/consent/request_${randomUUID()}`
            }
          },
          id: body.id
        });
      }
      return res.json({
        jsonrpc: "2.0",
        result: {
          content: [{ type: "text", text: "task added!" }]
        },
        id: body.id
      });

    case "completeTask":
      if (!authInfo.scopes.includes("todos:worker")) {
        return res.status(403).json({
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "insufficient_scope",
            data: {
              error: "insufficient_scope",
              required: ["todos:worker"],
              message: "Tool 'completeTask' requires 'todos:worker' scope",
              grantUrl: `${env.CONSENT_BASE_URL || 'http://localhost:8080'}/consent/request_${randomUUID()}`
            }
          },
          id: body.id
        });
      }
      return res.json({
        jsonrpc: "2.0",
        result: {
          content: [{ type: "text", text: "task completed!" }]
        },
        id: body.id
      });

    default:
      return res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32601, message: `Unknown tool: ${toolName}` },
        id: body.id
      });
  }
});

/** --------------------------------
 *  Health & start
 *  -------------------------------- */
app.get("/healthz", (_req, res) => res.send("OK"));

const port = parseInt(env.PORT || "3000", 10);
app.listen(port, () => {
  console.log(`MCP Example Server running on http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/healthz`);
});
