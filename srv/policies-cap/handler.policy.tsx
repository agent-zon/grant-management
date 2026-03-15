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
