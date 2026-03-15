import cds from "@sap/cds";
import getOctokit from "./git-handler/git-handler";
import type { PolicyRule } from "./handler.policy";

const GIT = { owner: "AIAM", repo: "policies" };

function rulesToOdrl(rules: PolicyRule[]) {
  const permission: any[] = [];
  const prohibition: any[] = [];
  for (const rule of rules) {
    const entry: any = {
      target: rule.target,
      action: "use",
      _metadata: { targetType: rule.targetType, targetName: rule.targetName },
    };
    if (rule.constraint && rule.constraintValue) {
      entry.constraint = [{ leftOperand: `sap:${rule.constraint}`, operator: "isPartOf", rightOperand: [rule.constraintValue] }];
    }
    if (rule.actionType === "deny") {
      prohibition.push(entry);
    } else {
      if (rule.actionType === "ask") { entry.duty = [{ action: "sap:obtainConsent" }]; entry.priority = 160; }
      permission.push(entry);
    }
  }
  return {
    "@context": ["http://www.w3.org/ns/odrl.jsonld", { sap: "https://sap.com/odrl/extensions/" }],
    "@type": "Set",
    permission,
    prohibition,
  };
}

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

/** Before UPDATE/save on versions: commit rules to Git. Throws on error. */
export async function pushMiddleware(this: any, req: cds.Request) {
  const { version, rules: rulesJson, agentId } = req.data || {};
  const ref = version || "main";

  const octokit = await getOctokit();
  await ensureBranchExists(octokit, version);

  const filePath = `${agentId}/policies.json`;
  const content = JSON.stringify(rulesToOdrl(JSON.parse(rulesJson)), null, 2);

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
