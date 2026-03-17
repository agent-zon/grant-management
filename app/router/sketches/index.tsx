/**
 * Sketches dashboard - Hono + HTMX tile view of sketch destinations.
 * Uses TSX + hono/jsx for proper HTML rendering (no escaping).
 * HTMX composition: tiles load fragments via hx-get on load (htmx-approuter-poc pattern).
 */
/** @jsxImportSource hono/jsx */
import { Hono } from "hono";
import type { FC } from "hono/jsx";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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

const sketches = new Hono().basePath("/sketches");

const Layout: FC<{ children?: unknown }> = (props) => (
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <base href="/sketches/" />
      <title>Sketches - Grant Management</title>
      <script src="https://cdn.jsdelivr.net/npm/iconify-icon@2.1.0/dist/iconify-icon.min.js" />
      <script src="https://unpkg.com/htmx.org@2.0.2" />
      <script src="https://unpkg.com/htmx-ext-head-support@2.0.2" />
      <script
        src="https://unpkg.com/@tailwindcss/browser@4"
        crossorigin="anonymous"
      />
      <style dangerouslySetInnerHTML={{ __html: `.spinner{width:24px;height:24px;border:2px solid #e2e8f0;border-top-color:#0ea5e9;border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}` }} />
    </head>
    <body hx-ext="head-support" class="bg-slate-50 text-slate-900 min-h-screen">
      {props.children}
    </body>
  </html>
);

const TilePlaceholder: FC<{ name: string }> = (props) => (
  <div
    class="bg-white border border-slate-200 rounded-xl p-6 min-h-[200px] shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 hover:border-sky-200"
    hx-get={`/sketches/tile/${encodeURIComponent(props.name)}`}
    hx-trigger="load"
    hx-swap="innerHTML"
  >
    <div class="flex flex-col items-center justify-center gap-3 h-[160px] text-slate-400 text-sm">
      <div class="spinner" />
      <span>Loading {props.name}...</span>
    </div>
  </div>
);

const TileFragment: FC<{ dest: SketchDest }> = (props) => (
  <div class="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
    <div class="flex items-center gap-3 mb-2">
      <iconify-icon
        icon="mdi:palette-outline"
        width="20"
        height="20"
        class="text-sky-500"
      />
      <span class="font-semibold text-slate-900">{props.dest.name}</span>
    </div>
    <p class="text-sm text-slate-500 truncate mb-3">{props.dest.url}</p>
    <a
      href={`/sketch/${encodeURIComponent(props.dest.name)}`}
      target="_blank"
      class="text-sm text-sky-600 hover:underline"
    >
      Open sketch →
    </a>
  </div>
);

sketches.get("/", (c) => {
  const dests = loadSketchDestinations();
  return c.html(
    <Layout>
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
              <TilePlaceholder name={d.name} />
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
    </Layout>
  );
});

sketches.get("/tile/:name", (c) => {
  const name = c.req.param("name");
  const dests = loadSketchDestinations();
  const d = dests.find((x) => x.name === name);
  if (!d) return c.notFound();
  return c.html(<TileFragment dest={d} />);
});

export { sketches };
