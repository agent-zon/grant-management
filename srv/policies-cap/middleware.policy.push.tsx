import cds from "@sap/cds";
import getOctokit from "./git-handler/git-handler";
import type { OdrlSet } from "./handler.policy";

const GIT = { owner: "AIAM", repo: "policies" };

async function ensureBranchExists(octokit: any, branch: string): Promise<void> {
  if (!branch || branch === "main") return;
  try {
    await octokit.rest.repos.getBranch({ ...GIT, branch });
    return;
  } catch {
    /* branch not found, create it */
  }
  const { data: main } = await octokit.rest.repos.getBranch({ ...GIT, branch: "main" });
  await octokit.rest.git.createRef({
    ...GIT,
    ref: `refs/heads/${branch}`,
    sha: main.commit.sha,
  });
}

/** Before UPDATE/save on versions: commit ODRL (or rules) to Git. Throws on error. */
export async function pushMiddleware(this: any, req: cds.Request) {
  const { version, odrl: odrlRaw, agentId } = req.data || {};
  const ref = version || "main";

  let odrl: OdrlSet;
  if (odrlRaw != null) {
    odrl = typeof odrlRaw === "string" ? JSON.parse(odrlRaw) : odrlRaw;
  } else {
    throw new Error("Missing odrl in request; include [name=odrl] when publishing.");
  }

  const octokit = await getOctokit();
  await ensureBranchExists(octokit, version);

  const filePath = `${agentId}/policies.json`;
  const content = JSON.stringify(odrl, null, 2);

  let sha: string | undefined;
  try { sha = ((await octokit.rest.repos.getContent({ ...GIT, path: filePath, ref })).data as any).sha; } catch { /* new file */ }

  await octokit.rest.repos.createOrUpdateFileContents({
    ...GIT,
    path: filePath,
    message: `Update policies for agent ${agentId}`,
    content: Buffer.from(content, "utf8").toString("base64"),
    ...(sha ? { sha } : {}),
    branch: ref,
  });
}

/** Merge a branch into main. No-op if branch is main. Throws on error. */
export async function mergeBranchToMain(branch: string): Promise<void> {
  if (!branch || branch === "main") return;
  const octokit = await getOctokit();
  await octokit.rest.repos.merge({
    ...GIT,
    base: "main",
    head: branch,
  });
}
