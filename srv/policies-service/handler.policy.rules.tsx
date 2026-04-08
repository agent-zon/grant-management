import cds from "@sap/cds";
import { render } from "#cds-ssr";
import type { DcnContainer, DcnPolicy, DcnUse, DcnRule, DcnCondition, TargetOption } from "./handler.policy";
import { ensureDcnContainer, getDefaultPolicy, findPolicy, getAnnotation, buildDcnRule, conditionSummary, formatSchedule } from "./handler.policy";
import { pushMiddleware } from "./middleware.policy.push";

function parseDcn(raw: any): DcnContainer {
  return ensureDcnContainer(typeof raw === "string" ? JSON.parse(raw) : raw);
}

// ---------------------------------------------------------------------------
// Condition rendering
// ---------------------------------------------------------------------------

function isEnvCondition(cond: DcnCondition): boolean {
  return (cond.args ?? []).some((a) =>
    typeof a === "object" && a !== null && "ref" in a && (a as { ref: string[] }).ref[0] === "$env"
  );
}

function extractAppConditions(cond: DcnCondition): DcnCondition[] {
  const op = cond.call?.[0];
  if (op === "and" || op === "or") {
    return (cond.args ?? [])
      .filter((a): a is DcnCondition => typeof a === "object" && a !== null && "call" in a)
      .filter((sub) => !isEnvCondition(sub));
  }
  if (isEnvCondition(cond)) return [];
  return [cond];
}

function SimpleCondition({ condition }: { condition: DcnCondition }) {
  const op = condition.call?.[0] ?? "?";
  const args = condition.args ?? [];
  const refArg = args.find((a): a is { ref: string[] } => typeof a === "object" && a !== null && "ref" in a);
  const valArg = args.find((a) => typeof a === "string" || typeof a === "number" || typeof a === "boolean");
  const attrName = refArg ? refArg.ref[refArg.ref.length - 1] : null;

  if (attrName && valArg !== undefined) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-gray-600">
        <span className="font-medium text-gray-700">{attrName}</span>
        <span className="text-gray-400">{op === "eq" ? "=" : op}</span>
        <span className="font-medium text-gray-800">{String(valArg)}</span>
      </span>
    );
  }
  return (
    <span className="text-[10px] font-mono text-gray-500">{conditionSummary(condition)}</span>
  );
}

function ConditionInline({ condition }: { condition?: DcnCondition }) {
  if (!condition) return null;
  const appConditions = extractAppConditions(condition);
  if (appConditions.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 ml-1">
      <span className="text-gray-400 text-[11px]">where</span>
      {appConditions.map((sub, i) => (
        <span key={i} className="contents">
          {i > 0 && <span className="text-gray-300 text-[10px]">&</span>}
          <SimpleCondition condition={sub} />
        </span>
      ))}
    </span>
  );
}

function resourceLabel(r: string): string {
  if (r === "agent.artifacts") return "*";
  if (r === "agent.tools") return "*.tools";
  return r;
}

// ---------------------------------------------------------------------------
// Rule line component
// ---------------------------------------------------------------------------

