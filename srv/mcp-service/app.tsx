import { Hono } from "hono";

import authMiddleware from "./middleware.auth";
import metaMiddleware from "./middleware.meta";
import destinationMiddleware from "./middleware.destination";
import clientMiddleware from "./middleware.client";
import grantMiddleware from "./middleware.grant";
import filterMiddleware from "./middleware.filter";
import grantTools from "./app.grant.tools";
import remoteTools from "./app.remote";
import { Env } from "./type";
import mcp from "./middleware.mcp";

// ---------------------------------------------------------------------------
// Root Hono app
//
// Routes:
//   /                     — info
//   /:destination/grant   — grant tools only (PAR + prompt)
//   /:destination/remote  — filtered destination tools + grant tools
//   /:destination/debug   — raw destination tools, NO filter
//   /:destination         — default: merge destination + grant + filter
//
// Middleware chain (applied to all /:destination/* routes):
//   1. authMiddleware        — verifies JWT (any issuer, jku/discovery) → c.set("jwtPayload"), c.set("user")
//   2. metaMiddleware        — extracts SessionMeta from headers/JWT → c.set("meta")
//   3. destinationMiddleware — resolves BTP destination → c.set("destination"), c.set("destination.headers")
//   4. clientMiddleware      — connects MCP client + listTools → c.set("client"), c.set("remoteTools")
//   5. grantMiddleware       — fetches authorization_details → c.set("authorization_details")
// ---------------------------------------------------------------------------

const app = new Hono<Env>();

// ── Info route ────────────────────────────────────────────────────────────

app.get("/", (c) => {
  return c.json({
    name: "MCP Handler",
    description: "Grant-managed MCP proxy with multiple routing modes",
    routes: {
      "/:destination":
        "Default — merge destination tools + grant tools, filtered by consent",
      "/:destination/remote": "Filtered destination tools with grant tools",
      "/:destination/grant": "Grant tools only (push-authorization-request)",
      "/:destination/debug": "Raw destination tools, no grant filter",
    },
  });
});

// ── Apply shared middleware to all /:destination routes ────────────────────

app.use(
  "/:destination/*",
  authMiddleware,
  metaMiddleware,
  destinationMiddleware,
  clientMiddleware,
  grantMiddleware,
);
app.use(
  "/:destination",
  authMiddleware,
  metaMiddleware,
  destinationMiddleware,
  clientMiddleware,
  grantMiddleware,
);

// ── /:destination/grant — grant tools only ────────────────────────────────

app.route("/:destination/grant", grantTools);

// ── /:destination/remote — consent filters (stack more createMcpToolFilterMiddleware if needed) ─

app.use(
  "/:destination/remote/*",
  filterMiddleware, 
  mcp
);
app.route("/:destination/remote", remoteTools);

// ── /:destination/debug — raw destination tools, no filter ────────────────

app.use(
  "/:destination/debug/*",
  mcp
);
app.route("/:destination/debug", remoteTools);

// ── /:destination — same MCP surface as /remote (grant + filtered proxy) ──

app.use("/:destination", filterMiddleware, mcp);
app.route("/:destination", remoteTools);

export { app as mcpApp };
export default app;
