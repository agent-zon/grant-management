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

async function fetchGitFile(octokit: any, path: string, ref: string = "main"): Promise<{ content: string, sha: string } | null> {
  try {
    const { data, sha } = await octokit.rest.repos.getContent({ ...GIT, path, ref });
    return {
      content: Buffer.from((data as any).content, "base64").toString("utf-8"),
      sha: sha as string
    };
  } catch {
    return null;
  }
}

/** Load one agent's manifest and return display info. */
export async function getAgentManifestInfo(octokit: any, agentId: string, ref: string = "main"): Promise<AgentInfo | null> {
  const { content, sha } = await fetchGitFile(octokit, `${agentId}/agent_manifest.yaml`, ref) || {};
  if (!content || !sha) return null;
  try {
    const m = yaml.load(content) as any;
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
      ...m,
      id: agentId,
      name: typeof name === "string" ? name : agentId,
      description: typeof description === "string" ? description : "",
      region: typeof region === "string" ? region : "",
      company: typeof company === "string" ? company : "SAP",
      tags,
      manifest: m,
      sha: sha     
    };
  } catch {
    return { id: agentId, name: agentId, description: "", region: "", company: "SAP", tags: [] };
  }
}

function agentManifestToInfo({
  manifest,
  sha,
  id
}: { manifest: any, sha: string,id: string }): AgentInfo {

  const meta = manifest?.metadata || manifest || {};
  const labels = meta.labels || meta.tags || {};
  const name =
    manifest?.displayName || manifest?.name || meta.name || meta.displayName || id;
  const description =
    manifest?.description || meta.description || "";
  const region = manifest?.region || meta.region || "";
  const company = manifest?.company || meta.company || meta.namespace || "SAP";
  const tags: { key: string; value: string }[] = [];
  if (typeof labels === "object" && !Array.isArray(labels)) {
    for (const [k, v] of Object.entries(labels)) {
      if (v != null) tags.push({ key: k, value: String(v) });
    }
  }
  if (meta.env && !tags.some((t) => t.key === "env")) tags.push({ key: "env", value: String(meta.env) });
  if (meta.team && !tags.some((t) => t.key === "team")) tags.push({ key: "team", value: String(meta.team) });
  return {
    ...manifest,
    id: id,
    name: typeof name === "string" ? name : id,
    description: typeof description === "string" ? description : "",
    region: typeof region === "string" ? region : "",
    company: typeof company === "string" ? company : "SAP",
    tags,
    manifest: manifest,
    sha: sha     
  };
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
        const {data,sha} = await octokit.rest.repos.getContent({ ...GIT, path: `${id}/agent_manifest.yaml` });
        const content = Buffer.from((data as any).content, "base64").toString("utf-8");
        const manifest = yaml.load(content) as any;
        return agentManifestToInfo({ id , manifest, sha: sha as string });
      } catch (error) {
        console.error(`Failed to load agent manifest for ${id}`, error);
        return null;
      }
    })
  );


  req.data.agents = agentsWithManifest.filter((n)=> !!n);

  const { agentId } = req.params[0] || {};
  if(agentId) {
    req.data.agent = agentsWithManifest.find((a) => a?.id === agentId);
    req.data.agentId = agentId;
  }
}


