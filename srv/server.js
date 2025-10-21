import cds from "@sap/cds";
import bodyParser from "body-parser";
import methodOverride from "method-override";
import { htmxMiddleware } from "./middleware/htmx.tsx";
import { htmlTemplate } from "./middleware/htmx.tsx";
import { renderToString } from "react-dom/server";
import React from "react";
// Make React available globally for JSX in handlers
global.React = React;

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

cds.middlewares.before.push(htmxMiddleware);

function sendHtml(html) {
  cds.context?.http?.res.setHeader("Content-Type", "text/html");
  return cds.context?.http?.res.send(html);
}
cds.on("connect", (service) => {
  service.before("*", (req) => {
    Object.assign(cds.context, {
      render: (component) => sendHtml(htmlTemplate(renderToString(component))),
      html: (htmlString) => sendHtml(htmlTemplate(htmlString)),
    });
    return req.data;
  });
});
cds.on("bootstrap", (app) => {
  // add your own middleware before any by cds are added
  // for example, serve static resources incl. index.html

  // IMPORTANT: Parse urlencoded BEFORE anything else
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json({ extended: true }));

  // OAuth 2.0 endpoints must accept application/x-www-form-urlencoded per RFC 6749
  // Convert to JSON format that CDS REST protocol expects
  app.use((req, _res, next) => {
    const contentType = req.get("content-type") || "";
    console.log(
      `[MIDDLEWARE] ${req.method} ${req.path} - Content-Type: ${contentType}`
    );

    if (contentType.includes("application/x-www-form-urlencoded")) {
      console.log(
        "[MIDDLEWARE] OAuth endpoint detected - Converting form-urlencoded to JSON",
        {
          bodyKeys: Object.keys(req.body || {}),
          body: req.body,
          path: req.path,
          originalContentType: contentType,
        }
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

  // Add usage tracking middleware for grant usage monitoring
  // app.use(createUsageTracker());

  app.use(
    methodOverride(function (req, _res) {
      if (req.body && typeof req.body === "object" && "_method" in req.body) {
        // look in urlencoded POST bodies and delete it
        const method = req.body._method;
        delete req.body._method;
        return method;
      }
    })
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
        "[ERROR HANDLER] Headers already sent, delegating to default error handler"
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
