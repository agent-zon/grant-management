import cds from "@sap/cds";
import { render, sendHtml } from "#cds-ssr";
import { renderToString } from "react-dom/server";
import { mergeBranchToMain } from "./middleware.policy.push";

/** GET .../publisher → Publish button + toast slot. */
export async function GET(this: any, req: cds.Request) {
  const { agentId, version } = req.data;
  return render(req, (
    <div
      className="relative flex items-center gap-3 content-fade-in"
      hx-get={`agents/{agent}/versions/{version}/publisher`}
      hx-vals="js:{ version: event?.detail?.version, agent: event?.detail?.agent }"
      hx-swap="outerHTML"
      hx-trigger="agent-selected from:body"
    >
      <div id="publish-toast" className="min-w-0" />
      <button
        hx-post={`agents/${agentId}/versions/${version || "main"}/publish`}
        hx-ext="json-enc"
        hx-include="[name=dcn]"
        hx-swap="outerHTML"
        hx-target="#publish-toast"
        type="submit"
        hx-params="dcn"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Publish
      </button>
    </div>
  ));
}
 

/** Response after push (Git done in middleware). Merges version branch into main, then returns toast or JSON. */
export async function POST(this: any, req: cds.Request) {
  const { agentId, version } = req.data || {};
  await mergeBranchToMain(version || "main");
  if (req?.http?.req.accepts("html")) {
    return sendHtml(
      req,
      renderToString(
        <div id="save-toast" className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg">
          <span>✅</span><span>Changes pushed for <strong>{agentId}</strong> as version <strong>{version}</strong> and merged to main</span>
        </div>
      )
    );
  }
  return { agentId, version, committed: true, mergedToMain: true };
}
