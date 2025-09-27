import express from "express";
import cds from "@sap/cds";
import compression from "compression";
import path from "node:path";
import { pathToFileURL } from "node:url";

const app = express();
// app.use(
//   createRequestListener({
//     build: rtlBuild,
//   })
// );
// // needs to handle all verbs (GET, POST, etc.)
app.use(compression());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Proper CAP integration: export default server function and delegate to cds.server
const DEVELOPMENT = process.env.NODE_ENV === "development";

cds.on("bootstrap", (app) => {
  // Place for additional middlewares if needed before CAP services
  app.use(compression());
});

cds.on("served", async () => {
  // Mount React Router SSR after CAP services so /api stays handled by CAP
  if (DEVELOPMENT) {
    try {
      const vite = await import("vite");
      const viteDevServer = await vite.createServer({
        server: { middlewareMode: true },
        root: path.resolve(process.cwd(), "app/portal"),
      });
      app.use(viteDevServer.middlewares);
      app.use(async (req, res, next) => {
        try {
          const source = await viteDevServer.ssrLoadModule("./server/app.ts");
          return await source.app(req, res, next);
        } catch (error) {
          if (typeof error === "object" && error instanceof Error) {
            viteDevServer.ssrFixStacktrace(error);
          }
          next(error);
        }
      });
    } catch (e) {
      console.warn("Vite dev server for portal not started:", e?.message || e);
    }
  } else {
    try {
      app.use(
        "/assets",
        express.static(
          path.resolve(process.cwd(), "app/portal/build/client/assets"),
          { immutable: true, maxAge: "1y" }
        )
      );
      app.use(
        express.static(
          path.resolve(process.cwd(), "app/portal/build/client"),
          { maxAge: "1h" }
        )
      );
      const mod = await import(
        pathToFileURL(
          path.resolve(process.cwd(), "app/portal/build/server/index.js")
        ).href
      );
      const portalApp = mod.app;
      if (typeof portalApp === "function") {
        app.use(portalApp);
      }
    } catch (e) {
      console.warn("Portal SSR not mounted (prod):", e?.message || e);
    }
  }
});

export default (o) => {
  o.app = app;
  return cds.server(o);
};

// eslint-disable-next-line import/no-anonymous-default-export
/*

export default (o) => {
  const port = o.port || Number.parseInt(process.env.PORT || "4004");

  o.from = "./grant-management-service.cds";
  o.app = app;
  o.port = process.env.PORT || "4004";
  o.host = process.env.HOST || "0.0.0.0";
  //   o.health = true;
  o.static = "dist/client";
  o.favicon = () => {
    return express.static("app/portal/dist/client/favicon.ico");
  };
  o.index = () => {
    return express.static("app/portal/dist/client/index.html");
  };
  o.logger = console;
  o.server = app.listen(port, () => {
    console.log(`Server listening on port ${port} (http://localhost:${port})`);
  });
  return cds.server(o); //> delegate to default server.js
};
*/