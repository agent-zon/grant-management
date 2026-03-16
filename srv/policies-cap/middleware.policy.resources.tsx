import cds from "@sap/cds";
import getOctokit from "./git-handler/git-handler";
import yaml from "js-yaml";

const GIT = { owner: "AIAM", repo: "policies" };

export type TargetOption = { value: string; label: string; type: "mcp" | "tool" };

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

export async function fetchResources(agentId: string, ref: string = "main"): Promise<TargetOption[]> {
  const octokit = await getOctokit();
  const resources: TargetOption[] = [];
  const manifestRaw = await fetchGitFile(octokit, `${agentId}/agent_manifest.yaml`, ref);
  console.log("resources - middleware2", !!manifestRaw);

  if (!manifestRaw) return resources;

  const manifest = yaml.load(manifestRaw) as any;
  const mcpRequires = (manifest?.requires || []).filter((r: any) => r.kind === "mcp");
  console.log("resources - middleware", mcpRequires?.length, !!manifest);

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

/** Attach req.data.resources from agent manifest (requires req.data.agentId and req.data.ref). */
export async function resourcesMiddleware(this: any, req: cds.Request) {
  const { agentId, ref } = req.data || {};
  if (!agentId || !ref) return;
  req.data.resources = await fetchResources(agentId, ref);
}
