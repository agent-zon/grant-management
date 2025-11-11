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

// Middleware function to add to CDS context with auto-detection
export const htmxMiddleware = (req: cds.Request, res: any, next: any) => {
  if (cds.context) {
    Object.assign(cds.context!, {
      render: (component: React.ReactNode) =>
        sendHtml(htmlTemplate(renderToString(component))),
      html: (htmlString: string) => sendHtml(htmlTemplate(htmlString)),
    });
  }

  next();
};

export function sendHtml(html: string) {
  cds.context?.http?.res.setHeader("Content-Type", "text/html");
  return cds.context?.http?.res.send(html);
}


