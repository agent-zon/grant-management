import cds from "@sap/cds";
import { render, sendHtml } from "#cds-ssr";
import { renderToString } from "react-dom/server";
import { fetchAgents } from "./handler.agents.list";

/** GET Policies/agent-123/versions/<version>/edit → render policy editor */
export async function GET_EDIT(this: any, req: cds.Request) {
  const { agentId, version } = req.data;
  const v = version || "main";
  const isHtmx = req?.http?.req?.headers?.["hx-request"] === "true";

  const panel = (
    <div className="flex flex-col h-full p-6 space-y-5 max-w-3xl mx-auto bg-gray-50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-indigo-600 uppercase tracking-widest font-medium mb-0.5">Policy Editor</p>
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

  if (isHtmx) return sendHtml(req, renderToString(panel));

  const agents = req.data?.agents || [];
  return render(
    req,
    <div className="flex flex-col h-screen bg-gray-100 text-gray-900 overflow-hidden">
      <header className="h-11 flex items-center px-4 bg-[#354A5F] text-white shadow-md flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#0854A0] rounded flex items-center justify-center font-bold text-sm">🛡</div>
          <h1 className="text-base font-normal">AI Agent Policies</h1>
        </div>
      </header>
      <div className="flex-1 min-h-0 flex">
        <aside className="flex flex-col w-64 flex-shrink-0 border-r border-gray-200 bg-white h-full overflow-hidden shadow-sm">
          <div className="px-4 py-4 border-b border-gray-200 bg-gray-50/50">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Agents</h2>
            <input
              id="agent-search"
              type="search"
              placeholder="Filter agents…"
              className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg px-3 py-1.5 placeholder-gray-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <nav id="agents-nav" className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 bg-white">
            {agents.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-8">No agents found</p>
            ) : (
              agents.map((id: string) => (
                <button
                  key={id}
                  hx-get={`${id}/edit`}
                  hx-target="#policy-panel"
                  hx-swap="innerHTML"
                  hx-push-url="true"
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all group hover:bg-gray-100 border ${id === agentId ? "bg-indigo-50 border-indigo-200 text-indigo-800" : "bg-transparent border-transparent text-gray-600 hover:text-gray-900"}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${id === agentId ? "bg-indigo-600" : "bg-gray-400 group-hover:bg-gray-600"}`} />
                    <span className="text-sm font-mono truncate" title={id}>{id}</span>
                  </div>
                </button>
              ))
            )}
          </nav>
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/50">
            <p className="text-xs text-gray-500">{agents.length} agent{agents.length !== 1 ? "s" : ""}</p>
          </div>
          <script dangerouslySetInnerHTML={{ __html: `document.getElementById('agent-search').addEventListener('input',function(){var q=this.value.toLowerCase();document.querySelectorAll('#agents-nav button').forEach(function(btn){btn.style.display=btn.querySelector('span').textContent.toLowerCase().includes(q)?'':'none';});});` }} />
        </aside>
        <main id="policy-panel" className="flex-1 overflow-y-auto bg-gray-50">{panel}</main>
      </div>
    </div>
  );
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
