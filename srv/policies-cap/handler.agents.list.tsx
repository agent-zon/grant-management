import cds from "@sap/cds";
import { render, sendHtml } from "#cds-ssr";
import { renderToString } from "react-dom/server";
import getOctokit from "./git-handler/git-handler";


/** GET agents → JSON or full list page (handler = route UI) */
export async function LIST(this: any, req: cds.Request, next: Function) {
  const { agentId ,agents} = req.data;
  console.log("agentId", agentId);

  if (!req?.http?.req.accepts("html")) {
    return agents;
  }
  if(agentId) {
    req.http.res.header("HX-Trigger-After-Settle",  JSON.stringify({ agent: { id: agentId } }));
  }

  console.log(req.path, req.target.name, req.http?.req.path, req.http?.req.url, req.http?.req.originalUrl);
  // remove the service name from the path 
  return render(
    req,
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
      <nav   id="agents-nav" className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 bg-white"
              hx-get="agents/${agentId}/panel"
              hx-trigger="itemSelected"
              hx-target="#policy-panel"
              hx-swap="innerHTML">
        {agents.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-8">No agents found</p>
        ) : (
          agents.map((id: string) => (
            <button
              key={id}
              hx-get={`${req.http?.req.originalUrl}/${id}/panel`}
              hx-target="#policy-panel"
              hx-swap="innerHTML"
              hx-push-url="true"
              hx-trigger="click"
              className="w-full text-left px-4 py-3 rounded-lg transition-all group hover:bg-gray-100 border bg-transparent border-transparent text-gray-600 hover:text-gray-900"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-400 group-hover:bg-gray-600" />
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
      <script dangerouslySetInnerHTML={{
        __html: `
        document.body.addEventListener('sidebarSelect', function(evt) {
          var id = evt.detail;
          document.querySelectorAll('#agents-nav [data-agent-id]').forEach(function(el) {
            var active = el.getAttribute('data-agent-id') === id;
            el.classList.toggle('bg-indigo-50', active);
            el.classList.toggle('border-indigo-200', active);
            el.classList.toggle('text-indigo-800', active);
            el.querySelector('.w-2.h-2').classList.toggle('bg-indigo-600', active);
            el.querySelector('.w-2.h-2').classList.toggle('bg-gray-400', !active);
          });
        });
      ` }} />
    </aside>



  );
}