function RuleLine({ rule, policyIndex, ruleIndex, agentId, version }: {
  rule: DcnRule; policyIndex: number; ruleIndex: number; agentId: string; version: string;
}) {
  const isGrant = rule.rule === "grant";
  const resources = (rule.resources ?? []).map(resourceLabel).join(", ") || "*";
  return (
    <div className="group flex items-center gap-1.5 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">
      <span className={`text-xs font-semibold w-10 ${isGrant ? "text-emerald-600" : "text-red-600"}`}>
        {isGrant ? "grant" : "deny"}
      </span>
      <span className="text-xs font-semibold text-sky-700">{resources}</span>
      <ConditionInline condition={rule.condition} />
      <button
        hx-post={`agents/${agentId}/versions/${version}/removeRule`}
        hx-ext="json-enc"
        hx-vals={JSON.stringify({ removePolicyIndex: policyIndex, removeRuleIndex: ruleIndex })}
        hx-target="#rules-section"
        hx-swap="outerHTML"
        hx-params="dcn,removePolicyIndex,removeRuleIndex"
        className="ml-auto opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-500 transition-all text-sm leading-none shrink-0"
        title="Remove rule"
      >
        ×
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Contextual policy section (from a "use" entry)
// ---------------------------------------------------------------------------

function UsedPolicySection({ use, pol, policyIndex, agentId, version }: {
  use: DcnUse; pol: DcnPolicy | undefined; policyIndex: number; agentId: string; version: string;
}) {
  const name = (use.use ?? []).join(".");
  const duties = getAnnotation<string[]>(use, "sap/duties");
  const schedule = getAnnotation<string>(use, "sap/schedule");
  const hasConsent = duties?.includes("consent");

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 pt-1">
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">when</span>
        <span className="text-sm font-bold text-gray-900">{name}</span>
        {hasConsent && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
            consent
          </span>
        )}
        {schedule && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
            {formatSchedule(schedule)}
          </span>
        )}
      </div>
      {pol?.description && (
        <p className="text-[11px] text-gray-400 pl-10 -mt-0.5">{pol.description}</p>
      )}
      {pol && pol.rules?.length > 0 ? (
        <div className="pl-3 border-l-2 border-gray-200 ml-4 space-y-0.5">
          {pol.rules.map((rule, ri) => (
            <div key={ri}><RuleLine rule={rule} policyIndex={policyIndex} ruleIndex={ri} agentId={agentId} version={version} /></div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-gray-300 pl-10 italic">no rules</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function ADD_RULE(this: any, req: cds.Request) {
  const { dcn: dcnRaw, action, target, constraint, constraintValue, policy: pName, agentId, version } = req.data as any;
  const container = parseDcn(dcnRaw);
  const ruleType = action === "deny" ? "deny" : "grant";
  const resource = target?.trim() || "agent.artifacts";
  const policyName = pName?.trim() || "default";

  const newRule = buildDcnRule({
    ruleType,
    resource,
    constraint: constraint || "",
    constraintValue: constraintValue || "",
  });

  if (!container.policies) container.policies = [];
  let pol = container.policies.find((p) => (p.policy ?? []).join(".") === policyName);
  if (!pol) {
    pol = { policy: [policyName], rules: [] };
    container.policies.push(pol);
  }
  pol.rules.push(newRule);

  req.data.dcn = container;
  await pushMiddleware.call(this, req);
  req.http?.res?.setHeader("HX-Trigger", JSON.stringify({ "policy-updated": { agent: agentId, version: version } }));

  return RULES(req);
}

export async function REMOVE_RULE(this: any, req: cds.Request) {
  const d = req.data as any;
  const { agentId, version } = req.data;
  const container = parseDcn(d.dcn);
  const pi = Number(d.removePolicyIndex);
  const ri = Number(d.removeRuleIndex);
  const pol = container.policies?.[pi];
  if (pol && Array.isArray(pol.rules) && !isNaN(ri) && ri >= 0 && ri < pol.rules.length) {
    pol.rules.splice(ri, 1);
  }
  req.data.dcn = container;
  await pushMiddleware.call(this, req);
  req.http?.res?.setHeader("HX-Trigger", JSON.stringify({ "policy-updated": { agent: agentId, version: version } }));
  return RULES(req);
}

export async function RULES(req: cds.Request) {
  const { agentId, version, dcn: dcnRaw, resources } = req.data;
  const container = parseDcn(dcnRaw);
  const policies = container.policies ?? [];
  const defaultPol = getDefaultPolicy(container);
  const totalRules = policies.reduce((s, p) => s + (p.rules?.length ?? 0), 0);
  const policyNames = policies.map((p) => (p.policy ?? []).join("."));
  const defaultIndex = policies.indexOf(defaultPol!);
  return render(
    req,
    <div
      id="rules-section"
      className="relative space-y-1 content-fade-in"
      hx-get={`agents/{agent}/versions/{version}/rules`}
      hx-vals="js:{ version: event?.detail?.version, agent: event?.detail?.agent }"
      hx-trigger="agent-selected from:body"
      hx-swap="outerHTML"
    >
      <input type="hidden" name="dcn" value={JSON.stringify(container)} />

      <div className="flex items-baseline gap-2 mb-2">
        <h3 className="text-sm font-semibold text-gray-700">Policies</h3>
        <span className="text-xs text-gray-400">{policies.length} policies · {totalRules} rules</span>
      </div>

      {/* Default policy rules (no header) */}
      {defaultPol && defaultPol.rules?.length > 0 && (
        <div className="space-y-0.5 mb-3">
          {defaultPol.rules.map((rule, ri) => (
            <div key={ri}><RuleLine rule={rule} policyIndex={defaultIndex} ruleIndex={ri} agentId={agentId} version={version} /></div>
          ))}
        </div>
      )}

      {/* Contextual policies from uses */}
      {defaultPol?.uses && defaultPol.uses.length > 0 ? (
        <div className="space-y-4">
          {defaultPol.uses.map((use, ui) => {
            const useName = (use.use ?? []).join(".");
            const pol = findPolicy(container, useName);
            const polIndex = pol ? policies.indexOf(pol) : -1;
            return (
              <div key={ui}>
                <UsedPolicySection
                  use={use}
                  pol={pol}
                  policyIndex={polIndex >= 0 ? polIndex : 0}
                  agentId={agentId}
                  version={version}
                />
              </div>
            );
          })}
        </div>
      ) : policies.length === 0 || (policies.length === 1 && defaultPol?.rules?.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-8 border border-dashed border-gray-200 rounded-xl text-gray-400 bg-gray-50/50">
          <p className="text-sm font-medium">No policies defined</p>
          <p className="text-xs mt-0.5">Add a rule below to get started</p>
        </div>
      ) : null}

      {/* Add Rule Form */}
      <div className="pt-3 mt-3 border-t border-gray-200">
        <p className="text-xs font-semibold text-gray-500 mb-2">Add rule</p>
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider w-8">when</span>
            <input
              type="text"
              name="policy"
              list="policy-names-datalist"
              placeholder="policy name"
              value="default"
              autoComplete="off"
              className="rounded-md text-xs font-bold px-2.5 py-1.5 bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-w-[150px] flex-1"
            />
            <datalist id="policy-names-datalist">
              {policyNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <select
              name="action"
              className="rounded-md text-xs font-semibold px-2.5 py-1.5 bg-white border border-gray-300 text-gray-800 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="grant">grant</option>
              <option value="deny">deny</option>
            </select>
            <input
              type="text"
              name="target"
              list="resources-datalist"
              placeholder="ariba-mcp.tools"
              value="agent.artifacts"
              autoComplete="off"
              className="flex-1 min-w-[140px] rounded-md text-xs font-semibold px-2.5 py-1.5 bg-white border border-sky-200 text-sky-800 placeholder-sky-400/60 focus:ring-1 focus:ring-sky-500 outline-none"
            />
            <datalist id="resources-datalist">
              <option value="agent.artifacts" label="* (all)" />
              <option value="agent.tools" label="*.tools (all tools)" />
              {(resources as TargetOption[] | undefined)?.map((r: TargetOption) => (
                <>
                  <option key={`${r.label}.tools`} value={`${r.label}.tools`} />
                  <option key={`${r.label}.artifacts`} value={`${r.label}.artifacts`} />
                </>
              ))}
            </datalist>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider w-8">where</span>
            <span
              hx-get={`agents/${agentId}/versions/${version}/constraints`}
              hx-trigger="load"
              hx-swap="innerHTML"
              hx-target="#rule-constraint"
            />
            <select
              id="rule-constraint"
              name="constraint"
              className="rounded-md text-xs px-2.5 py-1.5 bg-white border border-gray-300 text-gray-800 focus:ring-1 focus:ring-indigo-500 outline-none"
              hx-post={`agents/${agentId}/versions/${version}/values`}
              hx-trigger="change"
              hx-swap="innerHTML"
              hx-params="constraint"
              hx-target="#constraint-values-datalist"
            >
              <option value="">none</option>
            </select>
            <span className="text-gray-400 text-xs">=</span>
            <input
              type="text"
              name="constraintValue"
              list="constraint-values-datalist"
              placeholder="value"
              autoComplete="off"
              className="rounded-md text-xs px-2.5 py-1.5 bg-white border border-gray-300 text-gray-800 w-24 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <datalist id="constraint-values-datalist" />
            <button
              hx-post={`agents/${agentId}/versions/${version}/addRule`}
              hx-ext="json-enc"
              hx-include="#rules-section"
              hx-target="#rules-section"
              hx-params="dcn,policy,action,target,constraint,constraintValue"
              hx-swap="morph:outerHTML"
              className="ml-auto px-4 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
