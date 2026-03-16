import cds from "@sap/cds";
import { render, sendHtml } from "#cds-ssr";
import { renderToString } from "react-dom/server";
import { wrapWithLayout, setHtmxSidebarSelect } from "./middleware.layout";

/** GET Policies/agent-123/versions/<version>/edit → panel only; middleware sets wrapWithLayout for full page. */
export async function GET(this: any, req: cds.Request) {
  const { agentId, version } = req.data || {};
  console.log("get panel", agentId,version);
  if(!version) {
      console.error("version is not set", req?.http?.req.params);
  }
  return render(req, (
    <form className="flex flex-col h-full p-6 space-y-5 max-w-3xl mx-auto bg-gray-50" >
      <div className="flex items-start justify-between *:flex *:items-center *:gap-3">
        <div hx-get={`agents/${agentId}/title`}
          hx-trigger="load "
          hx-swap="outerHTML" />

        <div
          className="flex items-center gap-3 [button]:flex [button]:items-center [button]:gap-2 [button]:px-4 [button]:py-2 [button]:bg-indigo-600 [button]:hover:bg-indigo-700 [button]:text-white [button]:text-sm [button]:font-medium [button]:rounded-lg [button]:transition-colors [button]:shadow-sm"
          hx-get={`agents/${agentId}/versions/${version}/publisher`}
          hx-swap="outerHTML"
          hx-trigger="load "></div>


      </div>
      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Access Policy Rules</h3>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-500">live</span>
          </div>
        </div>
        <div id="rules-container"
          hx-get={`agents/${agentId}/versions/${version}/rules`}
          hx-swap="outerHTML"
          hx-trigger="load "
          className="min-h-[8rem]" />
      </div>
    </form>
  ));
}

export async function Title(this: any, req: cds.Request) {
  const { agentId, version } = req.data;
  return render(req, <div className="flex items-center justify-between"
    hx-get="agents/{agent}/versions/{version}/title"
    hx-vals={`js:{ version: event?.detail?.version,agent: event?.detail?.agent}`}
    hx-trigger="agentSelected from:body"
    hx-swap="innerHTML"
  >
    <h2 className="text-xl font-bold text-gray-900 font-mono">{agentId}</h2>
    <div className="flex items-center gap-2 mt-1">
      <span className="text-sm text-gray-500">version:</span>
      <span className="text-sm font-mono text-gray-700">{version}</span>
    </div>
  </div>);
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
