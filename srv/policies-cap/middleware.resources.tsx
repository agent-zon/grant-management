import cds from "@sap/cds";
import getOctokit from "./git-handler/git-handler";
import yaml from "js-yaml";

const GIT = { owner: "AIAM", repo: "policies" };

export type TargetOption = { value: string; label: string; type: "mcp" | "tool" };

export type ResourceEntry = {
  name: string;
  displayName: string;
  refFile?: string;
  sha?: string;
  enabled: boolean;
  value: string;
  label: string;
};

async function fetchGitFileWithSha(
  octokit: any,
  path: string,
  ref: string = "main"
): Promise<{ content: string; sha: string } | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({ ...GIT, path, ref });
    return {
      content: Buffer.from((data as any).content, "base64").toString("utf-8"),
      sha: (data as any).sha,
    };
  } catch {
    return null;
  }
}

function encodeTarget(type: "mcp" | "tool", id: string, name: string) {
  return `${type}|${id}|${name}`;
}

function toMcpPath(agentId: string, refFile: string): string {
  const relative = (refFile ?? "").replace(/^\.\//, "");
  return `${agentId}/${relative}`;
}

const YAML_EXT = /\.(yaml|yml)$/i;

/** List MCP file names from mcps dir (like agents). Returns lightweight entries (name, refFile) without fetching content. */
async function listMcpFileNames(
  octokit: any,
  agentId: string,
  ref: string = "main"
): Promise<{ name: string; refFile: string }[]> {
  const out: { name: string; refFile: string }[] = [];
  const mcpsPath = `${agentId}/mcps`;
  try {
    const { data } = await octokit.rest.repos.getContent({ ...GIT, path: mcpsPath, ref });
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      if ((item as any).type === "file" && YAML_EXT.test((item as any).name)) {
        const stem = (item as any).name.replace(YAML_EXT, "");
        out.push({ name: stem, refFile: `./mcps/${(item as any).name}` });
      }
      // if ((item as any).type === "dir") {
      //   const subPath = `${mcpsPath}/${(item as any).name}`;
      //   const sub = await octokit.rest.repos.getContent({ ...GIT, path: subPath, ref });
      //   const subItems = Array.isArray(sub.data) ? sub.data : [sub.data];
      //   for (const si of subItems) {
      //     if ((si as any).type === "file" && YAML_EXT.test((si as any).name)) {
      //       const stem = (si as any).name.replace(YAML_EXT, "");
      //       const relPath = `${(item as any).name}/${(si as any).name}`;
      //       out.push({ name: `${(item as any).name}/${stem}`, refFile: `./mcps/${relPath}` });
      //     }
      //   }
      // }
    }
  } catch {
    /* mcps dir may not exist */
  }
  return out;
}

/** Lightweight resource entry (from dir listing only). */
function toLightResource(agentId: string, version: string, name: string, refFile: string): ResourceEntry & { slug: string } {
  return {
    name,
    displayName: name,
    refFile,
    enabled: true, // unknown until fetched
    value: encodeTarget("mcp", name, name),
    label: name,
    slug: `agents/${agentId}/versions/${version}/resources/${encodeURIComponent(name)}`,
  };
}

/** Fetch one resource's full data from its MCP file. */
export async function fetchResourceById(
  agentId: string,
  ref: string,
  resourceId: string
): Promise<(ResourceEntry & { slug: string; update: (enabled: boolean) => Promise<void> }) | null> {
  const octokit = await getOctokit();
  const list = await listMcpFileNames(octokit, agentId, ref);
  const entry = list.find((e) => e.name === resourceId);
  if (!entry) return null;
  const path = toMcpPath(agentId, entry.refFile);
  const result = await fetchGitFileWithSha(octokit, path, ref);
  if (!result) return null;
  const mcp = yaml.load(result.content) as any;
  const displayName = mcp?.serverInfo?.title ?? mcp?.serverInfo?.name ?? entry.name;
  const meta = mcp?._meta ?? {};
  const enabled = meta["sap/enabled"] !== undefined ? Boolean(meta["sap/enabled"]) : true;

  const version = ref;
  const r: ResourceEntry & { slug: string; update: (enabled: boolean) => Promise<void> } = {
    name: entry.name,
    displayName,
    refFile: entry.refFile,
    sha: result.sha,
    enabled,
    value: encodeTarget("mcp", entry.name, displayName),
    label: displayName,
    slug: `agents/${agentId}/versions/${version}/resources/${encodeURIComponent(entry.name)}`,
    update: async (e: boolean) => {
      await updateResourceFileEnabled(agentId, ref, entry.name, entry.refFile, r.sha, e);
    },
  };
  return r;
}

/** Set req.data.resources from dir listing (lightweight). When resource ID present, fetch that file and set req.data.resource. */
export async function resourcesMiddleware(this: any, req: cds.Request) {
  req.data = req.data || {};
  const agentId = req.data.agentId;
  const ref = req.data.ref ?? req.data.version ?? "main";
  const resourceName = (req.params?.[2] as any)?.resource ?? (req.params?.[2] as any)?.name;
  
  if (!agentId) {
    req.data.resources = [];
    req.data.resource = null;
    return;
  }
  req.data.agentId = agentId;
  const octokit = await getOctokit();
  const list = await listMcpFileNames(octokit, agentId, ref);
  const version = ref;

  req.data.resources = list.map((e) => toLightResource(agentId, version, e.name, e.refFile));

  if (resourceName) {
    req.data.resource = await fetchResourceById(agentId, ref, resourceName);
  } else {
    req.data.resource = null;
  }
}

/** Update one resource's enabled flag in its MCP file (_meta['sap/enabled']). Uses sha from fetch for optimistic locking. */
async function updateResourceFileEnabled(
  agentId: string,
  ref: string,
  resourceName: string,
  refFile: string,
  savedSha: string | undefined,
  enabled: boolean
): Promise<void> {
  const octokit = await getOctokit();
  const path = toMcpPath(agentId, refFile);
  const result = await fetchGitFileWithSha(octokit, path, ref);
  if (!result?.content) throw new Error(`Resource file not found: ${path}`);
  const doc = yaml.load(result.content) as any;
  if (!doc._meta) doc._meta = {};
  doc._meta["sap/enabled"] = enabled;
  const content = yaml.dump(doc, { indent: 2 });
  const sha = result.sha ?? savedSha;
  if (!sha) throw new Error(`Cannot update resource: missing file sha`);
  await octokit.rest.repos.createOrUpdateFileContents({
    ...GIT,
    path,
    message: `Agent ${agentId}: set resource ${resourceName} enabled=${enabled}`,
    content: Buffer.from(content, "utf8").toString("base64"),
    sha,
    branch: ref,
  });
}
