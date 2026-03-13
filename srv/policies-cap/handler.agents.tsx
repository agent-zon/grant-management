import cds from "@sap/cds";
import { render } from "#cds-ssr";
import getOctokit from "./git-handler/git-handler";
import { FullPage } from "./handler.agents.view";

const GIT = { owner: "AIAM", repo: "policies" };
const BASE = "/policies/AgentPolicies";


export default async function LIST(this: any, req: cds.Request) {
  const { agentId } = req.params[0] || {};
  if (agentId) return agentData(agentId);
  return allAgentsData();

  async function agentData(agentId: string) {
    const octokit = await getOctokit();
    const { data } = await octokit.rest.repos.getContent({ ...GIT, path: `${agentId}/policies.json` });
    return JSON.parse(Buffer.from(data.content, "base64").toString("utf-8"));
  }

  async function allAgentsData() {
    const octokit = await getOctokit();
    const { data } = await octokit.rest.repos.getContent({ ...GIT, path: "" });
    return (Array.isArray(data) ? data : [data])
      .filter((i: any) => i.type === "dir")
      .map((i: any) => i.name as string)
      .sort();
  }
}


