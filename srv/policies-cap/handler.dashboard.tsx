import cds from "@sap/cds";
import { render } from "#cds-ssr";

/** GET /admin/dashboard() or /admin/policies → layout inline: sidebar [hx-get=agents], policy pane (empty state). */
export async function DASHBOARD(this: any, req: cds.Request) {
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
        <aside
          id="agents-sidebar"
          className="flex flex-col w-64 flex-shrink-0 border-r border-gray-200 bg-white h-full overflow-hidden shadow-sm"
          hx-get="agents"
          hx-trigger="load"
          hx-swap="innerHTML"
        >
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>
        </aside>
        <main hx-swap-oob="innerHTML:#policy-panel" hx-swap="innerHTML" id="policy-panel" className="flex-1 overflow-y-auto bg-gray-50">
          <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-gray-500 bg-gray-50/30">
            <div className="text-5xl mb-4">🛡️</div>
            <h3 className="text-lg font-semibold text-gray-600 mb-1">Select an Agent</h3>
            <p className="text-sm text-gray-500">Choose an agent from the sidebar to manage its access policies.</p>
          </div>
        </main>
        <div id="test-swap" hx-get="agents/${agentId}/panel"
            hx-trigger="agentSelected"
            hx-swap="innerHTML" />
      </div>
      <script dangerouslySetInnerHTML={{ __html: `
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
      ` }} />
    </div>
  );
}
