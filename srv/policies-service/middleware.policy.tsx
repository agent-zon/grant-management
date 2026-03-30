import cds from "@sap/cds";
import getOctokit from "./git-handler/git-handler";
import { GIT, safeJson, ensureDcnContainer } from "./handler.policy";
import "./middleware.resources";
import { getAgentManifestInfo } from "./middleware.agents";

/** Load version/policy data and attach to req.data (ref, dcn, rules). Resources loaded by resourcesMiddleware. */
export default async function (this: any, req: cds.Request) {
  const { agentId, agent, version } = req.data || {};
  console.log("policy - middleware", req.http?.req.method, req.http?.req.originalUrl, version, agentId, req.data, req.params);
  req.data = { ...req.data, agentId, version };
  if (agentId) {
    const octokit = await getOctokit();
    const branches = await octokit.rest.repos.listBranches({
      ...GIT,
      path: `${agentId}/policies.json`,
    });
    req.data.ref = branches.data.find((b: any) => b.name === version) ? version : "main";

    const response = await octokit.rest.repos.getContent({
      ...GIT,
      path: `${agentId}/policies.json`,
      ref: req.data.ref,
    });

    const raw = safeJson(Buffer.from((response.data as any).content, "base64").toString("utf-8"), null);
    req.data.dcn = ensureDcnContainer(raw);
  }
}
