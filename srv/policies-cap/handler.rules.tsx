import cds from "@sap/cds";
import { sendHtml } from "#cds-ssr";
import { renderToString } from "react-dom/server";
import getOctokit from "./git-handler/git-handler";

const GIT = { owner: "AIAM", repo: "policies" };
const BASE = "/policies/AgentPolicies";

export const rulesUrl = (agentId: string) => `${BASE}/${agentId}/rules`;
const resourcesUrl = (agentId: string) => `${BASE}/${agentId}/resources`;
export const addRuleUrl = (agentId: string) => `${BASE}/${agentId}/addRule`;
export const removeRuleUrl = (agentId: string) => `${BASE}/${agentId}/removeRule`;

// ─── Shared types ─────────────────────────────────────────────────────────────

export type PolicyRule = {
  actionType: "allow" | "deny" | "ask";
  /** Encoded: "mcp|serverId|Display Name" or "tool|serverId|toolId|Display Name" */
  target: string;
  targetType: "mcp" | "tool";
  targetName: string;
  constraint: string;
  constraintValue: string;
};

export type TargetOption = {
  value: string;
  label: string;
  type: "mcp" | "tool";
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function safeJson<T>(s: string | undefined | null, fallback: T): T {
  try { return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}

/** Encode target option value: type + parts separated by | */
export function encodeTarget(type: "mcp" | "tool", id: string, name: string) {
  return `${type}|${id}|${name}`;
}

function decodeTarget(value: string): { type: "mcp" | "tool"; id: string; name: string } {
  const [type, id, ...nameParts] = value.split("|");
  return { type: type as "mcp" | "tool", id, name: nameParts.join("|") };
}

export async function fetchGitFile(octokit: any, path: string): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({ ...GIT, path, ref: "main" });
    return Buffer.from((data as any).content, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

export function odrlToRules(odrlJson: string | null): PolicyRule[] {
  if (!odrlJson) return [];
  const odrl = safeJson(odrlJson, null) as any;
  if (!odrl) return [];
  const rules: PolicyRule[] = [];
  for (const perm of odrl.permission || []) {
    const isAsk = perm.duty?.some((d: any) => d.action === "sap:obtainConsent");
    const c = perm.constraint?.[0];
    rules.push({
      actionType: isAsk ? "ask" : "allow",
      target: encodeTarget(perm._metadata?.targetType || "mcp", perm.target, perm._metadata?.targetName || perm.target),
      targetType: perm._metadata?.targetType || "mcp",
      targetName: perm._metadata?.targetName || perm.target,
      constraint: c?.leftOperand?.replace("sap:", "") || "",
      constraintValue: c?.rightOperand?.[0] || "",
    });
  }
  for (const prohib of odrl.prohibition || []) {
    const c = prohib.constraint?.[0];
    rules.push({
      actionType: "deny",
      target: encodeTarget(prohib._metadata?.targetType || "mcp", prohib.target, prohib._metadata?.targetName || prohib.target),
      targetType: prohib._metadata?.targetType || "mcp",
      targetName: prohib._metadata?.targetName || prohib.target,
      constraint: c?.leftOperand?.replace("sap:", "") || "",
      constraintValue: c?.rightOperand?.[0] || "",
    });
  }
  return rules;
}

// ─── Shared RulesSection component ────────────────────────────────────────────

const ACTION_CFG = {
  allow: { label: "Allow", badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  deny: { label: "Deny", badge: "bg-red-50     text-red-700     border-red-200", dot: "bg-red-500" },
  ask: { label: "Ask Consent", badge: "bg-amber-50   text-amber-700   border-amber-200", dot: "bg-amber-500" },
} as const;

export function RulesSection({
  rules,
  agentId,
  resourcesUrl,
}: {
  rules: PolicyRule[];
  agentId: string;
  resourcesUrl: string;
}) {
  return (
    <div id="rules-section" className="space-y-4">
      {/* State carried through every HTMX swap */}

      {/* ── Rule cards ─────────────────────────────────────────────────────── */}
      <div className="space-y-2 min-h-[4rem]">
        {rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 border border-dashed border-gray-300 rounded-xl text-gray-500 bg-gray-50/50">
            <span className="text-2xl mb-1">📋</span>
            <p className="text-sm">No rules yet — add one below</p>
          </div>
        ) : rules.map((rule, i) => {
          const cfg = ACTION_CFG[rule.actionType];
          return (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 group hover:border-gray-300 hover:bg-gray-50/80 transition-colors">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${cfg.badge}`}>
                {cfg.label}
              </span>
              <div className="flex-1 min-w-0 text-sm">
                <span className="text-gray-800 font-medium">{rule.targetName}</span>
                <span className="ml-2 text-gray-500 text-xs">
                  {rule.targetType === "mcp" ? "🔌 MCP Server" : "🔧 Tool"}
                </span>
                {rule.constraint && (
                  <span className="ml-2 text-xs text-indigo-600">
                    · {rule.constraint} ∈ [{rule.constraintValue}]
                  </span>
                )}
              </div>
              <button
                hx-post={"removeRule"}
                hx-ext="json-enc"
                hx-vals={`{"index":${i}}`}
                hx-target="#rules-section"
                hx-swap="outerHTML"
                className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all text-base leading-none"
                title="Remove rule"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Add-rule form ──────────────────────────────────────────────────── */}
      <div className="pt-3 border-t border-gray-200">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2.5">
          New Rule
        </p>
        <div className="space-y-2">
          {/* Action + Target row */}
          <div className="grid grid-cols-4 gap-2">
            <div className="relative">
              <input
                type="text"
                name="ruleAction"
                list="rule-action-datalist"
                placeholder="Allow / Deny / Ask"
                autoComplete="off"
                defaultValue="allow"
                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg px-3 py-2.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder-gray-500"
              />
              <datalist id="rule-action-datalist">
                <option value="allow" label="Allow" />
                <option value="deny" label="Deny" />
                <option value="ask" label="Ask Consent" />
              </datalist>
            </div>

            <div className="col-span-3 relative group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-indigo-600 transition-colors pointer-events-none" aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </span>
              <input
                type="text"
                name="target"
                list="resources-datalist"
                placeholder="Search MCP servers & tools…"
                autoComplete="off"
                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg pl-10 pr-4 py-2.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder-gray-500 transition-colors"
              />

            </div>

          </div>

          {/* Constraint row */}
          <div className="grid grid-cols-2 gap-2">
            <select name="constraint" title="Constraint attribute" aria-label="Constraint attribute" className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
              <option value="">No constraint</option>
              <option value="accessLevel">Access Level</option>
              <option value="riskLevel">Risk Level</option>
              <option value="dataClassification">Data Classification</option>
              <option value="environment">Environment</option>
              <option value="toolName">Tool Name</option>
            </select>
            <input
              type="text"
              name="constraintValue"
              placeholder="Constraint value…"
              className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg px-3 py-2 placeholder-gray-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <button
            hx-post={"addRule"}
            hx-ext="json-enc"
            hx-include="#rules-section"
            hx-target="#rules-section"
            hx-swap="outerHTML"
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            + Add Rule
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CDS action handlers ───────────────────────────────────────────────────────

export async function ADD_RULE(this: any, req: cds.Request) {
  const { agentId } = req.params[0] || {};
  const d = req.data as any;
  const rules: PolicyRule[] = safeJson(d.rules, []);

  if (d.target) {
    const { type, name } = decodeTarget(d.target);
    const action = ["allow", "deny", "ask"].includes(d.ruleAction) ? d.ruleAction : "allow";
    rules.push({
      actionType: action,
      target: d.target,
      targetType: type,
      targetName: name,
      constraint: d.constraint || "",
      constraintValue: d.constraintValue || "",
    });
  }

  return sendHtml(
    req,
    renderToString(<RulesSection rules={rules} agentId={agentId || ""} resourcesUrl={resourcesUrl(agentId || "")} />)
  );
}

export async function REMOVE_RULE(this: any, req: cds.Request) {
  const { agentId } = req.params[0] || {};
  const d = req.data as any;
  const rules: PolicyRule[] = safeJson(d.rules, []);
  const idx = Number(d.index);

  if (!isNaN(idx) && idx >= 0 && idx < rules.length) rules.splice(idx, 1);

  return sendHtml(
    req,
    renderToString(<RulesSection rules={rules} agentId={agentId || ""} resourcesUrl={resourcesUrl(agentId || "")} />)
  );
}

/** GET /policies/AgentPolicies/{agentId}/rules → RulesSection HTML (fetched from Git) */
export async function RULES(this: any, req: cds.Request) {
  const { agentId } = req.params[0];
  if (!agentId) return sendHtml(req, "");

  const octokit = await getOctokit();
  const savedRaw = await fetchGitFile(octokit, `${agentId}/policies.json`);
  const rules = odrlToRules(savedRaw);

  return sendHtml(
    req,
    renderToString(<RulesSection rules={rules} agentId={agentId} resourcesUrl={resourcesUrl(agentId)} />)
  );
}
