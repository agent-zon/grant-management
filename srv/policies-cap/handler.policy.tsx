import cds from "@sap/cds";
import getOctokit from "./git-handler/git-handler";
import yaml from "js-yaml";
import { inspect } from "node:util";

const GIT = { owner: "AIAM", repo: "policies" };

/** Load versions or single version content and attach to req.data */
export async function versionDataMiddleware(this: any, req: cds.Request) {
    const { agentId } = req.params[0] || {};
    const { version } = req.params[1] || req.data || {};
    console.log("versionDataMiddleware","params", req.params, "data", req.data);
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
    // const resources = await fetchResources(agentId, ref);
    // console.log(ref, "rules", inspect(response.data, { depth: 1, colors: true }), "\nresources", inspect(resources, { depth: 1, colors: true }));

    req.data.resources = await fetchResources(agentId, ref);
    req.data.policy = Buffer.from((response.data as any).content, "base64").toString("utf-8");
    req.data.rules = odrlToRules(safeJson(req.data.policy, []));

}

async function fetchResources(agentId: string, ref: string = "main"): Promise<TargetOption[]> {
    const octokit = await getOctokit();
    const resources: TargetOption[] = [];
    const manifestRaw = await fetchGitFile(octokit, `${agentId}/agent_manifest.yaml`, ref);
    if (!manifestRaw) return resources;
  
    const manifest = yaml.load(manifestRaw) as any;
    const mcpRequires = (manifest?.requires || []).filter((r: any) => r.kind === "mcp");
  
    await Promise.all(
      mcpRequires.map(async (server: any) => {
        const serverId = server.name as string;
        const serverName = server.displayName || serverId;
  
        resources.push({ value: encodeTarget("mcp", serverId, serverName), label: serverName, type: "mcp" });
  
        if (server.ref?.file) {
          const mcpRaw = await fetchGitFile(octokit, `${agentId}/${(server.ref.file as string).replace("./", "")}`, ref);
          if (!mcpRaw) return;
          for (const tool of (yaml.load(mcpRaw) as any)?.tools || []) {
            resources.push({
              value: encodeTarget("tool", `${serverId}|${tool.name}`, `${tool.name} (${serverId})`),
              label: `${tool.name} (${serverId})`,
              type: "tool",
            });
          }
        }
      })
    );
    return resources;
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
async function fetchGitFile(octokit: any, path: string, ref: string = "main"): Promise<string | null> {
    try {
      const { data } = await octokit.rest.repos.getContent({ ...GIT, path, ref });
      return Buffer.from((data as any).content, "base64").toString("utf-8");
    } catch (error) {
      console.error(`Failed to fetch Git file: ${path}`, error);
      return null;
    }
  }
  
function encodeTarget(type: "mcp" | "tool", id: string, name: string) {
    return `${type}|${id}|${name}`;
}
/** READ handler — returns pre-loaded req.data.policy */
export default async function GET_VERSION(this: any, req: cds.Request) {
    return req.data?.policy;
}
