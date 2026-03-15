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
    <div className="flex flex-col h-screen bg-gray-100 text-gray-900 overflow-hidden" {...(activeAgentId ? { "data-active-agent": activeAgentId } : {})}>
      <header className="h-11 flex items-center px-4 bg-[#354A5F] text-white shadow-md flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#0854A0] rounded flex items-center justify-center font-bold text-sm">🛡</div>
          <h1 className="text-base font-normal">AI Agent Policies</h1>
        </div>
      </header>
      <div className="flex-1 min-h-0 flex">
        <aside
          id="agents-sidebar"
          className="flex flex-col w-64 flex-shrink-0 border-r border-gray-200 bg-white h-full overflow-hidden shadow-sm"
          hx-get="list()"
          hx-trigger="load"
          hx-swap="innerHTML"
        >
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>
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
