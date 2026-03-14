import cds from "@sap/cds";
import getOctokit from "./git-handler/git-handler";

const GIT = { owner: "AIAM", repo: "policies" };

/** Load agents or single agent data and attach to req.data */
export async function agentsDataMiddleware(this: any, req: cds.Request) {
  const { agentId } = req.params?.[0] || {};
  const octokit = await getOctokit();
  req.data = req.data || {};

  if (agentId) {
    try {
      const { data } = await octokit.rest.repos.getContent({ ...GIT, path: `${agentId}/policies.json` });
      req.data.agents = JSON.parse(Buffer.from((data as any).content, "base64").toString("utf-8"));
    } catch {
      req.data.agents = null;
    }
  } else {
    const { data } = await octokit.rest.repos.getContent({ ...GIT, path: "" });
    req.data.agents = (Array.isArray(data) ? data : [data])
      .filter((i: any) => i.type === "dir")
      .map((i: any) => i.name as string)
      .sort();
  }
}

/** READ handler — returns pre-loaded req.data.agents */
export default async function LIST_DATA(this: any, req: cds.Request) {
  return req.data?.agents;
}
