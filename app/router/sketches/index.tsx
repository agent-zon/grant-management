/**
 * Sketches dashboard - Hono + HTMX tile view of sketch destinations.
 * Uses TSX + hono/jsx for proper HTML rendering (no escaping).
 * HTMX composition: tiles load fragments via hx-get on load (htmx-approuter-poc pattern).
 */
/** @jsxImportSource hono/jsx */
/** @jsx jsx */
import { Hono } from "hono";
import { Fragment, jsx } from "hono/jsx";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import destinations from "../sketches-destinations.json";
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


sketches.use("/*", async (c, next) => {
  c.setRenderer((content) =>
    c.html(
      <html>
        <head>
          <title>Playground: SAP Engagement Layer</title>
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
          <base href="/shell/" />
        </head>
        <body hx-ext="head-support">
          {content}
        </body>
      </html>
    )
  );
  return await next();
});


sketches.get("/", (c) => {
  const dests = loadSketchDestinations();
  return c.render(
    <div class="min-h-screen flex flex-col">
      <header class="sticky top-0 z-[100] bg-white/90 backdrop-blur-xl border-b border-slate-200">
        <div class="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-2.5 text-lg font-bold text-slate-900">
            <iconify-icon
              icon="mdi:palette-outline"
              width="28"
              height="28"
              class="text-sky-500"
            />
            <span>Sketches</span>
          </div>
          <div class="flex gap-2">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500 text-white">
              HTMX 2.0
            </span>
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              {dests.length} destinations
            </span>
          </div>
        </div>
      </header>
      <main class="flex-1 max-w-[1200px] mx-auto px-6 py-10 w-full">
        <div class="mb-8">
          <h1 class="text-2xl font-bold text-slate-900 mb-2">
            Sketch Tiles
          </h1>
          <p class="text-slate-600 max-w-xl">
            Each tile below is loaded independently using HTMX. Content is
            fetched as HTML fragments and injected directly into the page.
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
        <div class="mt-12 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
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
        </div>
      </main>
      <footer class="border-t border-slate-200 px-6 py-5 text-center text-sm text-slate-400 mt-auto">
        Powered by HTMX + SAP App Router · Grant Management
      </footer>
    </div>
  );
});

sketches.get("/:name/tile", (c) => {
  const name = c.req.param("name");
  const dests = loadSketchDestinations();
  const d = dests.find((x) => x.name === name);
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
      hx-get={`${encodeURIComponent(name)}/panel`}
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

sketches.get("/:name/panel", (c) => {
  const name = c.req.param("name");
  // return c.render(<Fragment>
  //   <head>
  //     <base href={`/shell/${encodeURIComponent(name)}/`} />
  //   </head>
  //   <div class="relative min-h-screen ">
  //     <header className="mb-6 sticky z-10 bg-smoked-white backdrop-blur-xl border-b border-slate-200  z-100">
  //       <a href="/shell" className="text-sky-600 hover:text-sky-700 font-semibold">← Sketches</a>
  //     </header>
  //     <div hx-get={`/sketch/${encodeURIComponent(name)}`} hx-trigger="load" hx-swap="innerHTML" class="h-full w-full">
  //       <div class="flex flex-col items-center justify-center gap-3 h-[160px] text-slate-400 text-sm">
  //         <div class="spinner" />
  //         <span>Loading {name}...</span>
  //       </div>
  //     </div>
  //   </div>
  // </Fragment>);
  return c.render(<Fragment>
    <div className="relative min-h-screen min-w-screen">
      <header class="sticky top-0 z-[100] bg-white/90 backdrop-blur-xl border-b border-slate-200">

        <div class="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">

          <div class="flex items-center gap-4 justify-start">
            <nav class="flex flex-wrap items-center gap-2 text-sm text-slate-500 left-0">
              <a href="/grants-management" class="hover:text-sky-600 transition-colors">Grants Management</a>
              <span class="text-slate-300">/</span>
              <a href="/shell" class="hover:text-sky-600 transition-colors">Sketches</a>
              <span class="text-slate-300">/</span>
              <span class="font-semibold text-sky-600">{name}</span>
            </nav>

          </div>
          <div class="flex gap-2 items-center justify-end">
            {/* <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
              {destinations.length} destinations
            </span> */}
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-500 text-white">
              {name}
            </span>
            <div class="flex items-center gap-2.5 text-lg font-bold text-slate-900   ">
              <iconify-icon
                icon="mdi:palette-outline"
                width="28"
                height="28"
                class="text-sky-500"
              />
              <span>Sketches</span>
            </div>
          </div>
        </div>
      </header>

      <iframe
        src={`/sketch/${name}/`}
        className="w-full h-screen absolute top-0 left-0  my-0 inset-0"
        title={name}
      />

      {/* <div
        hx-get={`/sketch/${name}/`}
        hx-trigger="load"
        hx-swap="innerHTML"
        className="w-full h-screen absolute top-0 left-0  absolute my-0 inset-0"
        title={name}
      /> */}
    </div >
  </Fragment>);
});
export { sketches };
