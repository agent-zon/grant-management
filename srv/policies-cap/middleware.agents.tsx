import cds from "@sap/cds";
import getOctokit from "./git-handler/git-handler";

const GIT = { owner: "AIAM", repo: "policies" };

/** Load agents or single agent data and attach to req.data */
export async function agentsDataMiddleware(this: any, req: cds.Request) {
  req.data = req.data || {};
  const octokit = await getOctokit();
  const { data } = await octokit.rest.repos.getContent({ ...GIT, path: "" });
  
  req.data.agents = (Array.isArray(data) ? data : [data])
    .filter((i: any) => i.type === "dir")
    .map((i: any) => i.name as string)
    .sort();

 const { agentId } = req.params[0] || {};
 req.data.agentId = agentId;
 
}


