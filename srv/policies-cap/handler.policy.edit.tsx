import cds from "@sap/cds";
import { sendHtml } from "#cds-ssr";
import { renderToString } from "react-dom/server";
import { wrapWithLayout, setHtmxSidebarSelect } from "./middleware.layout";

/** GET Policies/agent-123/versions/<version>/edit → panel only; middleware sets wrapWithLayout for full page. */
export async function GET_EDIT(this: any, req: cds.Request) {
  const { agentId, version } = req.data;
  const v = version || "main";

  const panel = (
    <div className="flex flex-col h-full p-6 space-y-5 max-w-3xl mx-auto bg-gray-50">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-mono">{agentId}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">version:</span>
            <span className="text-sm font-mono text-gray-700">{v}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div id="save-toast" />
          <button
            hx-post="save"
            hx-ext="json-enc"
            hx-include="#policy-panel [name=agentId], #policy-panel [name=rules], #policy-panel [name=version]"
            hx-target="#save-toast"
            hx-swap="outerHTML"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <span>💾</span> Save Policies
          </button>
        </div>
      </div>
      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Access Policy Rules</h3>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-500">live</span>
          </div>
        </div>
        <div id="rules-container" hx-get="rules" hx-trigger="load" hx-swap="innerHTML" className="min-h-[8rem]" />
      </div>
    </div>
  );

  if ((req as any).wrapWithLayout) {
    return wrapWithLayout(req, panel, agentId);
  }
  setHtmxSidebarSelect(req, agentId);
  return sendHtml(req, renderToString(panel));
}

/** Response after push (Git done in middleware). HTML → Toast, else JSON. */
export async function POST_SAVE(this: any, req: cds.Request) {
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
