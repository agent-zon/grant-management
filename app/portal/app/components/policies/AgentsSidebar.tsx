import React, { useState } from "react";
import { Link, useParams } from "react-router";
import { FolderOpen, Search, AlertCircle, Loader2 } from "lucide-react";
import type { AgentPolicies } from "~/types/policies";

interface AgentsSidebarProps {
  agents: AgentPolicies[];
  isCollapsed?: boolean;
  isLoading?: boolean;
  error?: string;
}

export function AgentsSidebar({
  agents,
  isCollapsed = false,
  isLoading = false,
  error,
}: AgentsSidebarProps) {
  const { agentId } = useParams();
  const [searchTerm, setSearchTerm] = useState("");

  // Filter agents based on search term
  const filteredAgents = agents.filter((agent) =>
    agent.agentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isCollapsed) {
    return (
      <div className="p-2 space-y-2">
        {agents.map((agent) => (
          <Link
            key={agent.agentId}
            to={`/policies/${agent.agentId}`}
            className={`
              block p-2 rounded-lg transition-colors
              ${
                agentId === agent.agentId
                  ? "bg-blue-600/20 border-l-4 border-blue-500"
                  : "hover:bg-gray-700/50"
              }
            `}
            title={agent.agentId}
          >
            <FolderOpen className="w-5 h-5" />
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Agent Count */}
      <div className="px-4 pb-2">
        <p className="text-xs text-gray-400">
          {filteredAgents.length} agent{filteredAgents.length !== 1 ? "s" : ""}
          {searchTerm && ` (filtered from ${agents.length})`}
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">Error</p>
                <p className="text-xs text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agents List */}
      {!isLoading && !error && (
        <div className="flex-1 overflow-y-auto">
          {filteredAgents.length === 0 ? (
            <div className="p-4">
              <div className="text-center py-8">
                <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-400">
                  {searchTerm ? "No agents found" : "No agents available"}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="text-xs text-blue-400 hover:text-blue-300 mt-2"
                  >
                    Clear search
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredAgents.map((agent) => (
                <Link
                  key={agent.agentId}
                  to={`/policies/${agent.agentId}`}
                  className={`
                    block px-4 py-3 rounded-lg transition-all duration-200
                    ${
                      agentId === agent.agentId
                        ? "bg-blue-600/20 border-l-4 border-blue-500 pl-3"
                        : "bg-gray-700/30 hover:bg-gray-700/50 border-l-4 border-transparent"
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    <FolderOpen
                      className={`w-5 h-5 flex-shrink-0 ${
                        agentId === agent.agentId
                          ? "text-blue-400"
                          : "text-gray-400"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          agentId === agent.agentId
                            ? "text-blue-300"
                            : "text-white"
                        }`}
                      >
                        {agent.agentId}
                      </p>
                      {agent.modifiedAt && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Modified: {new Date(agent.modifiedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
