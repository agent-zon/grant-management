/**
 * Sketches dashboard - Hono + HTMX tile view of sketch destinations.
 * Uses TSX + hono/jsx for proper HTML rendering (no escaping).
 * HTMX composition: tiles load fragments via hx-get on load (htmx-approuter-poc pattern).
 */
/** @jsxImportSource hono/jsx */
/** @jsx jsx */
import { Context, Hono } from "hono";
import { FC, Fragment, jsx, PropsWithChildren } from "hono/jsx";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { jsxRenderer, useRequestContext } from 'hono/jsx-renderer'
import { useOrFetchDestination, isHttpDestination } from "@sap-cloud-sdk/connectivity";
import { executeHttpRequest } from "@sap-cloud-sdk/http-client";
import { stream, streamText, streamSSE } from 'hono/streaming'

import destinations from "../sketches-destinations.json";
import { StreamingApi } from "hono/utils/stream";
const __dirname = dirname(fileURLToPath(import.meta.url));

type SketchDest = { name: string; url: string; labels: string[] };

function loadSketchDestinations(): SketchDest[] {
  try {
    const path = join(__dirname, "..", "sketches-destinations.json");
    const data = JSON.parse(readFileSync(path, "utf8"));
    if (Array.isArray(data)) {
      return data
        .filter((d: { name?: string; url?: string }) => d.name && d.url)
        .map((d: { name: string; url: string }) => ({
          name: d.name,
          url: d.url,
          labels: [] as string[],
        }));
    }
  } catch {
    /* ignore */
  }
  return [];
}

const sketches = new Hono();


sketches.use("/*",
  jsxRenderer(({ children }) => {
    const c = useRequestContext();
    return <html>
      <head>
        <title>Playground: SAP Engagement Layer</title>
        <base href="/sketches/" />
        <meta
          hx-preserve="true"
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <script
          hx-preserve="true"
          src="https://cdn.jsdelivr.net/npm/iconify-icon@2.1.0/dist/iconify-icon.min.js"
        >
        </script>
        <script
          hx-preserve="true"
          src="https://cdn.jsdelivr.net/npm/@gigya/wc/+esm"
          type="module"
          crossorigin="anonymous"
        >
        </script>

        <script
          hx-preserve="true"
          src="https://unpkg.com/htmx.org@2.0.2"
        >
        </script>
        <script
          hx-preserve="true"
          src="https://unpkg.com/htmx-ext-sse@2.2.2/sse.js"
        >
        </script>
        <script
          hx-preserve="true"
          src="https://unpkg.com/idiomorph@0.3.0/dist/idiomorph-ext.min.js"
          async
          crossorigin="anonymous"
        >
        </script>
        <script
          src="https://cdn.jsdelivr.net/npm/iconify-icon@2.1.0/dist/iconify-icon.min.js"
          async
          hx-preserve="true"
          crossorigin="anonymous"
        >
        </script>

        <script
          hx-preserve="true"
          src="https://unpkg.com/htmx-ext-head-support@2.0.2"
        >
        </script>
        <script
          hx-preserve="true"
          src="https://unpkg.com/@tailwindcss/browser@4"
          crossorigin="anonymous"
        >
        </script>
      </head>
      <body hx-ext="head-support" class="w-screen h-screen">
        {children}
      </body>
    </html>
  }
    , { stream: true })
);
sketches.use(
  jsxRenderer(function ({ children, Layout }) {
    const c = useRequestContext()
    const panel = c.req.param("sketch")
    return <Layout>
      <div className="relative min-h-screen min-w-screen">
        <header class="sticky bg-opacity-25 backdrop-blur-xl top-0 z-[100]  w-full flex items-center justify-between *:py-2 *:shadow-md *:rounded-lg *:bg-white/90 *:backdrop-blur-xl *:border-b *:border-slate-200  max-h-[49px] ">
          <div class="max-w-[1200px] flex items-center gap-4 justify-start px-10   ">
            <nav class="flex flex-wrap items-center gap-2 text-sm text-slate-500 left-0
              *:gap-2.5 *:text-sm *:text-slate-500 *:left-0 *:hover:text-sky-600 *:transition-colors *:flex *:items-center *:gap-2.5 *:flex *:items-center *:gap-2.5 *:text-sm  *:hover:text-sky-600 *:transition-colors *:flex *:items-center *:gap-2.5  *:text-sky-500 *:cursor-pointer ">
              <a href="/grants-management" >
                <iconify-icon
                  icon="mdi:shield-lock-outline"
                  width="14"
                  height="14"
                  class="text-sky-500"
                />
                <span class="text-sky-500">Grants Management</span>
              </a>
              <span class="text-slate-300">/</span>
              <a href="/sketches" >
                <iconify-icon
                  icon="mdi:palette-outline"
                  width="14"
                  height="14"
                  class="text-sky-600"
                />
                <span class={!panel ? "font-semibold text-sky-600" : "text-sky-500"} >Sketches</span>
              </a>
              {panel && (
                <Fragment>
                  <iconify-icon
                    icon="mdi:chevron-right"
                    width="14"
                    height="14"
                    class="text-sky-500"
                  />
                  <a href={`/sketches/${panel}`} >

                    <span class="font-semibold text-sky-600">
                      {panel}
                    </span>
                  </a>
                </Fragment>
              )}
            </nav>

          </div>
          <div class="flex gap-2 items-center justify-end inset-10 gap-4 px-10 ">
            <a href="/sketches" aria-label="Back to Sketches" title="Back to Sketches">
              <div class="flex items-center gap-2.5 text-lg font-bold text-slate-900   ">
                <iconify-icon
                  icon="mdi:palette-outline"
                  width="28"
                  height="28"
                  class="text-sky-500 "
                />
              </div>
            </a>
          </div>
        </header>
        {children}
      </div >
    </Layout >
  }, { stream: true })
)

