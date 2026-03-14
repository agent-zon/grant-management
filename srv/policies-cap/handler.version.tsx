import cds from "@sap/cds";
import getOctokit from "./git-handler/git-handler";

const GIT = { owner: "AIAM", repo: "policies" };

/** Load versions or single version content and attach to req.data */
export async function versionDataMiddleware(this: any, req: cds.Request) {
    const { agentId } = req.params[0] || {};
    const { version } = req.params[1] || req.data || {};
    req.data = {
        ...req.data,
        agentId
    }
    const octokit = await getOctokit();
    const branches = await octokit.rest.repos.listBranches({
        ...GIT,
        path: `${agentId}/policies.json`,
    });
    const ref = branches.data.find((b: any) => b.name === version) ? version : "main";
    const response = await octokit.rest.repos.getContent({
        ...GIT,
        path: `${agentId}/policies.json`,
        ref: ref,
    });


    req.data.policy = Buffer.from((response.data as any).content, "base64").toString("utf-8");
    req.data.rules = odrlToRules(safeJson(req.data.policy, []));

}

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

    function encodeTarget(type: "mcp" | "tool", id: string, name: string) {
        return `${type}|${id}|${name}`;
    }
}


/** READ handler — returns pre-loaded req.data.versionContent */
export default async function GET_VERSION(this: any, req: cds.Request) {
    return req.data?.policy;
}
