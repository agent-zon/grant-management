import React from "react";
import { Link } from "react-router";
import { FileCode, ArrowLeft } from "lucide-react";
import type { Route } from "./+types/policies";
import { SidebarLayout } from "~/components/layouts/SidebarLayout";
import { AgentsSidebar } from "~/components/policies/AgentsSidebar";
import { getAllAgents, PoliciesApiError } from "~/lib/api/policies-client";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Policy Management - Agent Grants" },
    {
      name: "description",
      content: "Manage agent ODRL policies and manifests",
    },
  ];
}

export async function loader({}: Route.LoaderArgs) {
  try {
    const agents = await getAllAgents();
    return { agents, error: null };
  } catch (error) {
    console.error("Failed to load agents:", error);
    return {
      agents: [],
      error:
        error instanceof PoliciesApiError
          ? error.message
          : "Failed to load agents",
    };
  }
}

export default function PoliciesIndex({ loaderData }: Route.ComponentProps) {
  const { agents, error } = loaderData;

  return (
    <SidebarLayout
      title="Agents"
      sidebar={<AgentsSidebar agents={agents} error={error || undefined} />}
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Policy Management
              </h2>
              <p className="text-gray-400">
                Select an agent from the sidebar to view and manage its policies
              </p>
            </div>
            <Link
              to="/"
              className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Home</span>
            </Link>
          </div>
        </div>

        {/* Empty State */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-12">
          <div className="text-center max-w-md mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-4">
              <FileCode className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No Agent Selected
            </h3>
            <p className="text-gray-400 mb-6">
              Choose an agent from the sidebar to view its ODRL policies and
              manifest configuration.
            </p>
            {agents.length === 0 && !error && (
              <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-400">
                  No agents found in the system. Agents will appear here once
                  they are registered.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
