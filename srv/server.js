Object.keys(process.env).forEach((key) => {
  const value = process.env[key];
  // Remove any env vars that look like Kubernetes service URLs (tcp://host:port)
  if (typeof value === "string" && value.startsWith("tcp://")) {
    console.log(`[ENV ] K8s env var: ${key}=${value}`);
    // delete process.env[key];
  }
});

import cds from "@sap/cds";
import fs from "fs";
import path from "path";
import bodyParser from "body-parser";
import methodOverride from "method-override";
import React from "react";
import { getRequestListener } from "@hono/node-server";
import mcpApp from "./mcp-service/app.tsx";
// Make React available globally for JSX in handlers
global.React = React;

// Ensure cds.requires.github exists when credentials are mounted at /bindings/github/
// (Container runs from gen/srv which has no .cdsrc.yaml; K8s secret is mounted via fromSecret)
const bindingRoot = process.env.SERVICE_BINDING_ROOT || "/bindings";
const githubPath = path.join(bindingRoot, "github");
if (fs.existsSync(githubPath) && fs.statSync(githubPath).isDirectory()) {
  try {
    const read = (name) => {
      const p = path.join(githubPath, name);
      return fs.existsSync(p) ? fs.readFileSync(p, "utf8").trim() : undefined;
    };
    const token = read("token") || read("access_token") || read("password");
    const url =
      read("url") || read("api_url") || "https://github.tools.sap/api/v3";
    if (token) {
      if (!cds.env.requires) cds.env.requires = {};
      if (!cds.env.requires.github)
        cds.env.requires.github = { kind: "rest", credentials: {} };
      if (!cds.env.requires.github.credentials)
        cds.env.requires.github.credentials = {};
      cds.env.requires.github.credentials.token = token;
      cds.env.requires.github.credentials.url = url;
      cds.env.requires.github.kind = cds.env.requires.github.kind || "rest";
    }
  } catch (e) {
    console.warn(
      "[server] Could not read github binding from",
      githubPath,
      e.message,
    );
  }
}

// Process-level error handlers to prevent crashes
process.on("uncaughtException", (error) => {
  console.error("[UNCAUGHT EXCEPTION] Service will continue running:", {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
  // Don't exit the process - keep the service running
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[UNHANDLED REJECTION] Service will continue running:", {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise,
    timestamp: new Date().toISOString(),
  });
  // Don't exit the process - keep the service running
});

