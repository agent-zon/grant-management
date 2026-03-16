import cds from "@sap/cds";
import { render, sendHtml } from "#cds-ssr";
import { renderToString } from "react-dom/server";
import getOctokit from "./git-handler/git-handler";
import { versionFromRequest } from "./git-version";


/** GET agents → JSON or full list page (handler = route UI) */
export async function LIST(this: any, req: cds.Request, next: Function) {
  const { agentId ,agents} = req.data;
  console.log("agentId", agentId);

  if (!req?.http?.req.accepts("html")) {
    return agents;
  }
  if (agentId) {
    req.http.res.header("HX-Trigger-After-Swap", JSON.stringify({ agentSelected: { agent: agentId }, }));
    // req.http.res.header("HX-Trigger", JSON.stringify({ agentSelected: { agent: agentId }, }));

    // req.http.res.header("HX-Trigger-After-Settle", JSON.stringify({ agentSelected: { agent: agentId }, }));
  }

  console.log(req.path, req.target.name, req.http?.req.path, req.http?.req.url, req.http?.req.originalUrl);
  // remove the service name from the path 
  return render(
    req,
    <>
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
            <div key={id}
            hx-get={`${req.http?.req.originalUrl}/${id}/selector`}
            hx-trigger="load"
            hx-push-url="false"
            hx-swap="outerHTML">
            </div> 
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
            el.classList.toggle('bg-transparent', !active);
            el.classList.toggle('border-transparent', !active);
            var dot = el.querySelector('.w-2.h-2');
            if (dot) { dot.classList.toggle('bg-indigo-600', active); dot.classList.toggle('bg-gray-400', !active); }
          });
        });
      ` }} />
    </>



  );
}


export async function SELECTOR(this: any, req: cds.Request) {
  const { agentId } = req.data;
  return render(
    req,
    <button
      type="button"
      data-agent-id={agentId}
      hx-post={`${req.http?.req.originalUrl.replace(/selector/, 'select')}`}
      hx-trigger="click"
      hx-swap="outerHTML"
      hx-push-url="false"
     className={`w-full text-left px-4 py-3 rounded-lg transition-all group hover:bg-gray-100 border text-gray-600 hover:text-gray-900 ${agentId === agentId ? "bg-indigo-50 border-indigo-200 text-indigo-800" : "bg-transparent border-transparent"}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-transparent border-transparent" />
        <span className="text-sm font-mono truncate" title={agentId}>{agentId}</span>
      </div>
    </button>
  );
}


export async function SELECT(this: any, req: cds.Request) {
  const { agentId } = req.data;
  const version = versionFromRequest(req);

  req.http?.res.header("HX-Trigger", JSON.stringify({ agentSelected: { agent: agentId,version: version }, }));
  req.http?.res.header("HX-Push-Url", `${req.http?.req.originalUrl.replace(/select/, '')}`);

  return render(
    req,
    <button
      type="button"
      data-agent-id={agentId}
      hx-get={`${req.http?.req.originalUrl.replace(/select/, 'selector')}`}
      hx-trigger="agentSelected from:body"
      hx-swap="outerHTML"
      hx-push-url="false"

      className={`w-full text-left px-4 py-3 rounded-lg transition-all group hover:bg-gray-100 border text-gray-600 hover:text-gray-900bg-indigo-50 border-indigo-200 text-indigo-800`}>
      <div className="flex items-center gap-2.5">
        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-transparent border-transparent" />
        <span className="text-sm font-mono truncate" title={agentId}>{agentId}</span>
      </div>
    </button>
  );
}
