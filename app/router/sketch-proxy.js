/**
 * Sketch proxy - Express/connect middleware that proxies to destinations
 * and rewrites root-relative URLs in HTML. Uses @sap-cloud-sdk/connectivity
 * for destination resolution (same as approuter: default-env, BTP, K8s).
 */
import { useOrFetchDestination, isHttpDestination } from "@sap-cloud-sdk/connectivity";

function rewriteHtmlBase(html, basePath) {
  if (!html || typeof html !== "string") return html;
  const base = `/html/${basePath}/`;
  return html
    .replace(/\bhref="\/(?!\/)/g, `href="${base}`)
    .replace(/\bhref='\/(?!\/)/g, `href='${base}`)
    .replace(/\bsrc="\/(?!\/)/g, `src="${base}`)
    .replace(/\bsrc='\/(?!\/)/g, `src='${base}`)
    .replace(/\bcontent="\/(?!\/)/g, `content="${base}`);
}

/**
 * Creates Express/connect middleware for /html/:destName/* that:
 * 1. Resolves destination via useOrFetchDestination (approuter-style)
 * 2. Proxies request to destination
 * 3. Rewrites HTML so assets load from /html/{destName}/
 * @param {{ jwt?: string }} [opts] - Optional jwt for authenticated destinations
 * @returns {import('connect').NextHandleFunction}
 */
export function createSketchMiddleware(opts = {}) {
  return async function sketchMiddleware(req, res, next) {
    const pathname = (req.url || "/").split("?")[0];
    const after = pathname.replace(/^\/sketch\/?/, "");
    const parts = after.replace(/^\/+/, "").split("/").filter(Boolean);
    const destName = parts[0] || "";

    if (!destName) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Missing destination name in path: /html/{destinationName}/...");
      return;
    }

    const path = parts.slice(1).join("/");
    const search = req.url?.includes("?") ? "?" + req.url.split("?")[1] : "";

    let destination;
    try {
      destination = await useOrFetchDestination({
        destinationName: destName,
        jwt: opts.jwt,
      });
    } catch (err) {
      console.error("[sketch] Destination lookup failed:", destName, err?.message);
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end(`Destination "${destName}" not found or failed to resolve`);
      return;
    }

    if (!destination || !isHttpDestination(destination)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end(`Destination "${destName}" is not an HTTP destination`);
      return;
    }

    const baseUrl = destination.url?.replace(/\/$/, "") || "";
    if (!baseUrl) {
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end(`Destination "${destName}" has no URL`);
      return;
    }

    const targetUrl = `${baseUrl}/${path}${search}`;
    const targetHost = new URL(baseUrl).host;

    const headers = { ...req.headers };
    headers.host = targetHost;
    headers["x-forwarded-host"] = req.headers.host || "";
    headers["x-forwarded-proto"] = req.headers["x-forwarded-proto"] || "http";
    headers["x-forwarded-path"] = `/html/${destName}/${path}`.replace(/\/+$/, "") || `/html/${destName}`;

    if (destination.authTokens?.[0]?.value) {
      headers.authorization = `Bearer ${destination.authTokens[0].value}`;
    }

    try {
      let body;
      if (req.method !== "GET" && req.method !== "HEAD" && req.readable) {
        body = await new Promise((resolve, reject) => {
          const chunks = [];
          req.on("data", (c) => chunks.push(c));
          req.on("end", () => resolve(Buffer.concat(chunks)));
          req.on("error", reject);
        });
      }

      const fetchOpts = {
        method: req.method,
        headers,
        ...(body?.length ? { body } : {}),
      };

      const proxyRes = await fetch(targetUrl, fetchOpts);

      const contentType = proxyRes.headers.get("content-type") || "";
      const isHtml = contentType.includes("text/html");

      res.statusCode = proxyRes.status;
      for (const [k, v] of proxyRes.headers) {
        if (["transfer-encoding", "content-encoding"].includes(k.toLowerCase())) continue;
        res.setHeader(k, v);
      }

      if (isHtml && proxyRes.ok) {
        const body = await proxyRes.text();
        const rewritten = rewriteHtmlBase(body, destName);
        res.end(rewritten);
      } else {
        const buf = await proxyRes.arrayBuffer();
        res.end(Buffer.from(buf));
      }
    } catch (err) {
      console.error("[sketch] Proxy error:", err?.message);
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end(`Proxy error: ${err?.message || "Unknown"}`);
    }
  };
}
