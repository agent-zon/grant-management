import cds from "@sap/cds";
import bodyParser from "body-parser";
import methodOverride from "method-override";
import { htmxMiddleware } from "./middleware/htmx.tsx";
import { htmlTemplate } from "./middleware/htmx.tsx";
import { renderToString } from "react-dom/server";
import React from "react";
// Make React available globally for JSX in handlers
global.React = React;

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

  // Add error handler to log all errors including 415
  app.use((err, req, _res, next) => {
    console.error("[ERROR HANDLER]", {
      error: err.message,
      stack: err.stack,
      statusCode: err.statusCode || err.status,
      method: req.method,
      path: req.path,
      contentType: req.headers["content-type"],
    });
    next(err);
  });
});

// cds.serve(ConsentService).at("/consent").in(app);
