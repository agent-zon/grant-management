import cds from "@sap/cds";
import getOctokit from "./git-handler/git-handler";
import { GIT, safeJson, odrlToRules } from "./handler.policy";
import { fetchResources } from "./middleware.policy.resources";

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

    req.data.odrl = safeJson(Buffer.from((response.data as any).content, "base64").toString("utf-8"), []);
    req.data.rules = odrlToRules(req.data.odrl);
    console.log("rules - middleware", req.data.rules?.length);
    req.data.resources = await fetchResources(agentId, req.data.ref);
    console.log("resources - middleware", req.data.resources?.length);
  }
}
