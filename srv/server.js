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

  // Serve an interactive API docs page using a tiny Vue app + Scalar
  app.get(["/api-docs", "/api-docs/", "/api-docs/:path"], (req, res, next) => {
    if (req.path !== "/api-docs/") {
      // Normalize without redirect loops for subpaths
      if (req.path === "/api-docs") return res.redirect(302, "/api-docs/");
    }
    // Decide OpenAPI base depending on runtime behind approuter or direct
    const behindApprouter = Boolean(process.env.VCAP_APPLICATION) || req.headers["x-app-host"];
    const openapiBase = behindApprouter ? "/resources/openapi" : "/openapi";
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>API Documentation</title>
  <style>
    :root { color-scheme: dark; }
    html, body, #app { height: 100%; margin: 0; background:#0b0f19; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial; color:#e5e7eb; }
    .header { display:flex; align-items:center; gap:12px; padding: 14px 18px; border-bottom:1px solid #1f2937; position: sticky; top:0; background: rgba(2,6,23,.6); backdrop-filter: blur(6px); z-index:10; }
    .header a { color:#93c5fd; text-decoration:none; }
    .wrap { max-width: 1400px; margin:0 auto; padding: 16px 18px; }
    .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin-bottom:16px; }
    .card { background: rgba(15,23,42,.6); border:1px solid #334155; border-radius:12px; padding: 10px 12px; cursor:pointer; }
    .card.active { border-color:#3b82f6; }
    .title { font-weight:700; font-size:16px; margin-bottom:2px; }
    .muted { color:#94a3b8; font-size:12px; }
    .scalar { border:1px solid #334155; border-radius:12px; overflow:hidden; background: rgba(15,23,42,.5); min-height: 70vh; }
  </style>
  <script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
</head>
<body>
  <div id="app"></div>
  <script>
    const OPENAPI_BASE = ${JSON.stringify(openapiBase)};
    const services = [
      { id: 'grants', name: 'Grants Management Service', description: 'OAuth 2.0 Grant Management API', spec: 'GrantsManagementService.openapi3.json' },
      { id: 'authorization', name: 'Authorization Service', description: 'OAuth 2.0 Authorization Server', spec: 'AuthorizationService.openapi3.json' },
      { id: 'auth', name: 'Auth Service', description: 'Authentication and user information', spec: 'AuthService.openapi3.json' },
      { id: 'demo', name: 'Demo Service', description: 'Demo and testing endpoints', spec: 'DemoService.openapi3.json' }
    ];

    const App = {
      data() { return { services, activeId: services[0].id }; },
      computed: {
        specUrl() { const s = this.services.find(x => x.id === this.activeId) || this.services[0]; return `${openapiBase()}/${s.spec}`; }
      },
      mounted() { this.loadScalar(); },
      watch: { activeId() { this.loadScalar(); } },
      methods: {
        cardClass(id){ return ['card', this.activeId === id ? 'active' : ''].join(' '); },
        loadScalar(){
          const host = this.$refs.scalar;
          host.innerHTML = '';
          const cfg = document.createElement('script');
          cfg.id = 'api-reference';
          cfg.setAttribute('data-url', this.specUrl);
          host.appendChild(cfg);
          const loader = document.createElement('script');
          loader.src = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference';
          loader.async = true;
          host.appendChild(loader);
        }
      },
      template: `
        <div>
          <div class="header">
            <a href="/">← Back to Home</a>
            <div class="muted">API Documentation</div>
          </div>
          <div class="wrap">
            <div class="cards">
              <div v-for="s in services" :key="s.id" :class="cardClass(s.id)" @click="activeId = s.id" @keydown.enter="activeId = s.id" tabindex="0">
                <div class="title">{{ s.name }}</div>
                <div class="muted">{{ s.description }}</div>
              </div>
            </div>
            <div class="scalar" ref="scalar"></div>
          </div>
        </div>
      `
    };

    function openapiBase(){ return OPENAPI_BASE; }
    Vue.createApp(App).mount('#app');
  </script>
</body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  });

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
