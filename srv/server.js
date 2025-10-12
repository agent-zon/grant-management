import cds from "@sap/cds";
import express from "express";
import bodyParser from "body-parser";
import methodOverride from "method-override";
import { htmxMiddleware } from "./middleware/htmx.ts";
import { htmlTemplate } from "./middleware/htmx.ts";
import { renderToString } from "react-dom/server";
import React from "react";
import createUsageTracker from "./middleware/usage-tracker.ts";


cds.middlewares.before.push(htmxMiddleware);

function sendHtml(html) {
    cds.context?.http?.res.setHeader("Content-Type", "text/html");
    return cds.context?.http?.res.send(html);
}
cds.on("connect", (service) => {
  service.before("*", async (req) => {
    Object.assign(cds.context,{
      render: (component) => sendHtml(htmlTemplate(renderToString(component))),
      html: (htmlString) => sendHtml(htmlTemplate(htmlString))
    });
    return req.data;
  });
});
cds.on("bootstrap", (app) => {
  // add your own middleware before any by cds are added
  // for example, serve static resources incl. index.html
  app.use(bodyParser.json({extended:true}));
  app.use(bodyParser.urlencoded({ extended: true }));
  
  // Add usage tracking middleware for grant usage monitoring
  app.use(createUsageTracker());

  app.use((req, res, next) => {
    if (
      req.headers["content-type"]?.includes("application/x-www-form-urlencoded")
    ) {
      // Convert form data to JSON format expected by CDS
      if (req.body && typeof req.body === "object") {
        // Change content-type to JSON so CDS accepts it
        req.headers["content-type"] = "application/json";
      }
    }
    next();
  });

  app.use(methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      // look in urlencoded POST bodies and delete it
      const method = req.body._method
      delete req.body._method
      return method
    }
  }))
  
});
