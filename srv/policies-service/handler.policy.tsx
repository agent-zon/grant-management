import cds from "@sap/cds";
import { sendHtml } from "#cds-ssr";

export const GIT = { owner: "AIAM", repo: "policies" };

export function safeJson<T>(s: string | undefined | null, fallback: T): T {
    try { return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}

// ---------------------------------------------------------------------------
// AMS DCN types — aligned with dcn.go in tools/mcp-ams
// ---------------------------------------------------------------------------

export type DcnContainer = {
  version: number;
  id?: string;
  name?: string;
  policies?: DcnPolicy[];
  functions?: unknown[];
  schemas?: unknown[];
  tests?: unknown[];
};

export type DcnPolicy = {
  policy: string[];
  description?: string;
  default?: boolean;
  internal?: boolean;
  uses?: DcnUse[];
  rules: DcnRule[];
  annotations?: Record<string, any>;
};

export type DcnUse = {
  use: string[];
  restrictions?: any[];
  annotations?: Record<string, any>;
};

export type DcnRule = {
  rule: "grant" | "deny";
  actions: string[];
  resources: string[];
  condition?: DcnCondition;
  annotations?: Record<string, any>;
};

export type DcnCondition = {
  call: string[];
  args: DcnConditionArg[];
};

export type DcnConditionArg =
  | string
  | number
  | boolean
  | { ref: string[] }
  | DcnCondition;

export type TargetOption = { value: string; label: string; type: "mcp" | "tool" };

/** Ensure raw JSON has the DcnContainer envelope. */
export function ensureDcnContainer(raw: any): DcnContainer {
  if (!raw || typeof raw !== "object") {
    return { version: 1, policies: [{ policy: ["default"], default: true, rules: [] }] };
  }
  if (Array.isArray(raw)) {
    return { version: 1, policies: raw };
  }
  const c = raw as DcnContainer;
  return {
    version: c.version ?? 1,
    id: c.id,
    name: c.name,
    policies: Array.isArray(c.policies) ? c.policies : [{ policy: ["default"], default: true, rules: [] }],
    functions: c.functions ?? [],
    tests: c.tests ?? [],
  };
}

/** Get the default policy (or first policy). */
export function getDefaultPolicy(container: DcnContainer): DcnPolicy | undefined {
  return container.policies?.find((p) => p.default) ?? container.policies?.[0];
}

/** Find a policy by qualified name. */
export function findPolicy(container: DcnContainer, name: string): DcnPolicy | undefined {
  return container.policies?.find((p) => (p.policy ?? []).join(".") === name);
}

/** Get annotations helper. */
export function getAnnotation<T>(obj: { annotations?: Record<string, any> } | undefined, key: string): T | undefined {
  return obj?.annotations?.[key] as T | undefined;
}

/** Build a DCN rule from UI form fields. */
export function buildDcnRule(opts: {
  ruleType: "grant" | "deny";
  resource: string;
  constraint?: string;
  constraintValue?: string;
}): DcnRule {
  const rule: DcnRule = {
    rule: opts.ruleType,
    actions: ["access"],
    resources: opts.resource ? [opts.resource] : ["agent.artifacts"],
  };

  if (opts.constraint && opts.constraintValue) {
    rule.condition = {
      call: ["eq"],
      args: [
        { ref: ["$app", "tools", "*", opts.constraint] },
        opts.constraintValue,
      ],
    };
  }

  return rule;
}

/** Format a condition for display. */
export function conditionSummary(cond: DcnCondition | undefined): string {
  if (!cond) return "";
  const op = cond.call?.[0] ?? "?";
  const parts = (cond.args ?? []).map((a) => {
    if (typeof a === "string") return `"${a}"`;
    if (typeof a === "number" || typeof a === "boolean") return String(a);
    if (a && typeof a === "object" && "ref" in a) return (a as { ref: string[] }).ref.join(".");
    return "…";
  });
  return `${op}(${parts.join(", ")})`;
}

export function formatSchedule(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return cron;
  const [, hours, , , days] = parts;
  const dayMap: Record<string, string> = { "1-5": "Mon-Fri", "0-6": "Daily", "1-7": "Daily", "0,6": "Weekends" };
  const dayLabel = dayMap[days] || days;
  const hourLabel = hours === "*" ? "" : hours.replace("-", ":00-") + ":00";
  return [dayLabel, hourLabel].filter(Boolean).join(" ");
}

/** READ handler. */
export default async function GET_POLICY(this: any, req: cds.Request) {
  const policy = req.data?.policy;
  if (req?.http?.req.accepts("html")) {
    const body = typeof policy === "string" ? policy : JSON.stringify(policy ?? {}, null, 2);
    return sendHtml(req, `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Policy</title></head><body><pre>${escapeHtml(body)}</pre></body></html>`);
  }
  return policy;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
