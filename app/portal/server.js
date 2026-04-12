import compression from "compression";
import express from "express";
import morgan from "morgan";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import http from "http";
import https from "https";

// Short-circuit the type-checking of the built output.
const BUILD_PATH = "./build/server/index.js";
const DEVELOPMENT = process.env.NODE_ENV === "development";
const PORT = Number.parseInt(process.env.PORT || "3000");
const CDS_URL = process.env.CDS_URL || "http://localhost:4004";

const app = express();
const server = createServer(app);

app.use(compression());
app.disable("x-powered-by");

if (DEVELOPMENT) {
  console.log("Starting development server");
  const viteDevServer = await import("vite").then((vite) =>
    vite.createServer({
      server: { middlewareMode: true },
    }),
  );
  app.use(viteDevServer.middlewares);
  app.use(async (req, res, next) => {
    try {
      const source = await viteDevServer.ssrLoadModule("./server/app.ts");
      return await source.app(req, res, next);
    } catch (error) {
      if (typeof error === "object" && error instanceof Error) {
        viteDevServer.ssrFixStacktrace(error);
      }
      next(error);
    }
  });
} else {
  console.log("Starting production server");
  app.get("/health", (_req, res) => res.sendStatus(200));
  app.use(
    "/portal/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" }),
  );
  app.use(morgan("tiny"));
  app.use("/portal", express.static("build/client", { maxAge: "1h" }));
  app.use(await import(BUILD_PATH).then((mod) => mod.app));
}

// ── WebSocket: live graph updates ─────────────────────────────────────
// Browser connects via WS through the approuter. Portal subscribes to
// CDS graph-events SSE internally and relays to matching WS clients.

const wss = new WebSocketServer({ noServer: true });

// Track WS clients by actor they're watching
const clients = new Map(); // actor → Set<ws>

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname !== "/portal/ws/graph") {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const actor = url.searchParams.get("actor");
  if (!actor) {
    ws.close(4000, "actor param required");
    return;
  }

  if (!clients.has(actor)) clients.set(actor, new Set());
  clients.get(actor).add(ws);
  console.log(`[WS] Client connected for actor: ${actor} (${clients.get(actor).size} total)`);

  ws.on("close", () => {
    clients.get(actor)?.delete(ws);
    if (clients.get(actor)?.size === 0) clients.delete(actor);
    console.log(`[WS] Client disconnected for actor: ${actor}`);
  });

  // Keepalive ping every 30s
  const pingInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) ws.ping();
  }, 30000);
  ws.on("close", () => clearInterval(pingInterval));
});

// Subscribe to CDS graph-events SSE (internal, in-cluster)
function connectToGraphEvents() {
  const url = new URL(`${CDS_URL}/graph-events?actor=*`);
  console.log(`[WS] Connecting to CDS SSE at ${url}`);

  const proto = url.protocol === "https:" ? https : http;
  const req = proto.get(url, { headers: { Accept: "text/event-stream" } }, (res) => {
    if (res.statusCode !== 200) {
      console.warn(`[WS] CDS SSE returned ${res.statusCode}, retrying in 5s`);
      res.resume();
      setTimeout(connectToGraphEvents, 5000);
      return;
    }
    console.log("[WS] Connected to CDS SSE");
    let buffer = "";

    res.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      let eventData = null;
      for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, "");
        if (line.startsWith("data: ")) {
          eventData = line.slice(6);
        }
        if (line === "" && eventData) {
          console.log("[WS] SSE event received:", eventData.slice(0, 80));
          try { broadcastToClients(JSON.parse(eventData)); } catch (e) { console.warn("[WS] SSE parse error:", e.message); }
          eventData = null;
        }
      }
    });

    res.on("end", () => {
      console.log("[WS] CDS SSE closed, reconnecting in 2s");
      setTimeout(connectToGraphEvents, 2000);
    });

    res.on("error", (err) => {
      console.warn(`[WS] CDS SSE stream error: ${err.message}, reconnecting in 2s`);
      setTimeout(connectToGraphEvents, 2000);
    });

    res.on("close", () => {
      console.log("[WS] CDS SSE connection closed, reconnecting in 2s");
      setTimeout(connectToGraphEvents, 2000);
    });
  });

  req.on("error", (err) => {
    console.warn(`[WS] CDS SSE error: ${err.message}, retrying in 5s`);
    setTimeout(connectToGraphEvents, 5000);
  });
}

function broadcastToClients(data) {
  const actor = data.actor;
  if (!actor) return;

  const msg = JSON.stringify(data);

  // Direct match: clients watching this actor
  const direct = clients.get(actor);
  if (direct) {
    for (const ws of direct) {
      if (ws.readyState === ws.OPEN) ws.send(msg);
    }
  }

  // Delegation match: clients watching agents that delegate to this actor
  // For simplicity, broadcast to all clients — the reload will fetch
  // correctly scoped data. This avoids computing delegation trees on the portal side.
  for (const [watchedActor, sockets] of clients) {
    if (watchedActor === actor) continue; // already handled
    for (const ws of sockets) {
      if (ws.readyState === ws.OPEN) ws.send(msg);
    }
  }
}

// Start SSE subscription after a short delay (wait for CDS to be ready)
setTimeout(connectToGraphEvents, 3000);

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
