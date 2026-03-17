import cds from "@sap/cds";
import { render } from "#cds-ssr";

/** GET /admin/dashboard() or /admin/policies → layout inline: sidebar [hx-get=agents], policy pane (empty state). */
export async function DASHBOARD(this: any, req: cds.Request) {
  return render(
    req,
    <div hx-ext="path-params" className="flex flex-col h-screen bg-gray-100 text-gray-900 overflow-hidden">
      <header className="h-11 flex items-center px-4 bg-[#354A5F] text-white shadow-md flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#0854A0] rounded flex items-center justify-center font-bold text-sm">🛡</div>
          <h1 className="text-base font-normal">Grant Management for AI Agents</h1>
        </div>
      </header>
      <div className="flex-1 min-h-0 flex">
        <aside
          id="agents-sidebar"
          className="relative flex flex-col w-64 flex-shrink-0 border-r border-gray-200 bg-white h-full overflow-hidden shadow-sm"
          hx-get="agents"
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
        <main
          id="policy-panel"
          className="relative flex-1 overflow-y-auto bg-gray-50"
          hx-get={`agents/{agent}/versions/{version}/edit`}
          hx-trigger="agentSelected from:body"
          hx-swap="outerHTML"
          hx-vals={`js:{ version: event?.detail?.version,agent: event?.detail?.agent}`}
        >
          <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-gray-500 bg-gray-50/30">
            <div className="text-5xl mb-4">🛡️</div>
            <h3 className="text-lg font-semibold text-gray-600 mb-1">Select an Agent</h3>
            <p className="text-sm text-gray-500">Choose an agent from the sidebar to manage its access policies.</p>
          </div>
        </main>
        {/* <div id="rules-container" 
            hx-get="agents/{agent}/versions/{version}/rules" 
            hx-vals={`js:{ version: event?.detail?.version,agent: event?.detail?.agent}`} 
            hx-trigger="agentSelected from:body" 
            hx-swap="innerHTML" 
            className="min-h-[8rem]" /> */}
      </div>
   
    </div>, req.http?.req.originalUrl
  )
}
