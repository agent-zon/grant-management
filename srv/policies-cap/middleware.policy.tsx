import cds from "@sap/cds";
import getOctokit from "./git-handler/git-handler";
import { GIT, safeJson, ensureOdrlSet } from "./handler.policy";
import { fetchResources } from "./middleware.policy.resources";
import { getAgentManifestInfo } from "./middleware.agents";

/** Load version/policy data and attach to req.data (ref, policy, rules). Resources loaded by resourcesMiddleware. */
export default async  function (this: any, req: cds.Request) {
  const { agentId } = req.params[0] || {};
  const { version } = req.params[1] || req.data || {};
  console.log("version - middleware",req.http?.req.originalUrl, req.http?.req.method, version, agentId ,req.data, req
    .params
   );
  req.data = { ...req.data, agentId,version };
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
    req.data.odrl = ensureOdrlSet(raw);
    req.data.resources = await fetchResources(agentId, req.data.ref);
    req.data.agent = await getAgentManifestInfo(octokit, agentId, req.data.ref);
   }
}
