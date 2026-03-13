import cds from "@sap/cds";
import { sendHtml } from "#cds-ssr";
import yaml from "js-yaml";
import getOctokit from "./git-handler/git-handler";
import { encodeTarget, type TargetOption } from "./handler.version.rules";
import { branchFromRequest } from "./git-version";

const GIT = { owner: "AIAM", repo: "policies" };

async function fetchGitFile(octokit: any, path: string, ref: string = "main"): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({ ...GIT, path, ref });
    return Buffer.from((data as any).content, "base64").toString("utf-8");
  } catch (error) {
    console.error(`Failed to fetch Git file: ${path}`, error);
    return null;
  }
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

function extractAgentIdVersion(req: any): { agentId: string; version: string } {
  const params = req?.params || [];
  const p0 = params[0] || {};
  const p1 = params[1] || {};
  const agentId = p0.agentId ?? p1.agentId ?? "";
  const version = p1.version ?? p0.version ?? "main";
  return { agentId, version };
}

/** GET AgentPolicyVersions/.../resources → <option> elements for the datalist */
export async function RESOURCES(this: any, req: cds.Request) {
  const { agentId } = extractAgentIdVersion(req);
  const branch = branchFromRequest(req, agentId);

  const resources = agentId ? await fetchResources(agentId, branch).catch(() => [] as TargetOption[]) : [];

  const options = resources.map(r =>
    `<option value="${r.value}" label="${r.label}">${r.label}</option>`
  ).join("\n");

  return sendHtml(req, options);
}
