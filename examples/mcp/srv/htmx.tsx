import cds from "@sap/cds";
import React from "react";
import { renderToString } from "react-dom/server";

// Enhanced HTMX middleware that accepts both string and JSX components
export const htmlTemplate = (reactContent: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔑 Consent </title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
   <script src="https://unpkg.com/htmx.org@2.0.7"></script>
   <script src="https://unpkg.com/htmx-ext-form-json"></script>
  <script src="https://unpkg.com/htmx.org/dist/ext/json-enc.js"></script>


    <style>
        body { font-family: 'Inter', system-ui, sans-serif; }
    </style>


</head>
<body>
    <div id="root">${reactContent}</div> 
</body>
</html>
`;

export function render(req: cds.Request, component: React.ReactNode) {
  return sendHtml(req, htmlTemplate(renderToString(component)));
}
export function sendHtml(req: cds.Request, html: string) {
  req?.http?.res.setHeader("Content-Type", "text/html");
  return req?.http?.res.send(html);
}
