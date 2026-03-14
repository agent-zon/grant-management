import cds from "@sap/cds";
import getOctokit from "./git-handler/git-handler";
import { branchFromRequest } from "./git-version";

const GIT = { owner: "AIAM", repo: "policies" };

/** Load versions or single version content and attach to req.data */
export async function versionDataMiddleware(this: any, req: cds.Request) {
    const { agentId } = req.params[0] || {};
    const { version } = req.params[1] || req.data || {};
    req.data = {
        ...req.data,
        agentId
    }
    const octokit = await getOctokit();
    const branches = await octokit.rest.repos.listBranches({
        ...GIT,
        path: `${agentId}/policies.json`,
    });
    const ref = branches.data.find((b: any) => b.name === version) ? version : "main";
    const response = await octokit.rest.repos.getContent({
        ...GIT,
        path: `${agentId}/policies.json`,
        ref: ref,
    });


    req.data.policy = Buffer.from((response.data as any).content, "base64").toString("utf-8");

}



/** READ handler — returns pre-loaded req.data.versionContent */
export default async function GET_VERSION(this: any, req: cds.Request) {
    return req.data?.policy;
}