sketches.get("/", (c) => {
  const dests = loadSketchDestinations();
  return c.render(
    <Fragment>
      <main class="flex-1 max-w-[1200px] mx-auto px-6 py-10 w-full">
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-slate-900 mb-2">
            Sketches of Grants Management for AI Agents
          </h1>

          <p class="text-slate-600 max-w-xl">

          </p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dests.map((d) => (
            <div
              class="bg-white border border-slate-200 rounded-xl p-6 min-h-[200px] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 hover:border-sky-200"
              hx-get={`${encodeURIComponent(d.name)}/tile`}
              hx-trigger="load"
              hx-swap="innerHTML"
            >
              <div class="flex flex-col items-center justify-center gap-3 h-[160px] text-slate-400 text-sm">
                <div class="spinner" />
                <span>Loading {d.name}...</span>
              </div>
            </div>
          ))}
        </div>
        {/* <div class="mt-12 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h3 class="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">
            Data Sources
          </h3>
          <div class="flex flex-col gap-3">
            {dests.map((d) => (
              <div class="flex items-center gap-3 px-3.5 py-2.5 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors">
                <span class="w-2 h-2 rounded-full flex-shrink-0 bg-sky-500" />
                <span class="text-sm font-semibold text-slate-900">{d.name}</span>
                <span class="text-[13px] text-slate-400 font-mono ml-auto max-[900px]:hidden">
                  {d.url}
                </span>
              </div>
            ))}
          </div>
        </div> */}
      </main>
      <footer class="border-t border-slate-200 px-6 py-5 text-center text-sm text-slate-400 mt-auto">
        Powered by HTMX + SAP App Router · Grant Management
      </footer>
    </Fragment>
  );
});

sketches.get("/:sketch/tile", (c) => {
  const sketch = c.req.param("sketch");
  const dests = loadSketchDestinations();
  const d = dests.find((x) => x.name === sketch);
  if (!d) return c.notFound();
  return c.html(<div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
    <div class="flex items-center gap-3 mb-2">
      <iconify-icon
        icon="mdi:palette-outline"
        width="20"
        height="20"
        class="text-sky-500"
      />
      <span class="font-semibold text-slate-900">{d.name}</span>
    </div>
    <p class="text-sm text-slate-500 truncate mb-3">{d.url}</p>
    <a
      hx-get={`${encodeURIComponent(sketch)}`}
      hx-trigger="click"
      hx-target="body"
      hx-push-url="true"
      hx-swap="innerHTML"
      class="text-sm text-sky-600 hover:underline"
    >
      Open sketch →
    </a>
  </div>);
});


sketches.get("/:sketch/test", (c) => {
  const sketch = c.req.param("sketch");
  return c.html(
    <html>
      <head>
        <base href={`/destination/${encodeURIComponent(sketch)}/`} />
        <script src="https://unpkg.com/htmx.org@2.0.2"></script>
      </head>
      <body>
        <div hx-get={`/destination/${encodeURIComponent(sketch)}`} hx-trigger="load" hx-target="body" hx-swap="outerHTML" ></div>
      </body>
    </html>
  );
});

sketches.get("/:sketch", (c) => {
  const sketch = c.req.param("sketch");
  return c.render(
    <iframe src={`/html/${encodeURIComponent(sketch)}`} class="w-screen h-screen scroll-smooth "></iframe>);
});

export { sketches };
