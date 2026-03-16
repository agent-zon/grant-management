import cds from "@sap/cds";
import { render } from "#cds-ssr";
import type { OdrlSet, OdrlEntry } from "./handler.policy";
import { ensureOdrlSet, ruleToOdrlEntry, type TargetOption } from "./handler.policy";
import { pushMiddleware } from "./middleware.policy.push";

const ACTION_CFG = {
  allow: { label: "Allow", pill: "bg-emerald-100 text-emerald-800 border border-emerald-200", dot: "bg-emerald-500" },
  deny: { label: "Deny", pill: "bg-red-100 text-red-800 border border-red-200", dot: "bg-red-500" },
  ask: { label: "Ask For Consent", pill: "bg-amber-100 text-amber-800 border border-amber-200", dot: "bg-amber-500" },
} as const;

type Row = {
  kind: "permission" | "prohibition";
  index: number;
  actionType: "allow" | "deny" | "ask";
  target: string;
  targetType: "mcp" | "tool";
  targetName: string;
  constraint: string;
  constraintValue: string;
};

function entryToRow(entry: OdrlEntry, kind: "permission" | "prohibition", index: number): Row {
  const isAsk = kind === "permission" && entry.duty?.some((d: any) => d.action === "sap:obtainConsent");
  const actionType = kind === "prohibition" ? "deny" : isAsk ? "ask" : "allow";
  const targetType = (entry._metadata?.targetType as "mcp" | "tool") || "mcp";
  const targetName = entry._metadata?.targetName ?? entry.target;
  const c = entry.constraint?.[0];
  return {
    kind,
    index,
    actionType,
    target: entry.target,
    targetType,
    targetName,
    constraint: c?.leftOperand?.replace("sap:", "") ?? "",
    constraintValue: c?.rightOperand?.[0] ?? "",
  };
}

function decodeTarget(value: string): { type: "mcp" | "tool"; id: string; name: string } {
  const [type, id, ...nameParts] = value.split("|");
  return { type: type as "mcp" | "tool", id, name: nameParts.join("|") };
}

function odrlToRows(odrl: OdrlSet): Row[] {
  const rows: Row[] = [];
  (odrl.permission ?? []).forEach((e, i) => rows.push(entryToRow(e, "permission", i)));
  (odrl.prohibition ?? []).forEach((e, i) => rows.push(entryToRow(e, "prohibition", i)));
  return rows;
}

export async function ADD_RULE(this: any, req: cds.Request) {
  const { odrl, ruleAction, target, constraint, constraintValue } = req.data;
  const odrlSet = ensureOdrlSet(typeof odrl === "string" ? JSON.parse(odrl) : odrl);
  const effectiveTarget = target?.trim() || "mcp|sap:any|Any MCP server";
  const { type, name } = decodeTarget(effectiveTarget);
  const action = ["allow", "deny", "ask"].includes(ruleAction) ? ruleAction : "allow";
  const { kind, entry } = ruleToOdrlEntry({
    actionType: action,
    target: effectiveTarget,
    targetType: type,
    targetName: name,
    constraint: constraint || "",
    constraintValue: constraintValue || "",
  });
  if (kind === "prohibition") {
    odrlSet.prohibition = odrlSet.prohibition ?? [];
    odrlSet.prohibition.push(entry);
  } else {
    odrlSet.permission = odrlSet.permission ?? [];
    odrlSet.permission.push(entry);
  }
  req.data.odrl = odrlSet;
  await pushMiddleware.call(this, req);
  return RULES(req);
}

export async function REMOVE_RULE(this: any, req: cds.Request) {
  const d = req.data as any;
  let odrl = typeof d.odrl === "string" ? JSON.parse(d.odrl) : d.odrl;
  odrl = ensureOdrlSet(odrl);
  const kind = d.removeKind === "prohibition" ? "prohibition" : "permission";
  const idx = Number(d.removeIndex);
  const arr = kind === "prohibition" ? odrl.prohibition : odrl.permission;
  if (Array.isArray(arr) && !isNaN(idx) && idx >= 0 && idx < arr.length) {
    arr.splice(idx, 1);
  }
  req.data.odrl = odrl;
  await pushMiddleware.call(this, req);
  return RULES(req);
}

