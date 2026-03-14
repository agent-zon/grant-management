import cds from "@sap/cds";
import { render, sendHtml } from "#cds-ssr";
import { renderToString } from "react-dom/server";
import getOctokit from "./git-handler/git-handler";
import { encodeTarget, fetchGitFile, safeJson, type PolicyRule } from "./handler.version.rules";
import { FullPage, fetchAgents } from "./handler.agents.view";
const GIT = { owner: "AIAM", repo: "policies" };

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

function EditPanel({ agentId, version }: { agentId: string; version: string }) {
  return (
    <div className="flex flex-col h-full p-6 space-y-5 max-w-3xl mx-auto bg-gray-50">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-indigo-600 uppercase tracking-widest font-medium mb-0.5">Policy Editor</p>
          <h2 className="text-xl font-bold text-gray-900 font-mono">{agentId}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">version:</span>
            <span className="text-sm font-mono text-gray-700">{version}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div id="save-toast" />
          <button
            hx-post={"save"}
            hx-ext="json-enc"
            hx-include="#policy-panel [name=agentId], #policy-panel [name=rules], #policy-panel [name=version]"
            hx-target="#save-toast"
            hx-swap="outerHTML"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <span>💾</span> Save Policies
          </button>
        </div>
      </div>

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
          hx-get="rules"
          hx-trigger="load"
          hx-swap="innerHTML"
          className="min-h-[8rem]"
        />

      </div>
    </div>
  );
}

/** GET AgentPolicyVersions/agent-123/versions/<version>/edit → render policy editor */
export async function GET_EDIT(this: any, req: cds.Request) {
  const { agentId, version } = req.data

  const panel = <EditPanel agentId={agentId} version={version || "main"} />;
  const isHtmx = req?.http?.req?.headers?.["hx-request"] === "true";

  if (isHtmx) return sendHtml(req, renderToString(panel));

  const agents = await fetchAgents();
  return render(req, <FullPage agents={agents} activeId={agentId} panelContent={panel} />);
}


/** Ensure branch exists; create from main if not. */
async function ensureBranchExists(octokit: any, branch: string): Promise<void> {
  if (!branch || branch === "main") return;
  try {
    await octokit.rest.repos.getBranch({ ...GIT, branch });
    return;
  } catch {
    /* branch not found, create it */
  }
  const { data: main } = await octokit.rest.repos.getBranch({ ...GIT, branch: "main" });
  await octokit.rest.git.createRef({
    ...GIT,
    ref: `refs/heads/${branch}`,
    sha: main.commit.sha,
  });
}

/** POST AgentPolicyVersions/agent-123/versions/<version>/save → commit to Git */
export async function POST_SAVE(this: any, req: cds.Request) {
  const { version, rules: rulesJson, agentId } = req.data || {};
  const ref = version || "main";

  try {
    const octokit = await getOctokit();
    await ensureBranchExists(octokit, version);

    const filePath = `${agentId}/policies.json`;
    const content = JSON.stringify(rulesToOdrl(safeJson(rulesJson, [])), null, 2);

    let sha: string | undefined;
    try { sha = ((await octokit.rest.repos.getContent({ ...GIT, path: filePath, ref })).data as any).sha; } catch { /* new file */ }

    await octokit.rest.repos.createOrUpdateFileContents({
      ...GIT,
      path: filePath,
      message: `Update policies for agent ${agentId}`,
      content: Buffer.from(content, "utf8").toString("base64"),
      ...(sha ? { sha } : {}),
      branch: ref,
    });

    if (req?.http?.req.accepts("html")) {
      return sendHtml(req, renderToString(<Toast ok agentId={agentId} />));
    }
    return { agentId, version, committed: true };
  } catch (err: any) {
    if (req?.http?.req.accepts("html")) {
      return sendHtml(req, renderToString(<Toast ok={false} message={err.message} />));
    }
    req.error(500, err.message);
  }
}
