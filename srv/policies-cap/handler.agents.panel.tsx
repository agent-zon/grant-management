import cds from "@sap/cds";
import { render, sendHtml } from "#cds-ssr";
import { renderToString } from "react-dom/server";
import { wrapWithLayout, setHtmxSidebarSelect } from "./middleware.layout";

/** GET Policies/agent-123/versions/<version>/edit → panel only; middleware sets wrapWithLayout for full page. */
export async function GET(this: any, req: cds.Request) {
  const { agent, version, agentId } = req.data || {};
  console.log("get panel", agent?.id, version);
  return render(req, (
    <form className="flex flex-col min-h-[calc(100vh-2.75rem)] w-full p-6 gap-6 bg-gray-50">
      <div className="flex items-center justify-between shrink-0 gap-6">
        <div
          className="min-w-0 flex-1"
          hx-get={`agents/${agentId}/versions/${version}/title`}
          hx-trigger="load"
          hx-swap="morph:outerHTML"
        />
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[11px] text-gray-500">Live</span>
        </div>
        <div
          className="flex items-center gap-3 shrink-0"
          hx-get={`agents/${agentId}/versions/${version}/publisher`}
          hx-swap="outerHTML"
          hx-trigger="load"
        />
      </div>
      <div className="flex-1 grid gap-6 min-h-0 grid-cols-1 lg:grid-cols-[1fr_minmax(280px,38%)] grid-auto-flow">
         {/* Connect */}
        <div className="grid row-start-2  rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col min-w-0 shrink-0 [&:has(#connect-picker-slot:empty)]:hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0 top-0 sticky max-h-12">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Connect</h3>
          </div>
          <div
            id="connect-picker-slot"
            className="p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 max-h-48"
            hx-get="agents/{agent}/versions/{version}/resources/connecter"
            hx-trigger="connect from:body"
            hx-swap="morph:innerHTML"
            hx-vals="js:{ agent: event?.detail?.agent, version: event?.detail?.version }"
          />
        </div>
        {/* Resources */}
        <div className="grid row-start-0 col-start-1 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-0">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0 top-0 sticky max-h-12">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Resources</h3>
          </div>
          <div className="p-5 flex-1 min-h-0  overflow-y-auto max-h-full">
            <div
              id="resources-pane-container"
              hx-get={`agents/${agentId}/versions/${version}/resources/pane`}
              hx-swap="innerHTML"
              hx-trigger="load"
            />
          </div>
        </div>
        {/* Policy */}
        <div className="row-start-0 row-span-2 col-start-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-0">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0 top-0 sticky max-h-12">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Policy</h3>
          </div>
          <div className="p-5 flex-1 min-h-0 overflow-y-auto">
            <div
              id="rules-container"
              hx-get={`agents/${agentId}/versions/${version}/rules`}
              hx-swap="outerHTML"
              hx-trigger="load"
            />
          </div>
        </div>
      </div>
    </form>
  ));
}

export async function Title(this: any, req: cds.Request) {
  const { agent, agentId, version } = req.data;
  const { id, title, name, description, location, tags } = agent || {}
  return render(req, (
    <div
      className="flex flex-col gap-1 min-w-0"
      hx-get={`agents/{agent}/versions/{version}/title`}
      hx-vals="js:{ version: event?.detail?.version, agent: event?.detail?.agent }"
      hx-trigger="agentSelected from:body"
      hx-swap="innerHTML"
    >
      <h2 className="text-xl font-bold text-gray-900 font-mono truncate" title={title || name || id}>
        {title || name || id}
      </h2>
      <div className="flex items-center gap-4 text-sm flex-wrap min-w-0">
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="text-gray-500">id:</span>
          <span className="font-mono text-gray-700 truncate max-w-[12rem]" title={id}>{id}</span>
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="text-gray-500">version:</span>
          <span className="font-mono text-gray-700 truncate max-w-[8rem]" title={version}>{version}</span>
        </span>
      </div>
    </div>
  ));
}


/** Response after push (Git done in middleware). HTML → Toast, else JSON. */
export async function POST(this: any, req: cds.Request) {
  const { agentId, version } = req.data || {};
  if (req?.http?.req.accepts("html")) {
    return sendHtml(
      req,
      renderToString(
        <div id="save-toast" className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg">
          <span>✅</span><span>Committed to Git for <strong>{agentId}</strong></span>
        </div>
      )
    );
  }
  return { agentId, version, committed: true };
}
