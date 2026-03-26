import cds from "@sap/cds";
import React from "react";
import { renderToString } from "react-dom/server";

// Enhanced HTMX middleware that accepts both string and JSX components
export const htmlTemplate = (reactContent: string, baseHref?: string ) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ${baseHref ? `<base href="${baseHref}">` : ""}

    <title>Grants Management For AI Agents </title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
   <script src="https://unpkg.com/htmx.org@2.0.7"></script>
   <script src="https://unpkg.com/htmx-ext-form-json"></script>
   <script src="https://unpkg.com/htmx.org/dist/ext/json-enc.js"></script>
   <script src="https://unpkg.com/htmx.org/dist/ext/path-params.js"></script>
    <script src="https://unpkg.com/idiomorph@0.7.4/dist/idiomorph-ext.min.js" integrity="sha384-SsScJKzATF/w6suEEdLbgYGsYFLzeKfOA6PY+/C5ZPxOSuA+ARquqtz/BZz9JWU8" crossorigin="anonymous"></script>

   <script>htmx.config.disableInheritance = true;</script>

    <style>
        body { font-family: 'Inter', system-ui, sans-serif; }
        /* Swap/settle animations */
        .htmx-swapping { opacity: 0; transition: opacity 150ms ease-out; }
        .htmx-settling { opacity: 0; animation: htmx-fade-in 180ms ease-out forwards; }
        @keyframes htmx-fade-in { to { opacity: 1; } }
        /* Skeleton shimmer */
        .skeleton { background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.5s ease-in-out infinite; border-radius: 0.375rem; }
        @keyframes skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        /* Fade-in for loaded content */
        .content-fade-in { animation: content-fade-in 0.25s ease-out forwards; }
        @keyframes content-fade-in { from { opacity: 0; } to { opacity: 1; } }
        /* HTMX request indicators (hx-indicator / .htmx-indicator) */
        .htmx-indicator { opacity: 0; transition: opacity 160ms ease-out; }
        .htmx-indicator.htmx-request { opacity: 1; }
    </style>


</head>
<body hx-ext="path-params" hx-ext="morph" >${reactContent}</div> 
</body>
</html>
`;

// Middleware function to add to CDS context with auto-detection
export const htmxMiddleware = (req: cds.Request, res: any, next: any) => {
  Object.assign(req, {
    render: (component: React.ReactNode) =>
      sendHtml(req, htmlTemplate(renderToString(component))),
    html: (htmlString: string) => sendHtml(req, htmlTemplate(htmlString)),
  });

  next();
};

export function render(req: cds.Request, component: React.ReactNode, baseHref?: string) {
   if (req?.http?.req?.headers?.["hx-request"] === "true") {
    return sendHtml(req, renderToString(component));
   }
  return sendHtml(req, htmlTemplate(renderToString(component), baseHref));
}
export function sendHtml(req: cds.Request, html: string) {
  req?.http?.res.setHeader("Content-Type", "text/html");
  return req?.http?.res.send(html);
}