cds.on("bootstrap", (app) => {
  // add your own middleware before any by cds are added
  // for example, serve static resources incl. index.html

  // ── MCP endpoint (Hono app) ──────────────────────────────────────────────
  // Mounted BEFORE bodyParser so the raw body stream is available to
  // getRequestListener → createMcpHandler (which reads req.body itself).
  const mcpListener = getRequestListener(mcpApp.fetch);
  app.use(
    "/mcp",
    cds.middlewares.before,
    async (req, res, next) => {
      try {
        await mcpListener(req, res);
      } catch (e) {
        next(e);
      }
    },
    cds.middlewares.after,
  );

  // ── JWKS endpoint ────────────────────────────────────────────────────
  app.get("/.well-known/jwks.json", async (_req, res) => {
    const { getJWKS } = await import("./jwt/index.js");
    res.json(await getJWKS());
  });

  // ── GET /oauth-server/authorize → rewrite to POST for CDS handler ──
  app.get("/oauth-server/authorize", (req, res, next) => {
    req.method = "POST";
    req.body = {
      request_uri: req.query.request_uri,
      client_id: req.query.client_id,
    };
    req.headers["content-type"] = "application/json";
    next();
  });

  // IMPORTANT: Parse urlencoded BEFORE anything else (but after MCP handler)
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json({ extended: true }));

  // Rewrite GET /admin/policies → /admin/dashboard() for dashboard layout
  app.use((req, _res, next) => {
    const raw = (req.originalUrl || req.url || "").split("?")[0];
    if (
      req.method === "GET" &&
      (raw === "/admin/policies" || raw === "/admin/policies/")
    ) {
      const qs = (req.originalUrl || req.url || "").includes("?")
        ? (req.originalUrl || req.url).slice(
            (req.originalUrl || req.url).indexOf("?"),
          )
        : "";
      req.url = "/admin/dashboard()" + qs;
      req.path = "/admin/dashboard()";
    }
    next();
  });

  // Rewrite versions/key → versions('key') for CAP REST (treats versions.main as key otherwise)
  app.use((req, _res, next) => {
    const raw = (req.originalUrl || req.url || "").split("?")[0];
    const match = raw.match(
      /^(\/policies\/AgentPolicies\/[^/]+)\/versions\/([^/'()]+)(\/.*)?$/,
    );
    if (match) {
      const [, prefix, key, rest = ""] = match;
      const qs = (req.originalUrl || req.url || "").includes("?")
        ? (req.originalUrl || req.url).slice(
            (req.originalUrl || req.url).indexOf("?"),
          )
        : "";
      const newPath = prefix + "/versions('" + key + "')" + rest;
      req.url = newPath + qs;
      req.path = newPath;
    }
    next();
  });

  async function errorHandler(req, res, next) {
    try {
      await next();
    } catch (err) {
      console.error("[ERROR HANDLER]", {
        error: err.message,
        stack: err.stack,
        statusCode: err.statusCode || err.status,
        method: req.method,
        url: req.url,
        contentType: req.headers["content-type"],
        body: req.body,
      });

      // Don't crash the service - send appropriate error response
      const statusCode = err.statusCode || err.status || 500;

      if (!res.headersSent && req.accepts("html")) {
        return res.status(statusCode).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Error ${statusCode}</title>
            <style>
              body { font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto; }
              .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
                h1 { color: #c33; }
                .details { margin-top: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>Error ${statusCode}</h1>
              <p>${err.message || "Internal Server Error"}</p>
              <div class="details">
                <p><strong>Path:</strong> ${req.path}</p>
                <p><strong>Method:</strong> ${req.method}</p>
              </div>
              <a href="/">← Go back to home</a>
            </div>
          </body>
        </html>
      `);
      }

      const errorMessage = err.message || "Internal Server Error";
      // Check if headers have already been sent
      if (!res.headersSent && req.accepts("json")) {
        return res.status(statusCode).json({
          error: errorMessage,
          statusCode,
        });
      }
    }
  }

  app.use(errorHandler);
  // OAuth 2.0 endpoints must accept application/x-www-form-urlencoded per RFC 6749
  // Convert to JSON format that CDS REST protocol expects
  app.use((req, _res, next) => {
    const contentType = req.get("content-type") || "";
    if (req.path !== "/health")
      console.log(
        `[${new Date(Date.now()).toUTCString()}] [MIDDLEWARE] ${req.method} ${req.path} - Content-Type: ${contentType}`,
      );

    if (contentType.includes("application/x-www-form-urlencoded")) {
      console.log(
        "[MIDDLEWARE] OAuth endpoint detected - Converting form-urlencoded to JSON",
        {
          bodyKeys: Object.keys(req.body || {}),
          body: req.body,
          path: req.path,
          originalContentType: contentType,
        },
      );

      if (req.body && typeof req.body === "object") {
        // CDS REST protocol requires application/json
        // Modify headers using Express methods
        req.headers["content-type"] = "application/json";
        req.headers.accept = req.headers.accept || "application/json";
        // Also set the is property used by Express
        req.is = function (type) {
          if (type === "application/json" || type === "json") return true;
          return false;
        };
        console.log("[MIDDLEWARE] Content-Type changed to application/json");
      }
    }
    next();
  });

  // Middleware to remove null values from JSON responses. TODO: should be configurable
  // app.use((req, res, next) => {
  //   next();
  //   if (req.accepts("json") && res.body) {
  //       console.log("[MIDDLEWARE] Response JSON after null removal:");
  //       res.body = removeNulls(res.body);;
  //   }
  //   function removeNulls(body) {
  //     if (Array.isArray(body)) {
  //       return body.map(item => removeNulls(item));
  //     } else if (body && typeof body === 'object') {
  //       const newObj = {};
  //       for (const key in body) {
  //         if (body[key] !== null) {
  //           newObj[key] = removeNulls(body[key]);
  //         }
  //       }
  //       return newObj;
  //     }
  //     return body;
  //   }
  //
  // });

  // Add usage tracking middleware for grant usage monitoring
  // app.use(createUsageTracker());

  // Normalize connection_scopes: ensure it's always an array before CDS validation
  app.use((req, _res, next) => {
    if (req.body?.authorization_details && Array.isArray(req.body.authorization_details)) {
      for (const detail of req.body.authorization_details) {
        if (detail?.connection_scopes && !Array.isArray(detail.connection_scopes)) {
          detail.connection_scopes = [detail.connection_scopes];
        }
      }
    }
    next();
  });

  app.use(
    methodOverride(function (req, _res) {
      if (req.body && typeof req.body === "object" && "_method" in req.body) {
        // look in urlencoded POST bodies and delete it
        const method = req.body._method;
        delete req.body._method;
        return method;
      }
    }),
  );

  // Add global error handler to catch all errors and prevent service crashes
  app.use((err, req, res, next) => {
    console.error("[ERROR HANDLER]", {
      error: err.message,
      stack: err.stack,
      statusCode: err.statusCode || err.status,
      method: req.method,
      path: req.path,
      contentType: req.headers["content-type"],
      body: req.body,
    });

    // Don't crash the service - send appropriate error response
    const statusCode = err.statusCode || err.status || 500;
    const errorMessage = err.message || "Internal Server Error";

    // Check if headers have already been sent
    if (res.headersSent) {
      console.error(
        "[ERROR HANDLER] Headers already sent, delegating to default error handler",
      );
      return next(err);
    }

    // Send JSON error response for API requests
    if (req.accepts("json")) {
      return res.status(statusCode).json({
        error: errorMessage,
        statusCode,
        path: req.path,
      });
    }

    // Send HTML error response for browser requests
    if (req.accepts("html")) {
      return res.status(statusCode).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Error ${statusCode}</title>
            <style>
              body { font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto; }
              .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
              h1 { color: #c33; }
              .details { margin-top: 20px; color: #666; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>Error ${statusCode}</h1>
              <p>${errorMessage}</p>
              <div class="details">
                <p><strong>Path:</strong> ${req.path}</p>
                <p><strong>Method:</strong> ${req.method}</p>
              </div>
              <a href="/">← Go back to home</a>
            </div>
          </body>
        </html>
      `);
    }

    // Fallback plain text response
    res.status(statusCode).send(`Error ${statusCode}: ${errorMessage}`);
  });
});

// cds.serve(ConsentService).at("/consent").in(app);
