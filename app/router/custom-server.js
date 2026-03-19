/**
 * Custom approuter server: uses @sap/approuter as module, injects:
 * - /sketches - Hono+HTMX tile dashboard of sketch destinations
 * - /sketch - proxy to destinations with HTML base URL rewrite
 */
import { createRequire } from "module";
import { getRequestListener } from "@hono/node-server";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { createSketchMiddleware } from "./sketch-proxy.js";
import { sketches } from "./sketches/index.tsx";
import approuter from "@sap/approuter";
const __dirname = dirname(fileURLToPath(import.meta.url));

const ar = approuter();

// Sketches dashboard (Hono+HTMX) - before auth
ar.first.use("/sketches", async (req, res, next) => {
  try {
    await getRequestListener(sketches.fetch)(req, res);
  } catch (e) {
    next(e);
  }
});

// Sketch proxy - useOrFetchDestination (same as approuter: default-env, BTP, K8s)
const sketchMiddleware = createSketchMiddleware();
ar.first.use("/html", (req, res, next) => {
  sketchMiddleware(req, res, next).catch(next);
});

ar.start({
  workingDir: __dirname,
  port: process.env.PORT || 9000,
});
