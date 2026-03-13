import cds from "@sap/cds";
import { render } from "#cds-ssr";
import getOctokit from "./git-handler/git-handler";
import { FullPage } from "./handler.list";

const GIT = { owner: "AIAM", repo: "policies" };
const BASE = "/policies/AgentPolicies";

// ─── Data ─────────────────────────────────────────────────────────────────────


// ─── CDS handler ──────────────────────────────────────────────────────────────

export default async function LIST(this: any, req: cds.Request) {
  const octokit = await getOctokit();
  const { data } = await octokit.rest.repos.getContent({ ...GIT, path: "" });
  return (Array.isArray(data) ? data : [data])
    .filter((i: any) => i.type === "dir")
    .map((i: any) => i.name as string)
    .sort();
}
