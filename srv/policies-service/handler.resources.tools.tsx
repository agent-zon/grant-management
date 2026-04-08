import cds from "@sap/cds";
import { render } from "#cds-ssr";
import { McpCard } from "types/mcp-card";
import getOctokit from "./git-handler/git-handler";
import { ResourceEntry } from "./middleware.resources";
import type { DcnContainer, DcnPolicy } from "./handler.policy";
import { GIT, findPolicy, getDefaultPolicy } from "./handler.policy";

type ToolDecision = {
  name: string;
  title: string;
  description: string;
  status: "granted" | "denied" | "conditional" | "unevaluated";
  condition?: string;
  evalNote?: string;
};

/** Align with githubpolicies.PolicyEvalFileSlug (Go). */
function policyEvalFileSlug(qualified: string): string {
  let s = qualified.trim().replace(/\//g, "_").replace(/\\/g, "_");
  s = s.replace(/^\.+|\.+$/g, "");
  return s || "_empty";
}

function policyQualifiedName(p: DcnPolicy): string {
  return (p.policy ?? []).join(".");
}

/** Resolve policy qualified name for eval paths: agent/eval/{slug}/{resourceSlug}.json (or legacy agent/eval/{slug}.json). */
function resolveEvalPolicyQualifiedName(dcn: DcnContainer | undefined, activePolicy: string): { qualified: string; error?: string } {
  if (!dcn?.policies?.length) {
    return { qualified: "", error: "no policies in DCN" };
  }
  const trimmed = activePolicy.trim();
  if (!trimmed) {
    const def = getDefaultPolicy(dcn);
    if (!def) return { qualified: "", error: "no default policy" };
    return { qualified: policyQualifiedName(def) };
  }
  const pol = findPolicy(dcn, trimmed);
  if (!pol) return { qualified: "", error: `unknown activePolicy "${trimmed}"` };
  return { qualified: policyQualifiedName(pol) };
}

type EvalToolRow = {
  name: string;
  title?: string;
  description?: string;
  granted?: boolean;
  denied?: boolean;
  condition?: string;
};

type PersistEvalArtifact = {
  resources?: Record<string, { tools?: EvalToolRow[] }>;
};

/** Nested eval: eval/{policySlug}/{resourceSlug}.json */
type PersistEvalNestedArtifact = {
  tools?: EvalToolRow[];
};

async function loadToolDecisionsFromEval(
  agentId: string | undefined,
  ref: string,
  resourceName: string,
  qualifiedPolicy: string,
  liveTools: Array<{ name: string; title?: string; description?: string }>,
  evalError?: string,
): Promise<ToolDecision[]> {
  if (liveTools.length === 0) return [];

  if (evalError || !qualifiedPolicy || !agentId) {
    const note =
      evalError ||
      (!agentId ? "missing agent" : "open actas / pick policy, then ensure agent/eval/{policy}/{resource}.json exists in repo");
    return liveTools.map((t) => ({
      name: t.name,
      title: t.title || t.name,
      description: t.description || "",
      status: "unevaluated" as const,
      evalNote: note,
    }));
  }

  const octokit = await getOctokit();
  const slug = policyEvalFileSlug(qualifiedPolicy);
  const resourceSlug = policyEvalFileSlug(resourceName);
  const nestedPath = `${agentId}/eval/${slug}/${resourceSlug}.json`;
  const legacyPath = `${agentId}/eval/${slug}.json`;
  let rows: EvalToolRow[] = [];
  try {
    const { data } = await octokit.rest.repos.getContent({ ...GIT, path: nestedPath, ref });
    const content = Buffer.from((data as { content?: string }).content ?? "", "base64").toString("utf-8");
    const art = JSON.parse(content) as PersistEvalNestedArtifact;
    rows = Array.isArray(art.tools) ? art.tools : [];
  } catch {
    try {
      const { data } = await octokit.rest.repos.getContent({ ...GIT, path: legacyPath, ref });
      const content = Buffer.from((data as { content?: string }).content ?? "", "base64").toString("utf-8");
      const art = JSON.parse(content) as PersistEvalArtifact;
      const block = art.resources?.[resourceName];
      rows = Array.isArray(block?.tools) ? block.tools : [];
    } catch {
      return liveTools.map((t) => ({
        name: t.name,
        title: t.title || t.name,
        description: t.description || "",
        status: "unevaluated" as const,
        evalNote: `no Git file ${nestedPath} or legacy ${legacyPath} (run persist:mcp-ams-eval)`,
      }));
    }
  }

  const byName = new Map(rows.map((r) => [r.name, r]));
  return liveTools.map((t) => {
    const row = byName.get(t.name);
    if (!row) {
      return {
        name: t.name,
        title: t.title || t.name,
        description: t.description || "",
        status: "unevaluated" as const,
        evalNote: "not in persisted eval",
      };
    }
    let status: ToolDecision["status"] = "denied";
    if (row.granted) status = "granted";
    else if (row.denied) status = "denied";
    else status = "conditional";
    return {
      name: t.name,
      title: t.title || t.name,
      description: t.description || "",
      status,
      condition: row.condition,
    };
  });
}

const STATUS_STYLE = {
  granted:      { dot: "bg-emerald-500", text: "text-emerald-700" },
  denied:       { dot: "bg-red-500", text: "text-red-400 line-through" },
  conditional:  { dot: "bg-amber-500", text: "text-amber-700" },
  unevaluated:  { dot: "bg-slate-400", text: "text-slate-500" },
} as const;

/** GET .../resources/{name}/tools → tool list from Git agent/eval/{policy}/{resource}.json (legacy: eval/{policy}.json). */
export async function Tools(this: any, req: cds.Request<{ resource: ResourceEntry & McpCard; dcn?: DcnContainer; agentId?: string; version?: string }>) {
  const { resource, dcn, agentId, version } = req.data || {};
  const activePolicyFromQuery =
    (typeof (req as any).query?.activePolicy === "string" ? (req as any).query.activePolicy : "") ||
    (req.data as any)?.activePolicy ||
    "";
  const ver = version || "main";
  const activePolicy = String(activePolicyFromQuery).trim();
  const enabled = resource?.enabled;
  const liveTools = (resource?.tools || []) as Array<{ name: string; title?: string; description?: string }>;

  const { qualified, error: evalPolicyError } = resolveEvalPolicyQualifiedName(dcn, activePolicy);
  const decisions = enabled && resource
    ? await loadToolDecisionsFromEval(agentId, ver, resource.name, qualified, liveTools, evalPolicyError)
    : [];

  const granted = decisions.filter((d) => d.status === "granted").length;
  const denied = decisions.filter((d) => d.status === "denied").length;
  const conditional = decisions.filter((d) => d.status === "conditional").length;
  const unevaluated = decisions.filter((d) => d.status === "unevaluated").length;

  const toolsSectionId = `tools-section-${String(resource?.name ?? "").replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  return render(
    req,
    <div
      id={toolsSectionId}
      className="relative space-y-5 content-fade-in transition-all fade-in duration-200 fade-out duration-200"
      hx-get={`agents/{agent}/versions/{version}/resources/{resource}/tools`}
      hx-vals={`js:{ version: event?.detail?.version ?? ${JSON.stringify(ver)}, agent: event?.detail?.agent ?? ${JSON.stringify(agentId || "")}, resource: event?.detail?.resource ?? ${JSON.stringify(resource?.name ?? "")}, activePolicy: event?.detail?.activePolicy != null ? String(event.detail.activePolicy) : ${JSON.stringify(String(activePolicy).trim())} }`}
      hx-trigger={`resource-${resource?.name}-updated from:body, context-update from:body`}
      hx-swap="innerHTML"
      hx-select={`#${toolsSectionId}`}
    >
      {decisions.length === 0 ? (
        <p className="font-mono text-green-600 shrink-0">connect_to_{resource?.name}</p>
      ) : (
        <>
          {dcn?.policies?.length ? (
            <p className="text-[10px] text-gray-400">
              {granted} granted{denied > 0 ? ` · ${denied} denied` : ""}{conditional > 0 ? ` · ${conditional} conditional` : ""}
              {unevaluated > 0 ? (
                <span className="text-rose-600 font-medium">
                  {` · ${unevaluated} from Git eval only — missing or stale agent/eval/*.json`}
                </span>
              ) : null}
            </p>
          ) : null}
          <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {decisions.map((t, i) => {
              const style = STATUS_STYLE[t.status];
              return (
                <li key={`${resource?.name}-${t.name}-${i}`} className="flex items-center gap-2 text-sm py-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} title={t.status} />
                  <span className={`font-mono shrink-0 ${style.text}`}>{t.name}</span>
                  <span className="text-gray-500">·</span>
                  <span className="text-gray-700 truncate" title={t.description}>{t.title}</span>
                  {(t.condition || t.evalNote) && (
                    <span
                      className={`text-[10px] font-mono ml-auto shrink-0 max-w-[140px] truncate ${t.status === "unevaluated" ? "text-rose-600" : "text-amber-600"}`}
                      title={t.evalNote || t.condition}
                    >
                      {t.evalNote || t.condition}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>,
  );
}