export async function RULES(req: cds.Request) {
  const { agentId, version, odrl, resources } = req.data;
  const odrlSet = ensureOdrlSet(typeof odrl === "string" ? JSON.parse(odrl) : odrl);
  const rows = odrlToRows(odrlSet);

  return render(
    req,
    <div
      id="rules-section"
      className="space-y-5"
      hx-get={`agents/{agent}/versions/{version}/rules`}
      hx-vals="js:{ version: event?.detail?.version, agent: event?.detail?.agent }"
      hx-trigger="agentSelected from:body"
      hx-swap="outerHTML"
    >
      <input type="hidden" name="odrl" value={JSON.stringify(odrlSet)} />

      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Policy Rules ({rows.length}):
      </h3>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-gray-200 rounded-xl text-gray-500 bg-gray-50/50">
          <span className="text-3xl mb-2">🛡️</span>
          <p className="text-sm font-medium">No rules yet</p>
          <p className="text-xs mt-0.5">Add a permission or prohibition below</p>
        </div>
      ) : (
        <div className="space-y-3 min-h-[4rem] max-h-[50vh] overflow-y-auto pr-1">
          {rows.map((row) => {
            const cfg = ACTION_CFG[row.actionType];
            const targetLabel = row.targetType === "mcp" ? row.targetName : `Invoke Tool · ${row.targetName}`;
            return (
              <div
                key={`${row.kind}-${row.index}`}
                className="group flex items-center gap-2 flex-wrap px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.pill}`}>
                  {cfg.label}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-sky-100 text-sky-800 border border-sky-200">
                  {targetLabel}
                </span>
                {row.constraint && row.constraintValue ? (
                  <>
                    <span className="text-gray-500 text-sm">where</span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-200 text-gray-800">
                      {row.constraint}
                    </span>
                    <span className="text-gray-500 text-sm">equals</span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-gray-300 text-gray-800">
                      {row.constraintValue}
                    </span>
                  </>
                ) : null}
                <button
                  hx-post={`agents/${agentId}/versions/${version}/removeRule`}
                  hx-ext="json-enc"
                  hx-vals={JSON.stringify({ removeKind: row.kind, removeIndex: row.index })}
                  hx-target="#rules-section"
                  hx-swap="outerHTML"
                  hx-params="odrl,removeKind,removeIndex"
                  className="ml-auto opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all text-base leading-none shrink-0"
                  title="Remove rule"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="pt-5 mt-5 border-t border-gray-200">
        <p className="text-xs font-semibold text-gray-600 mb-3">New rule</p>
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-500 text-sm">Action</span>
            <select
              name="ruleAction"
              className="rounded-lg text-xs font-semibold px-3 py-2 bg-white border border-gray-300 text-gray-800 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="allow">Allow</option>
              <option value="deny">Deny</option>
              <option value="ask">Ask For Consent</option>
            </select>
            <span className="text-gray-500 text-sm">to</span>
            <input
              id="rule-target"
              type="text"
              name="target"
              list="resources-datalist"
              placeholder="MCP server (or leave empty for any)"
              autoComplete="off"
              className="flex-1 min-w-[140px] rounded-lg text-xs font-medium px-3 py-2 bg-sky-50 border border-sky-200 text-sky-800 placeholder-sky-600/60 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
            <datalist id="resources-datalist">
              <option value="" label="(Any server)" />
              {(resources as TargetOption[] | undefined)?.map((r: TargetOption) => (
                <option key={r.value} value={r.value} label={r.label}>{r.label}</option>
              ))}
            </datalist>
          </div>
          <div className="flex flex-wrap items-center gap-2" data-agent={agentId} data-version={version}>
            <span className="text-gray-500 text-sm">Where</span>
            <select
              id="rule-constraint"
              name="constraint"
              title="Constraint attribute"
              className="rounded-lg text-xs font-medium px-3 py-2 bg-gray-200 text-gray-800 border-0 focus:ring-1 focus:ring-indigo-500 outline-none"
              hx-swap="innerHTML"
              hx-post={`agents/${agentId}/versions/${version}/values`}
              hx-trigger="change  "
              hx-params="constraint"
              hx-target="#constraint-values-datalist"
            > 
             
              <option value="">No constraint</option>
              <option value="accessLevel">accessLevel</option>
              <option value="riskLevel">riskLevel</option>
              <option value="dataClassification">dataClassification</option>
              <option value="environment">environment</option>
              <option value="toolName">toolName</option>
            </select>
            <span className="text-gray-500 text-sm">equals</span>
            <input
              id="rule-constraint-value"
              type="text"
              name="constraintValue"
              list="constraint-values-datalist"
              placeholder="Value"
              autoComplete="off"
              className="rounded-lg text-xs font-medium px-3 py-2 bg-white border border-gray-300 text-gray-800 w-32 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <datalist id="constraint-values-datalist" />
            
          </div>
          <button
            hx-post={`agents/${agentId}/versions/${version}/addRule`}
            hx-ext="json-enc"
            hx-include="#rules-section"
            hx-target="#rules-section"
            hx-params="ruleAction,target,constraint,constraintValue"
            hx-swap="morph:outerHTML"
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium transition-colors shadow-sm"
          >
            + Add rule
          </button>
        </div>
      </div>
    </div>
  );
}
