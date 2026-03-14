import cds from "@sap/cds";
import { render } from "#cds-ssr";
import getOctokit from "./git-handler/git-handler";

const GIT = { owner: "AIAM", repo: "policies" };

// ─── Data ─────────────────────────────────────────────────────────────────────

export async function fetchAgents(): Promise<string[]> {
  try {
    const octokit = await getOctokit();
    const { data } = await octokit.rest.repos.getContent({ ...GIT, path: "" });
    return (Array.isArray(data) ? data : [data])
      .filter((i: any) => i.type === "dir")
      .map((i: any) => i.name as string)
      .sort();
  } catch {
    return [];
  }
}

// ─── Layout components ────────────────────────────────────────────────────────

function AgentListItem({ id, active }: { id: string; active?: boolean; key?: string }) {
  return (
    <button
      hx-get={`../${id}/edit`}
      hx-target="#policy-panel"
      hx-swap="innerHTML"
      hx-push-url="true"
      className={[
        "w-full text-left px-4 py-3 rounded-lg transition-all group hover:bg-gray-100 border",
        active
          ? "bg-indigo-50 border-indigo-200 text-indigo-800"
          : "bg-transparent border-transparent text-gray-600 hover:text-gray-900",
      ].join(" ")}
    >
      <div className="flex items-center gap-2.5">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? "bg-indigo-600" : "bg-gray-400 group-hover:bg-gray-600"}`} />
        <span className="text-sm font-mono truncate" title={id}>{id}</span>
      </div>
    </button>
  );
}

function Sidebar({ agents, activeId }: { agents: string[]; activeId?: string }) {
  return (
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
          agents.map(id => <AgentListItem key={id} id={id} active={id === activeId} />)
        )}
      </nav>

      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/50">
        <p className="text-xs text-gray-500">{agents.length} agent{agents.length !== 1 ? "s" : ""}</p>
      </div>

      <script dangerouslySetInnerHTML={{
        __html: `
        document.getElementById('agent-search').addEventListener('input', function() {
          var q = this.value.toLowerCase();
          document.querySelectorAll('#agents-nav button').forEach(function(btn) {
            btn.style.display = btn.querySelector('span').textContent.toLowerCase().includes(q) ? '' : 'none';
          });
        });
      `}} />
    </aside>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-gray-500 bg-gray-50/30">
      <div className="text-5xl mb-4">🛡️</div>
      <h3 className="text-lg font-semibold text-gray-600 mb-1">Select an Agent</h3>
      <p className="text-sm text-gray-500">Choose an agent from the sidebar to manage its access policies.</p>
    </div>
  );
}

function Header() {
  return (
    <header className="h-11 flex items-center px-4 bg-[#354A5F] text-white shadow-md flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-[#0854A0] rounded flex items-center justify-center font-bold text-sm">🛡</div>
        <h1 className="text-base font-normal">AI Agent Policies</h1>
      </div>
    </header>
  );
}

export function FullPage({ agents, activeId, panelContent }: { agents: string[]; activeId?: string; panelContent: any }) {
  return (
    <div className="flex flex-col h-screen bg-gray-100 text-gray-900 overflow-hidden">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar agents={agents} activeId={activeId} />
        <main id="policy-panel" className="flex-1 overflow-y-auto bg-gray-50">{panelContent}</main>
      </div>
    </div>
  );
}

// ─── CDS handler ──────────────────────────────────────────────────────────────

export async function LIST(this: any, req: cds.Request) {
  const agents = req.data?.agents ?? await fetchAgents();

  if (!req?.http?.req.accepts("html")) {
    return (Array.isArray(agents) ? agents : []).map((id: string) => ({ agentId: id }));
  }

  return render(req, <FullPage agents={Array.isArray(agents) ? agents : []} panelContent={<EmptyState />} />);
}
