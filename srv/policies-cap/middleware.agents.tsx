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
}: { manifest: any, sha: string, id: string }): AgentInfo {

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


/** Fetch agents with manifests via single GraphQL query (no per-agent REST fetches). */
async function listAgents(octokit: any, ref: string = "main"): Promise<AgentInfo[]> {
  const expression = `${ref}:`;
  const { repository } = await octokit.graphql(`
    query GetAgentsWithManifests($owner: String!, $repo: String!, $expression: String!) {
      repository(owner: $owner, name: $repo) {
        root: object(expression: $expression) {
          ... on Tree {
            entries {
              name
              type
              object {
                ... on Tree {
                  entries {
                    name
                    type
                    object {
                      ... on Blob {
                        text
                        oid
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `, {
    owner: GIT.owner,
    repo: GIT.repo,
    expression,
  });

  const entries = repository?.root?.entries ?? [];
  const agents: AgentInfo[] = [];

  for (const entry of entries) {
    if (entry.type !== "tree" || !entry.object?.entries) continue;
    const agentId = entry.name;
    const manifestEntry = entry.object.entries.find(
      (e: { name: string }) => e.name === "agent_manifest.yaml"
    );
    if (!manifestEntry?.object?.text) continue;
    try {
      const manifest = yaml.load(manifestEntry.object.text) as any;
      const sha = manifestEntry.object.oid ?? "";
      agents.push(agentManifestToInfo({ id: agentId, manifest, sha }));
    } catch (err) {
      console.error(`Failed to parse manifest for ${agentId}`, err);
    }
  }
  return agents;
}

/** Load agents (with manifest) and attach to req.data.agents as AgentInfo[]. */
export async function agentsDataMiddleware(this: any, req: cds.Request) {
  req.data = req.data || {};
  const octokit = await getOctokit();
  const ref = req.data?.ref ?? req.data?.version ?? "main";
  const agents = await listAgents(octokit, ref);
  req.data.agents = agents;

  const { agentId } = req.params[0] || {};
  if (agentId) {
    // req.data.agent = agentManifestToInfo(await octokit.rest.repos.getContent({ ...GIT, path: `${agentId}/agent_manifest.yaml`, ref }));
    req.data.agent = agents.find((a) => a?.id === agentId);
    req.data.agentId = agentId;
  }
}
