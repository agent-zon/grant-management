import cds from "@sap/cds";
import { sendHtml } from "#cds-ssr";

export const GIT = { owner: "AIAM", repo: "policies" };

export function safeJson<T>(s: string | undefined | null, fallback: T): T {
    try { return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}
export type PolicyRule = {
    actionType: "allow" | "deny" | "ask";
    target: string;
    targetType: "mcp" | "tool";
    targetName: string;
    constraint: string;
    constraintValue: string;
};

export type TargetOption = { value: string; label: string; type: "mcp" | "tool" };

/** ODRL Set shape we use (permission / prohibition arrays). */
export type OdrlSet = {
  "@context"?: unknown[];
  "@type"?: string;
  permission?: OdrlEntry[];
  prohibition?: OdrlEntry[];
};
export type OdrlEntry = {
  target: string;
  action?: string;
  _metadata?: { targetType?: string; targetName?: string };
  constraint?: { leftOperand?: string; operator?: string; rightOperand?: string[] }[];
  duty?: { action?: string }[];
  priority?: number;
};

/** Ensure odrl has permission/prohibition arrays; default context. */
export function ensureOdrlSet(odrl: OdrlSet | null | undefined): OdrlSet {
  const p = Array.isArray(odrl?.permission) ? odrl.permission : [];
  const q = Array.isArray(odrl?.prohibition) ? odrl.prohibition : [];
  return {
    "@context": odrl?.["@context"] ?? ["http://www.w3.org/ns/odrl.jsonld", { sap: "https://sap.com/odrl/extensions/" }],
    "@type": odrl?.["@type"] ?? "Set",
    permission: p,
    prohibition: q,
  };
}

export function odrlToRules(odrl: Record<string, any> | null): PolicyRule[] {
    const rules: PolicyRule[] = [];
    for (const perm of odrl?.permission || []) {
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
    for (const prohib of odrl?.prohibition || []) {
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

function encodeTarget(type: "mcp" | "tool", id: string, name: string) {
    return `${type}|${id}|${name}`;
}

/** Build one ODRL permission or prohibition entry from UI rule fields. */
export function ruleToOdrlEntry(rule: {
  actionType: "allow" | "deny" | "ask";
  target: string;
  targetType: "mcp" | "tool";
  targetName: string;
  constraint?: string;
  constraintValue?: string;
}): { kind: "permission" | "prohibition"; entry: OdrlEntry } {
  const entry: OdrlEntry = {
    target: rule.target,
    action: "use",
    _metadata: { targetType: rule.targetType, targetName: rule.targetName },
  };
  if (rule.constraint && rule.constraintValue) {
    entry.constraint = [{ leftOperand: `sap:${rule.constraint}`, operator: "isPartOf", rightOperand: [rule.constraintValue] }];
  }
  if (rule.actionType === "deny") {
    return { kind: "prohibition", entry };
  }
  if (rule.actionType === "ask") {
    entry.duty = [{ action: "sap:obtainConsent" }];
    entry.priority = 160;
  }
  return { kind: "permission", entry };
}
/** READ handler — returns pre-loaded req.data.policy; JSON or HTML by Accept. */
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
