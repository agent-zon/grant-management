import cds from "@sap/cds";
import yaml from "js-yaml";
import getOctokit from "./git-handler/git-handler";
import { render } from "#cds-ssr";
import { GIT } from "./handler.policy";
import { loadMcpCards } from "./handler.policy.constraints";

type ToolInfo = { name: string; title?: string; description?: string; server: string };

/** Extract tools from all MCP cards for an agent. */
async function getAgentTools(agentId: string, ref: string): Promise<ToolInfo[]> {
  const octokit = await getOctokit();
  let cards: { name: string; content: string }[] = [];
  try {
    cards = await loadMcpCards(octokit, agentId, ref);
  } catch {
    return [];
  }
  const tools: ToolInfo[] = [];
  for (const { name: cardName, content } of cards) {
    try {
      const card = yaml.load(content) as any;
      const serverTitle = card?.serverInfo?.title ?? card?.serverInfo?.name ?? cardName.replace(/\.(yaml|yml)$/i, "");
      const list = Array.isArray(card?.tools) ? card.tools : [];
      for (const t of list) {
        tools.push({
          name: t.name ?? "",
          title: t.title ?? t.name,
          description: t.description,
          server: serverTitle,
        });
      }
    } catch {
      /* skip */
    }
  }
  return tools.sort((a, b) => (a.server + ":" + a.name).localeCompare(b.server + ":" + b.name));
}

/** GET .../test → Test pane: view tools, chat, act as. */
export async function TEST(this: any, req: cds.Request) {
  const { agentId, version } = req.data || {};
  const ref = req.data?.ref ?? version ?? "main";
  const tools = await getAgentTools(agentId ?? "", ref);

  const protocol = req.http?.req?.protocol || "https";
  const host = req.http?.req?.headers?.host || "localhost";
  const baseUrl = `${protocol}://${host}`;
  const chatUrl = `${baseUrl}/chat`;
  const actAsUrl = `${baseUrl}/chat?agent=${agentId}&version=${version}`;

  return render(
    req,
    <div className="flex flex-col gap-4 content-fade-in">
      <div className="flex gap-2 flex-wrap">
        <a
          href={chatUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-sm font-medium border border-indigo-200 transition-colors"
        >
          <span>💬</span> Chat
        </a>
        <a
          href={actAsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-medium border border-amber-200 transition-colors"
        >
          <span>🎭</span> Act as
        </a>
      </div>
      <div>
      <div
          id="tools-section"
          className="relative space-y-5 content-fade-in"
          hx-get={`agents/{agent}/versions/{version}/tools`}
          hx-vals="js:{ version: event?.detail?.version, agent: event?.detail?.agent }"
          hx-trigger="agentSelected from:body"
          hx-swap="innerHTML"
          hx-select="#tools-section"
        >
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Tools ({tools.length})</h4>
        {tools.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">No tools from MCP resources.</p>
        ) : (
          <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {tools.map((t, i) => (
              <li key={`${t.server}-${t.name}-${i}`} className="flex items-start gap-2 text-sm">
                <span className="font-mono text-indigo-600 shrink-0">{t.name}</span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-700 truncate" title={t.description}>{t.title || t.name}</span>
                <span className="text-gray-400 text-xs shrink-0">({t.server})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>
    </div>
  );
}
