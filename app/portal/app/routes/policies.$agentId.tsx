import React from "react";
import { Link } from "react-router";
import { ArrowLeft, AlertCircle } from "lucide-react";
import type { Route } from "./+types/policies.$agentId";
import { SidebarLayout } from "~/components/layouts/SidebarLayout";
import { AgentsSidebar } from "~/components/policies/AgentsSidebar";
import { PolicyViewer } from "~/components/policies/PolicyViewer";
import {
  getAllAgents,
  getAgentPolicies,
  getAgentManifest,
  PoliciesApiError,
} from "~/lib/api/policies-client";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `${params.agentId} - Policy Management` },
    {
      name: "description",
      content: `View and manage policies for agent ${params.agentId}`,
    },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const { agentId } = params;

  try {
    // Fetch all agents for the sidebar
    const agentsPromise = getAllAgents();

    // Fetch the specific agent's policies
    const agentPromise = getAgentPolicies(agentId);

    // Fetch the agent manifest (optional, may not exist)
    const manifestPromise = getAgentManifest(agentId).catch((error) => {
      console.warn(`Manifest not found for agent ${agentId}:`, error);
      return null;
    });

    const [agents, agent, manifest] = await Promise.all([
      agentsPromise,
      agentPromise,
      manifestPromise,
    ]);

    return {
      agents,
      agent,
      manifest,
      error: null,
    };
  } catch (error) {
    console.error("Failed to load agent policies:", error);

    // Still try to load the agents list for the sidebar
    let agents = [];
    try {
      agents = await getAllAgents();
    } catch (agentsError) {
      console.error("Failed to load agents list:", agentsError);
    }

    return {
      agents,
      agent: null,
      manifest: null,
      error:
        error instanceof PoliciesApiError
          ? error.message
          : "Failed to load agent policies",
    };
  }
}

export default function PoliciesAgentDetail({
  loaderData,
}: Route.ComponentProps) {
  const { agents, agent, manifest, error } = loaderData;

  return (
    <SidebarLayout
      title="Agents"
      sidebar={<AgentsSidebar agents={agents} />}
    >
      {error || !agent ? (
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Policy Management
              </h2>
              <Link
                to="/policies"
                className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Policies</span>
              </Link>
            </div>
          </div>

          {/* Error State */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Failed to Load Policies
              </h3>
              <p className="text-gray-400 mb-6">{error}</p>
              <div className="flex items-center justify-center space-x-4">
                <Link
                  to="/policies"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Back to Policies
                </Link>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <PolicyViewer agent={agent} manifest={manifest || undefined} />
      )}
    </SidebarLayout>
  );
}
