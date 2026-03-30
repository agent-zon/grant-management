import cds from "@sap/cds";
import type { ReactNode } from "react";
import { render } from "#cds-ssr";

/** Before edit: set req.wrapWithLayout so handler can wrap with full layout when not HTMX. */
export default function layoutWrapMiddleware(this: any, req: cds.Request) {
  const isHtmx = req?.http?.req?.headers?.["hx-request"] === "true";
  (req as any).wrapWithLayout = !isHtmx;
}

const sidebarSelectScript = `
  document.body.addEventListener('sidebarSelect', function(evt) {
    var id = evt.detail;
    document.querySelectorAll('#agents-nav [data-agent-id]').forEach(function(el) {
      var active = el.getAttribute('data-agent-id') === id;
      el.classList.toggle('bg-indigo-50', active);
      el.classList.toggle('border-indigo-200', active);
      el.classList.toggle('text-indigo-800', active);
      var dot = el.querySelector('.w-2.h-2');
      if (dot) { dot.classList.toggle('bg-indigo-600', active); dot.classList.toggle('bg-gray-400', !active); }
    });
  });
  document.body.addEventListener('htmx:afterSwap', function(evt) {
    if (evt.detail.target.id === 'agents-sidebar') {
      var wrap = document.getElementById('agents-sidebar') && document.getElementById('agents-sidebar').closest('[data-active-agent]');
      if (wrap) {
        var id = wrap.getAttribute('data-active-agent');
        if (id) document.body.dispatchEvent(new CustomEvent('sidebarSelect', { detail: id }));
      }
    }
  });
`;

/** Dashboard layout shell: header + sidebar [hx-get=list()] + main. activeAgentId optional for full-page edit. */
function Layout({ children, activeAgentId }: { children: ReactNode; activeAgentId?: string }) {
  return (
    <div
      className="flex flex-col h-screen bg-gray-100 text-gray-900 overflow-hidden"
      {...(activeAgentId ? { "data-active-agent": activeAgentId } : {})}
    >
      <header className="h-11 flex items-center px-4 bg-[#354A5F] text-white shadow-md flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#0854A0] rounded flex items-center justify-center font-bold text-sm">🛡</div>
          <h1 className="text-base font-normal">AI Agent Policies</h1>
        </div>
      </header>
      <div className="flex-1 min-h-0 flex">
        <aside
          id="agents-sidebar"
          className="relative flex flex-col w-64 flex-shrink-0 border-r border-gray-200 bg-white h-full overflow-hidden shadow-sm"
          hx-get="list()"
          hx-trigger="load"
          hx-swap="innerHTML"
        >
          <div className="px-4 py-4 border-b border-gray-200 bg-gray-50/50">
            <div className="skeleton h-3 w-20 mb-3" />
            <div className="skeleton h-8 w-full rounded-lg" />
          </div>
          <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-lg">
                <div className="skeleton w-9 h-9 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton h-3 w-16" />
                </div>
              </div>
            ))}
          </nav>
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="skeleton h-3 w-16" />
          </div>
        </aside>
        <main id="policy-panel" className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>
      <script dangerouslySetInnerHTML={{ __html: sidebarSelectScript }} />
    </div>
  );
}

/** Wrap panel content in full layout. When activeAgentId is set, layout gets data-active-agent so script highlights agent after sidebar loads. */
export async function wrapWithLayout(req: cds.Request, panelContent: ReactNode, activeAgentId?: string) {
  return render(req, <Layout activeAgentId={activeAgentId}>{panelContent}</Layout>);
}

/**
 * Add htmx response headers so the client can select the active agent in the list.
 * @see https://htmx.org/docs/#response-headers
 * HX-Trigger: sidebarSelect so the agent list highlights the current agent.
 */
export function setHtmxSidebarSelect(req: cds.Request, agentId: string) {
  addHtmxAgentSelectHeaders(req, agentId);
}

function addHtmxAgentSelectHeaders(req: cds.Request, agentId?: string) {
  const res = req?.http?.res;
  if (res && agentId) {
    res.set("HX-Trigger", JSON.stringify({ sidebarSelect: agentId }));
  }
}
