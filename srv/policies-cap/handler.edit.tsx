import cds from "@sap/cds";
import { render, sendHtml } from "#cds-ssr";
import { renderToString } from "react-dom/server";
import getOctokit from "./git-handler/git-handler";
import { encodeTarget, fetchGitFile, rulesUrl, safeJson, type PolicyRule } from "./handler.rules";
import { FullPage, fetchAgents } from "./handler.list";

const GIT = { owner: "AIAM", repo: "policies" };
const BASE = "/policies/AgentPolicies";

// ─── Data helpers ─────────────────────────────────────────────────────────────

function rulesToOdrl(rules: PolicyRule[]) {
  const permission: any[] = [];
  const prohibition: any[] = [];

  for (const rule of rules) {
    const entry: any = {
      target: rule.target,
      action: "use",
      _metadata: { targetType: rule.targetType, targetName: rule.targetName },
    };
    if (rule.constraint && rule.constraintValue) {
      entry.constraint = [{ leftOperand: `sap:${rule.constraint}`, operator: "isPartOf", rightOperand: [rule.constraintValue] }];
    }
    if (rule.actionType === "deny") {
      prohibition.push(entry);
    } else {
      if (rule.actionType === "ask") { entry.duty = [{ action: "sap:obtainConsent" }]; entry.priority = 160; }
      permission.push(entry);
    }
  }
  return {
    "@context": ["http://www.w3.org/ns/odrl.jsonld", { sap: "https://sap.com/odrl/extensions/" }],
    "@type": "Set",
    permission,
    prohibition,
  };
}

// ─── AgentPanel component ─────────────────────────────────────────────────────

export function AgentPanel({ agentId }: { agentId: string }) {
  return (
    <div className="flex flex-col h-full p-6 space-y-5 max-w-3xl mx-auto bg-gray-50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-indigo-600 uppercase tracking-widest font-medium mb-0.5">Policy Editor</p>
          <h2 className="text-xl font-bold text-gray-900 font-mono">{agentId}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Access policy rules</p>
        </div>

        <div className="flex items-center gap-3">
          <div id="save-toast" />
          <button
            hx-post={BASE}
            hx-ext="json-enc"
            hx-include="[name=agentId],[name=rules]"
            hx-target="#save-toast"
            hx-swap="outerHTML"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <span>💾</span> Save Policies
          </button>
        </div>
      </div>

      <input type="hidden" name="agentId" value={agentId} />

      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Access Policy Rules</h3>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-500">live</span>
          </div>
        </div>
        <div
          id="rules-container"
          hx-get={"rules"}
          hx-trigger="load"
          hx-swap="innerHTML"
          hx-target="this"
          className="min-h-[8rem]"
        />
        <datalist
          id="resources-datalist"
          hx-get={"resources"}
          hx-trigger="load"
          hx-swap="innerHTML"
        />
      </div>
    </div>
  );
}

// ─── Toast fragments ──────────────────────────────────────────────────────────

function Toast({ ok, agentId, message }: { ok: boolean; agentId?: string; message?: string }) {
  return ok ? (
    <div id="save-toast" className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg">
      <span>✅</span><span>Committed to Git for <strong>{agentId}</strong></span>
    </div>
  ) : (
    <div id="save-toast" className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
      <span>❌</span><span>{message || "Save failed"}</span>
    </div>
  );
}

// ─── CDS handlers ─────────────────────────────────────────────────────────────

/** GET single agent → render policy editor; fall through to LIST for collection */
export async function GET(this: any, req: cds.Request, next: Function) {
  const { agentId } = req.params[0];

  if (!req?.http?.req.accepts("html")) {
    const savedRaw = await getOctokit().then(o => fetchGitFile(o, `${agentId}/policies.json`));
    return { agentId, policies: savedRaw };
  }

  const panel = <AgentPanel agentId={agentId} />;
  const isHtmx = req?.http?.req.headers?.["hx-request"] === "true";

  if (isHtmx) return sendHtml(req, renderToString(panel));

  const agents = await fetchAgents();
  return render(req, <FullPage agents={agents} activeId={agentId} panelContent={panel} />);
}

/** POST → convert rules to ODRL and commit policies.json to Git */
export async function POST(this: any, req: cds.Request) {
  const { agentId, rules: rulesJson } = req.data as any;
  if (!agentId) { req.error(400, "agentId is required"); return; }

  try {
    const octokit = await getOctokit();
    const filePath = `${agentId}/policies.json`;
    const content = JSON.stringify(rulesToOdrl(safeJson(rulesJson, [])), null, 2);

    let sha: string | undefined;
    try { sha = ((await octokit.rest.repos.getContent({ ...GIT, path: filePath })).data as any).sha; } catch { /* new file */ }

    await octokit.rest.repos.createOrUpdateFileContents({
      ...GIT,
      path: filePath,
      message: `Update policies for agent ${agentId}`,
      content: Buffer.from(content, "utf8").toString("base64"),
      ...(sha ? { sha } : {}),
    });

    if (req?.http?.req.accepts("html")) {
      return sendHtml(req, renderToString(<Toast ok agentId={agentId} />));
    }
    return { agentId, committed: true };
  } catch (err: any) {
    if (req?.http?.req.accepts("html")) {
      return sendHtml(req, renderToString(<Toast ok={false} message={err.message} />));
    }
    req.error(500, err.message);
  }
}
