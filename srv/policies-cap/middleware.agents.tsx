import cds from "@sap/cds";
import yaml from "js-yaml";
import getOctokit from "./git-handler/git-handler";

const GIT = { owner: "AIAM", repo: "policies" };

export type AgentInfo = {
  id: string;
  name: string;
  description: string;
  region: string;
  company: string;
  tags: { key: string; value: string }[];
};

async function fetchGitFile(octokit: any, path: string, ref: string = "main"): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({ ...GIT, path, ref });
    return Buffer.from((data as any).content, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

/** Load one agent's manifest and return display info. */
export async function getAgentManifestInfo(octokit: any, agentId: string, ref: string = "main"): Promise<AgentInfo | null> {
  const raw = await fetchGitFile(octokit, `${agentId}/agent_manifest.yaml`, ref);
  if (!raw) return null;
  try {
    const m = yaml.load(raw) as any;
    const meta = m?.metadata || m || {};
    const labels = meta.labels || meta.tags || {};
    const name =
      m?.displayName || m?.name || meta.name || meta.displayName || agentId;
    const description =
      m?.description || meta.description || "";
    const region = m?.region || meta.region || "";
    const company = m?.company || meta.company || meta.namespace || "SAP";
    const tags: { key: string; value: string }[] = [];
    if (typeof labels === "object" && !Array.isArray(labels)) {
      for (const [k, v] of Object.entries(labels)) {
        if (v != null) tags.push({ key: k, value: String(v) });
      }
    }
    if (meta.env && !tags.some((t) => t.key === "env")) tags.push({ key: "env", value: String(meta.env) });
    if (meta.team && !tags.some((t) => t.key === "team")) tags.push({ key: "team", value: String(meta.team) });
    return {
      id: agentId,
      name: typeof name === "string" ? name : agentId,
      description: typeof description === "string" ? description : "",
      region: typeof region === "string" ? region : "",
      company: typeof company === "string" ? company : "SAP",
      tags,
    };
  } catch {
    return { id: agentId, name: agentId, description: "", region: "", company: "SAP", tags: [] };
  }
}

/** Load agents (with manifest) and attach to req.data.agents as AgentInfo[]. */
export async function agentsDataMiddleware(this: any, req: cds.Request) {
  req.data = req.data || {};
  const octokit = await getOctokit();
  const { data } = await octokit.rest.repos.getContent({ ...GIT, path: "" });
  const dirs = (Array.isArray(data) ? data : [data])
    .filter((i: any) => i.type === "dir")
    .map((i: any) => i.name as string);

  const agentsWithManifest = await Promise.all(
    dirs.map(async (id) => {
      try {
        await octokit.rest.repos.getContent({ ...GIT, path: `${id}/agent_manifest.yaml` });
        return id;
      } catch {
        return null;
      }
    })
  );
  const agentIds = agentsWithManifest.filter((n): n is string => n != null).sort();


  req.data.agents = agentIds;

  const { agentId } = req.params[0] || {};
  if(agentId) {
    const agent = await getAgentManifestInfo(octokit, agentId);
    req.data.agent = agent;
    req.data.agentId = agentId;
  }
}


