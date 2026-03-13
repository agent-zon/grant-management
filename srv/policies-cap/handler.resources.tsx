import cds from "@sap/cds";
import { sendHtml } from "#cds-ssr";
import yaml from "js-yaml";
import getOctokit from "./git-handler/git-handler";
import { encodeTarget, type TargetOption } from "./handler.rules";

const GIT = { owner: "AIAM", repo: "policies" };

export const resourcesUrl = (agentId: string) => `/policies/AgentPolicies/${agentId}/resources`;

async function fetchGitFile(octokit: any, path: string): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({ ...GIT, path, ref: "main" });
    return Buffer.from((data as any).content, "base64").toString("utf-8");
  } catch (error) {
    console.error(`Failed to fetch Git file: ${path}`, error);
    return null;
  }
}

async function fetchResources(agentId: string): Promise<TargetOption[]> {
  const octokit = await getOctokit();
  const resources: TargetOption[] = [];
  const manifestRaw = await fetchGitFile(octokit, `${agentId}/agent_manifest.yaml`);
  if (!manifestRaw) return resources;

  const manifest = yaml.load(manifestRaw) as any;
  const mcpRequires = (manifest?.requires || []).filter((r: any) => r.kind === "mcp");

  await Promise.all(
    mcpRequires.map(async (server: any) => {
      const serverId = server.name as string;
      const serverName = server.displayName || serverId;

      resources.push({ value: encodeTarget("mcp", serverId, serverName), label: serverName, type: "mcp" });

      if (server.ref?.file) {
        const mcpRaw = await fetchGitFile(octokit, `${agentId}/${(server.ref.file as string).replace("./", "")}`);
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

/** GET /policies/AgentPolicies/{agentId}/resources → <option> elements for the datalist */
export async function RESOURCES(this: any, req: cds.Request) {
  const { agentId } = req.params[0];

  const resources = agentId ? await fetchResources(agentId).catch(() => [] as TargetOption[]) : [];

  const options = resources.map(r =>
    `<option value="${r.value}" label="${r.label}">${r.label}</option>`
  ).join("\n");

  return sendHtml(req, options);
}
