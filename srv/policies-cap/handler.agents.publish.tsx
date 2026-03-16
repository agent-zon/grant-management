import cds from "@sap/cds";
import { render, sendHtml } from "#cds-ssr";
import { renderToString } from "react-dom/server";
import { mergeBranchToMain } from "./middleware.policy.push";

/** GET Policies/agent-123/versions/<version>/edit → panel only; middleware sets wrapWithLayout for full page. */
export async function GET(this: any, req: cds.Request) {
  const { agentId, version } = req.data;
  return render(req, (
    <div className="flex flex-col h-full p-6 space-y-5 max-w-3xl mx-auto bg-gray-50"
      hx-get={`agents/{agent}/versions/{version}/publisher`}
      hx-vals={`js:{ version: event?.detail?.version,agent: event?.detail?.agent}`}
      hx-swap="outerHTML"
      hx-trigger="agentSelected from:body"
    >
    <div className="flex items-center gap-3">
        <div id="publish-toast" />
        <button
          hx-post={`agents/${agentId}/versions/${version || "main"}/publish`}
          hx-ext="json-enc"
          hx-include="[name=odrl]"
          hx-swap="outerHTML"
          hx-target="#publish-toast"
          type="submit"
          hx-params="odrl"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <span>💾</span> Publish
        </button>
      </div>
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
