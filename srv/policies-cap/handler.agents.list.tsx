import cds from "@sap/cds";
import { render, sendHtml } from "#cds-ssr";
import { renderToString } from "react-dom/server";
import getOctokit from "./git-handler/git-handler";
import { versionFromRequest } from "./git-version";


/** GET agents → JSON or full list page (handler = route UI) */
export async function LIST(this: any, req: cds.Request, next: Function) {
  const { agentId, agents } = req.data;
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
              hx-trigger="load "
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
     
    </>



  );
}


export async function AgentCard({ agentId, isSelected, name, description, location, tags }: { agentId: string, isSelected: boolean, name: string, description: string, location: string, tags: { key: string, value: string }[] }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-600">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`font-semibold text-gray-900 truncate ${isSelected ? "text-indigo-800" : ""}`}>
            {name}
          </span>
          <span className={`flex-shrink-0 text-indigo-600 agent-check ${isSelected ? "" : "hidden"}`} aria-hidden>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </span>
        </div>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{description}</p>
        )}
        {location && (
          <p className="text-[11px] text-gray-400 mt-1">{location}</p>
        )}
        {tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.slice(0, 4).map((t) => (
              <span key={t.key} className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-[10px] text-gray-600 font-medium">
                {t.key}:{t.value}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="text-[10px] text-gray-400">+{tags.length - 4}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export async function SELECTOR(req: cds.Request) {
  const { agent, agents } = req.data;
  const { id, name, description, location, tags } = agent || {}
  return render(
    req,
    <button
      type="button"
      id={`selector-${id}`}
      data-agent-id={id}
      hx-post={`${req.http?.req.originalUrl.replace(/selector/, 'select')}`}
      hx-trigger="click"
      hx-swap="outerHTML"
      hx-push-url="false"
      hx-target={`#selector-name-${id}`}
      className={`w-full text-left px-4 py-3 rounded-lg transition-all group hover:bg-gray-100 border text-gray-600 hover:text-gray-900  bg-transparent border-transparent`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-600">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><rect width="20" height="14" x="2" y="6" rx="2" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2  transition-all duration-300 ease-in-out" id={`selector-name-${id}`}>
            <span className={`font-semibold text-gray-900 truncate `}>
              {name || id}
            </span>
          </div>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{description}</p>
          )}
          {location && (
            <p className="text-[11px] text-gray-400 mt-1">{location}</p>
          )}
          {tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.slice(0, 4).map((t) => (
                <span key={t.key} className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-[10px] text-gray-600 font-medium">
                  {t.key}:{t.value}
                </span>
              ))}
              {tags.length > 4 && (
                <span className="text-[10px] text-gray-400">+{tags.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}


export async function SELECT(this: any, req: cds.Request) {
  const { agent } = req.data;
  const { id, name } = agent || {}
  const version = versionFromRequest(req);
  req.http?.res.header("HX-Trigger", JSON.stringify({ agentSelected: { agent: id, version: version }, }));
  req.http?.res.header("HX-Push-Url", `${req.http?.req.originalUrl.replace(/select/, '')}`);

  return render(
    req,
    <div className="flex items-center justify-between gap-2 transition-all  ease-in-out " hx-get={`${req.http?.req.originalUrl.replace(/select/, 'selector')}`} hx-trigger="agentSelected from:body" hx-swap="outerHTML" hx-push-url="false" hx-target={`#selector-${id}`}>
      <span className={`font-semibold text-gray-900 truncate  text-indigo-800`}>
        {name || id}
      </span>
      <span className={`flex-shrink-0 text-indigo-600 agent-check `} aria-hidden>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      </span>
    </div>
  );
}
