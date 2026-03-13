import cds from "@sap/cds";
import getOctokit from "./git-handler/git-handler";

export default async function GET(this: any, req: cds.Request) {
    const params = req.params || [];
    const p0 = params[0] || {};
    const p1 = params[1] || {};
    const agentId = p0.agentId ?? p1.agentId ?? "";
    const version = p1.version ?? p0.version;

    if (version) return singleVersion();
    return await allVersions();

    async function singleVersion() {
        const octokit = await getOctokit()
        const response = await octokit.rest.repos.getContent({
            owner: "AIAM",
            repo: "policies",
            path: `${agentId}/policies.json`,
            ref: version
        });
        return Buffer.from(response.data.content, "base64").toString("utf-8");
    }

    async function allVersions() {
        const octokit = await getOctokit()
        const response = await octokit.rest.repos.listBranches({
            owner: "AIAM",
            repo: "policies",
            path: `${agentId}`,
        });
        return response.data.map((branch: any) => branch.name);
    }


}