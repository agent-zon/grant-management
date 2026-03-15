import cds from "@sap/cds";
import { render, sendHtml } from "#cds-ssr";
import getOctokit from "./git-handler/git-handler";
import { branchFromRequest, branchToVersion } from "./git-version";

const BASE = "/admin/agents";


// ─── CDS handler: AgentPolicies/edit → redirect to versions/<version>/edit ─────

/** GET AgentPolicies/agent-123/edit → redirect to AgentPolicies/agent-123/versions/<version>/edit */
export default async function (this: any, req: cds.Request) {
  const { agentId } = req.data;

  const branch = branchFromRequest(req, agentId);
  const version = branchToVersion(branch);

  return render(req, <div className="flex flex-col h-full p-6 space-y-5 max-w-3xl mx-auto bg-gray-50">
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2 mt-1">
         <h2 className="text-xl font-bold text-gray-900 font-mono">{agentId}</h2>
        </div>
      </div>
    </div>

    <div hx-get={`versions/${version}/edit`} hx-trigger="load" hx-push-url="true" hx-swap="innerHTML" className="min-h-[8rem]" />

  </div>
  );
}
