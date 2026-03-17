import cds from "@sap/cds";
import { render, sendHtml } from "#cds-ssr";
import { renderToString } from "react-dom/server";
import { wrapWithLayout, setHtmxSidebarSelect } from "./middleware.layout";

/** GET Policies/agent-123/versions/<version>/edit → panel only; middleware sets wrapWithLayout for full page. */
export async function GET(this: any, req: cds.Request) {
  const {  version, agentId } = req.data || {};
  console.log("get panel", agentId, version);
  return render(req, (
    <form className="flex flex-col min-h-[calc(100vh-2.75rem)] w-full p-6 gap-6 bg-gray-50 content-fade-in">
      <div className="flex items-center justify-between shrink-0 gap-6">
        <div className="relative min-w-0 flex-1">
          <div
            hx-get={`agents/${agentId}/versions/${version}/title`}
            hx-trigger="load"
            hx-swap="morph:outerHTML"
          >
            <div className="flex flex-col gap-2">
              <div className="skeleton h-6 w-48" />
              <div className="flex gap-4">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-4 w-16" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" id="restore-panels-btn" className="text-[11px] text-gray-500 hover:text-gray-700" title="Restore panel layout">Restore layout</button>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[11px] text-gray-500">Live</span>
          </span>
        </div>
        <div className="relative flex items-center gap-3 shrink-0">
          <div
            hx-get={`agents/${agentId}/versions/${version}/publisher`}
            hx-swap="outerHTML"
            hx-trigger="load"
          >
            <div className="skeleton h-9 w-24 rounded-xl" />
          </div>
        </div>
      </div>
      <div id="agent-panels-wrap" className="flex-1 flex flex-col lg:flex-row min-h-0 gap-0 overflow-hidden">
      
        {/* Col 1: Resources + Landscape */}
        <div id="panel-resources" className="flex flex-col gap-6 min-h-0 min-w-0 overflow-hidden border-r-0 lg:border-r border-gray-200 rounded-xl lg:rounded-none border border-gray-200 lg:border-0 lg:border-r">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-0 flex-1">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Resources</h3>
              <button type="button" data-panel-toggle="0" className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700" title="Toggle panel">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 flex-1 min-h-0 overflow-y-auto relative">
              <div
                id="resources-pane-container"
                hx-get={`agents/${agentId}/versions/${version}/resources/pane`}
                hx-swap="innerHTML"
                hx-trigger="load"
              >
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
                      <div className="skeleton w-10 h-10 rounded-full shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="skeleton h-4 w-32" />
                        <div className="skeleton h-3 w-24" />
                      </div>
                      <div className="skeleton w-11 h-6 rounded-full shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="shrink-0 [&:has(#connect-picker-slot:empty)]:hidden">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Landscape</h3>
                <p className="text-xs text-gray-500">Connect your agent to the services in your landscape</p>
              </div>
              <div
                id="connect-picker-slot"
                className="p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 max-h-48"
                hx-get="agents/{agent}/versions/{version}/resources/connecter"
                hx-trigger="load, connect from:body"
                hx-swap="morph:innerHTML"
                hx-vals="js:{ agent: event?.detail?.agent, version: event?.detail?.version }"
              >
                <div className="space-y-2">
                  <div className="skeleton h-3 w-48 mb-3" />
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
                      <div className="skeleton w-9 h-9 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton h-4 w-28" />
                        <div className="skeleton h-3 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Col 2: Policy */}
        <div id="panel-policy" className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-0 min-w-0 border-r-0 lg:border-r border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Restrict</h3>
            <button type="button" data-panel-toggle="1" className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700" title="Toggle panel">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="p-5 flex-1 min-h-0 overflow-y-auto relative">
            <div
              id="rules-container"
              hx-get={`agents/${agentId}/versions/${version}/rules`}
              hx-swap="outerHTML"
              hx-trigger="load"
            >
              <div className="space-y-5">
                <div className="skeleton h-4 w-32 mb-3" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 rounded-xl bg-gray-50 border border-gray-200" />
                  ))}
                </div>
                <div className="pt-5 border-t border-gray-200">
                  <div className="skeleton h-3 w-24 mb-3" />
                  <div className="skeleton h-24 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Col 3: Test + Use */}
        <div id="panel-test" className="flex flex-col gap-6 min-h-0 min-w-0 overflow-hidden">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-0 flex-1">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Test</h3>
              <button type="button" data-panel-toggle="2" className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700" title="Toggle panel">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 flex-1 min-h-0 overflow-y-auto relative">
              <div
                id="test-pane-container"
                hx-get={`agents/${agentId}/versions/${version}/test`}
                hx-swap="innerHTML"
                hx-trigger="load"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex gap-2">
                    <div className="skeleton h-10 w-20 rounded-xl" />
                    <div className="skeleton h-10 w-20 rounded-xl" />
                  </div>
                  <div>
                    <div className="skeleton h-3 w-16 mb-2" />
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => <div key={i} className="skeleton h-4 w-full" />)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col shrink-0">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Use</h3>
            </div>
            <div className="p-5 min-h-0 overflow-y-auto relative">
              <div
                id="use-pane-container"
                hx-get={`agents/${agentId}/versions/${version}/use`}
                hx-swap="innerHTML"
                hx-trigger="load"
              >
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="skeleton h-3 w-40 mb-2" />
                    <div className="flex gap-2">
                      <div className="skeleton flex-1 h-9 rounded-lg" />
                      <div className="skeleton w-16 h-9 rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <div className="skeleton h-3 w-24 mb-2" />
                    <div className="flex gap-2">
                      <div className="skeleton flex-1 h-9 rounded-lg" />
                      <div className="skeleton w-16 h-9 rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `
(function(){
  var STORAGE_KEY = 'agent-panels-sizes';
  function initSplit() {
    var wrap = document.getElementById('agent-panels-wrap');
    if (!wrap || !window.Split || window.innerWidth < 1024) return;
    if (wrap.querySelector('.gutter')) return;
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch(e){}
    var sizes = saved || [33, 34, 33];
    window._agentPanelsSplit = Split(['#panel-resources', '#panel-policy', '#panel-test'], {
      sizes: sizes,
      minSize: [0, 0, 0],
      gutterSize: 8,
      direction: 'horizontal',
      elementStyle: function(dim, size, gutterSize) {
        return { 'flex-basis': 'calc(' + size + '% - ' + gutterSize + 'px)' };
      },
      gutterStyle: function(dim, gutterSize) {
        return { 'flex-basis': gutterSize + 'px' };
      },
      onDragEnd: function(sizes) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes)); } catch(e){}
      }
    });
  }
  function onReady() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSplit);
    } else {
      initSplit();
    }
  }
  document.body.addEventListener('htmx:afterSettle', function(){ setTimeout(initSplit, 0); });
  onReady();
  document.body.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-panel-toggle]');
    if (btn && window._agentPanelsSplit) {
      var idx = parseInt(btn.getAttribute('data-panel-toggle'), 10);
      window._agentPanelsSplit.collapse(idx);
      return;
    }
    if (e.target.id === 'restore-panels-btn' && window._agentPanelsSplit) {
      window._agentPanelsSplit.setSizes([33, 34, 33]);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([33, 34, 33])); } catch(e){}
    }
  });
})();
      ` }} />
    </form>
  ));
}

export async function Title(this: any, req: cds.Request) {
  const { agent, agentId, version } = req.data;
  const { id, title, name, description, location, tags } = agent || {}
  console.log("Title-get", req.data);
  return render(req, (
    <div
      className="relative flex flex-col gap-1 min-w-0 content-fade-in"
      hx-get={`agents/{agent}/versions/{version}/title`}
      hx-vals="js:{ version: event?.detail?.version, agent: event?.detail?.agent }"
      hx-trigger="agentSelected from:body"
      hx-swap="innerHTML"
    >
      <h2 className="text-xl font-bold text-gray-900 font-mono truncate" >
        {name}
      </h2>
      <div className="flex items-center gap-4 text-sm flex-wrap min-w-0">
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="text-gray-500">id:</span>
          <span className="font-mono text-gray-700 truncate max-w-[12rem]" title={id}>{id || agentId}</span>
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          <span className="text-gray-500">version:</span>
          <span className="font-mono text-gray-700 truncate max-w-[8rem]" title={version}>{version}</span>
        </span>
        {description && <span className="flex items-center gap-1.5 shrink-0">
          <span  className="text-gray-500">intent:</span>
          <p className="font-mono text-gray-700 truncate max-w-[12rem]" title={description}>{description}</p>
        </span>}
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
