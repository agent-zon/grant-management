import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { env } from "node:process";
import { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

const app = express();
app.use(express.json());

/** --------------------------------
 *  Per-session registry
 *  -------------------------------- */
type ToolsMap = Record<string, RegisteredTool>;
type SessionRec = {
  transport: StreamableHTTPServerTransport;
  tools: ToolsMap;
};
const sessions: Record<string, SessionRec> = {};

/** --------------------------------
 *  Build server + tools (per session)
 *  -------------------------------- */
function buildServer() {
  const server = new McpServer({ name: "tasks-management", version: "0.0.0" });

  const tools: ToolsMap = {
    whoami: server.tool(
      "whoami",
      "Return AuthInfo",
      ({ authInfo }: { authInfo?: AuthInfo }) => {
        return { content: [{ type: "text", text: JSON.stringify(authInfo) }] };
      }
    ),

    nextTask: server.tool(
      "nextTask",
      "Get next task",
      (_ctx: { authInfo?: AuthInfo }) => {
        return { content: [{ type: "text", text: "task details..." }] };
      }
    ),

    addTask: server.tool(
      "addTask",
      "Add a new task (requires todo:plan)",
      ({ authInfo }: { authInfo?: AuthInfo }) => {
        if (!authInfo?.scopes?.includes("todo:plan")) {
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                error: "insufficient_scope",
                required: ["todo:plan"],
                message: "Tool 'addTask' requires 'todo:plan' scope",
                grantUrl: `${env.CONSENT_BASE_URL || 'http://localhost:8080'}/consent/request_${randomUUID()}`
              })
            }],
            isError: true,
          };
        }
        return { content: [{ type: "text", text: "task added!" }] };
      }
    ),

    completeTask: server.tool(
      "completeTask",
      "Complete a task (requires todos:worker)",
      ({ authInfo }: { authInfo?: AuthInfo }) => {
        if (!authInfo?.scopes?.includes("todos:worker")) {
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                error: "insufficient_scope",
                required: ["todos:worker"],
                message: "Tool 'completeTask' requires 'todos:worker' scope",
                grantUrl: `${env.CONSENT_BASE_URL || 'http://localhost:8080'}/consent/request_${randomUUID()}`
              })
            }],
            isError: true,
          };
        }
        return { content: [{ type: "text", text: "task completed!" }] };
      }
    ),
  };

  return { server, tools };
}

/** ---------------------------------------------------------
 *  Middleware 1: ensure/reuse MCP session and attach to res.locals
 *  - Works for both existing sessions (with mcp-session-id)
 *    and the very first request (no id yet).
 *  --------------------------------------------------------- */
async function ensureMcpSession(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const sidHeader = req.header("mcp-session-id") as string | undefined;

  // Reuse existing session if present
  if (sidHeader && sessions[sidHeader]) {
    const rec = sessions[sidHeader];
    (res as any).locals.mcp = { sessionId: sidHeader, transport: rec.transport, tools: rec.tools };
    return next();
  }

  // Create new session
  const { server, tools } = buildServer();

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (newSid) => {
      sessions[newSid] = { transport, tools };
      (res as any).locals.mcp = { sessionId: newSid, transport, tools };
    },
  });

  await server.connect(transport);

  // Make available immediately for this first request (before sessionId is known)
  (res as any).locals.mcp = (res as any).locals.mcp || { transport, tools };
  return next();
}

/** ---------------------------------------------------------
 *  Middleware 2: explicit scope gating for this request
 *  - Flips enable/disable EVERY request based on current token.
 *  - Keeps tools/list accurate even if scopes change mid-session.
 *  - Still keep defense-in-depth checks inside each tool handler.
 *  --------------------------------------------------------- */
function requireScope(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authInfo: AuthInfo = (req as any).auth; // set by requireAuth
  const scopes = authInfo?.scopes || [];

  const mcp = (res as any).locals.mcp as { sessionId?: string; transport: StreamableHTTPServerTransport; tools: ToolsMap };

  if (mcp?.tools) {
    // whoami & nextTask are open in this example; leave them enabled by default.
    // Explicit gating for scoped tools:
    (scopes.includes("todo:plan") ? mcp.tools.addTask.enable : mcp.tools.addTask.disable).call(mcp.tools.addTask);
    (scopes.includes("todos:worker")  ? mcp.tools.completeTask.enable : mcp.tools.completeTask.disable).call(mcp.tools.completeTask);
  }

  return next();
}

/** ---------------------------------------------------------
 *  Middleware 3: requireTopLevelScope
 *  --------------------------------------------------------- */
function requireTopLevelScope(scope: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authInfo: AuthInfo = (req as any).auth;
    const scopes = Array.isArray(authInfo?.scopes)
      ? authInfo!.scopes
      : typeof (authInfo as any)?.scope === "string"
        ? (authInfo as any).scope.split(/\s+/).filter(Boolean)
        : [];

    if (scopes.includes(scope)) return next();

    const challenge = [
      'Bearer realm="mcp"',
      'error="insufficient_scope"',
      `error_description="${scope} required"`,
      `scope="${scope}"`,
    ].join(", ");

    // Use 401 so SSE clients kick off auth instead of showing a generic stream error
    res
      .status(401)
      .set("WWW-Authenticate", challenge)
      .type("application/json")
      .send(JSON.stringify({ error: "insufficient_scope", required: [scope] }));
  };
}

/** --------------------------------
 *  MCP endpoint (order matters)
 *  -------------------------------- */
app.all(
  "/mcp",
  ensureMcpSession,   // create/reuse session and attach { transport, tools }
  requireScope,       // explicit enable/disable for this request's scopes
  async (req, res) => {
    const { transport } = (res as any).locals.mcp as {
      sessionId?: string;
      transport: StreamableHTTPServerTransport;
      tools: ToolsMap;
    };
    await transport.handleRequest(req, res, req.body);
  }
);

/** --------------------------------
 *  Health & start
 *  -------------------------------- */
app.get("/healthz", (_req, res) => res.send("OK"));

const port = parseInt(env.PORT || "8080", 10);
app.listen(port, () => {
  console.log(`MCP Gateway Server running on http://localhost:${port}`);
});
