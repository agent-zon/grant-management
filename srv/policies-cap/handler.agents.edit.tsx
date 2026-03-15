import cds from "@sap/cds";
import { sendHtml } from "#cds-ssr";
import getOctokit from "./git-handler/git-handler";
import { branchFromRequest, branchToVersion } from "./git-version";

const GIT = { owner: "AIAM", repo: "policies" };
const BASE = "/admin/agents";


// ─── CDS handler: AgentPolicies/edit → redirect to versions/<version>/edit ─────

/** GET AgentPolicies/agent-123/edit → redirect to AgentPolicies/agent-123/versions/<version>/edit */
export async function GET_REDIRECT(this: any, req: cds.Request) {
  const { agentId } = req.params[0] || {};

  const branch = branchFromRequest(req, agentId);
  const version = branchToVersion(branch);

  return req.http?.res?.redirect(302, `${BASE}/${agentId}/versions('${version}')/edit`);
}
