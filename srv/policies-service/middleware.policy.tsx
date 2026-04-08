import cds from "@sap/cds";
import getOctokit from "./git-handler/git-handler";
import { GIT, safeJson, ensureDcnContainer } from "./handler.policy";
import "./middleware.resources";

/** Load version/policy data from GitHub only: ref + policies.json DCN (no mcp-ams). */
export default async function (this: any, req: cds.Request): Promise<void> {
  const { agentId, version } = req.data || {};
  console.log("policy - middleware", req.http?.req.method, req.http?.req.originalUrl, version, agentId, req.data, req.params);
  req.data = { ...req.data, agentId, version };
  if (agentId) {
    const octokit = await getOctokit();
    const branches = await octokit.rest.repos.listBranches({
      ...GIT,
      path: `${agentId}/policies.json`,
    });
    req.data.ref = branches.data.find((b: any) => b.name === version) ? version : "main";

    const refStr = req.data.ref as string;
    const response = await octokit.rest.repos.getContent({
      ...GIT,
      path: `${agentId}/policies.json`,
      ref: refStr,
    });
    const content = Buffer.from((response.data as { content?: string }).content ?? "", "base64").toString("utf-8");
    const raw = safeJson(content, null);
    req.data.dcn = ensureDcnContainer(raw);
  }
}
