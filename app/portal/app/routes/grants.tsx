import React from "react";
import {
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Key,
  Lock,
  Unlock,
  Activity,
  Bot,
  Cpu,
  ShieldCheck,
} from "lucide-react";
import { useActionData, useFetcher, Link, useLocation } from "react-router";
import type { Route } from "./+types/grants.ts";
import type { ConsentGrant } from "./grants.$id._index.tsx";
import { action as grantAction } from "./grants.$id.grant.tsx";
import { generateConsentData } from "../grants.db.ts";

// interface ConsentGrant {
//   id: string;
//   scope: string;
//   description: string;
//   granted: boolean;
//   grantedAt?: string;
//   expiresAt?: string;
//   sessionId?: string;
//   usage: number;
//   lastUsed?: string;
//   toolsIncluded: string[];
//   requester?: 'resource_owner' | 'client' | 'authorization_server' | 'guard';
//   requesterId?: string;
//   riskLevel: 'low' | 'medium' | 'high';
//   category: 'file-system' | 'data-access' | 'system-admin' | 'network' | 'analytics';
// }


// Store current state in memory (in a real app, this would be in database)
const currentConsentData = generateConsentData();

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Consent Management - Agent Grants" },
    {
      name: "description",
      content: "Manage your consent grants and permissions",
    },
  ];
}

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const workloadFilter = url.searchParams.get("workload");
  const sessionFilter = url.searchParams.get("session");

  let filteredGrants = currentConsentData.grants;

  // Apply workload filter
  if (workloadFilter) {
    const workloadSessionMap: Record<string, string> = {
      "wl-001": "S123",
      "wl-002": "S124",
      "wl-004": "S125",
      "wl-005": "S126",
    };
    const targetSession = workloadSessionMap[workloadFilter];
    if (targetSession) {
      filteredGrants = currentConsentData.grants.filter(
        (grant) => grant.sessionId === targetSession
      );
    }
  }

  // Apply session filter
  if (sessionFilter) {
    filteredGrants = currentConsentData.grants.filter(
      (grant) => grant.sessionId === sessionFilter
    );
  }

  return {
    grants: filteredGrants,
    tokens: currentConsentData.tokens,
    requests: currentConsentData.requests,
    workloadFilter,
    sessionFilter,
  };
}

export default function ConsentManagement({
  loaderData,
}: Route.ComponentProps) {
  const { grants, tokens, requests, workloadFilter, sessionFilter } =
    loaderData;

  const getWorkloadName = (workloadId: string) => {
    const workloadNames: Record<string, string> = {
      "wl-001": "Daily Work Analysis & Reports",
      "wl-002": "System Anomaly Response",
      "wl-004": "File Management Assistant",
      "wl-005": "Payroll Assistance Chat",
    };
    return workloadNames[workloadId] || workloadId;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">
                {workloadFilter
                  ? `Workload ${getWorkloadName(workloadFilter)} Grants`
                  : sessionFilter
                  ? `Session ${sessionFilter} Grants`
                  : "Grant Management Dashboard"}
              </h2>
              {(workloadFilter || sessionFilter) && (
                <p className="text-sm text-blue-400 mt-1">
                  {workloadFilter ? "Workload-specific" : "Session-specific"}{" "}
                  consent grants
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {(workloadFilter || sessionFilter) && (
                <Link
                  to="/grants"
                  className="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  ← Back to All Grants
                </Link>
              )}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-400">Live Monitoring</span>
              </div>
            </div>
          </div>
        </div>

         

        {/* Consent Grants */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-white">
              Your Consent Grants
            </h3>
            <span className="text-sm text-gray-400">
              {grants.length} grants • {grants.filter((g) => g.granted).length}{" "}
              active
            </span>
          </div>

          <div className="space-y-4">
            {grants.map((grant) => (
              <GrantCard key={grant.id} {...grant} />
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Active Grants</p>
                <p className="text-xl font-bold text-white">
                  {grants.filter((g) => g.granted).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Key className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Active Tokens</p>
                <p className="text-xl font-bold text-white">
                  {tokens.filter((t) => t.status === "active").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Pending Requests</p>
                <p className="text-xl font-bold text-white">
                  {requests.filter((r) => r.status === "pending").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Usage</p>
                <p className="text-xl font-bold text-white">
                  {grants.reduce((sum, g) => sum + g.usage, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GrantCard(grant: ConsentGrant) {
  const location = useLocation();
  return (
    <div>
      {!grant ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div
                className={`p-2 rounded-lg ${
                  grant.granted ? "bg-green-500/20" : "bg-red-500/20"
                }`}
              >
                {grant.granted ? (
                  <Unlock className="w-5 h-5 text-green-400" />
                ) : (
                  <Lock className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div>
                <Link
                  to={`/grants/${grant.id}`}
                  className="text-sm font-medium text-white hover:text-blue-300 transition-colors"
                >
                  {grant.scope}
                </Link>
                <p className="text-xs text-gray-400">{grant.description}</p>
                {grant.requester && grant.requesterId && (
                  <div className="flex items-center space-x-2 mt-2">
                    <div
                      className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getRequesterColor(
                        grant.requester
                      )}`}
                    >
                      {getRequesterIcon(grant.requester)}
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {grant.requesterId}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span
                className={`px-2 py-1 text-xs rounded ${
                  grant.granted
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {grant.granted ? "Granted" : "Denied"}
              </span>

              {/* Individual Grant/Revoke Links */}
              <div className="flex space-x-2">
                {!grant.granted ? (
                  <Link
                    to={`/grants/${grant.id}/grant?redirect_url=${location.pathname}`}
                    className="text-xs text-green-400 hover:text-green-300 underline"
                  >
                    Grant
                  </Link>
                ) : (
                  <Link
                    to={`/grants/${grant.id}/revoke?redirect_url=${location.pathname}`}
                    className="text-xs text-red-400 hover:text-red-300 underline"
                  >
                    Revoke
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Grant Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            <div>
              <p className="text-xs text-gray-400">Usage Count</p>
              <p className="text-sm text-white font-mono">{grant.usage}</p>
            </div>
            {grant.grantedAt && (
              <div>
                <p className="text-xs text-gray-400">Granted At</p>
                <p className="text-sm text-white">
                  {new Date(grant.grantedAt).toLocaleString()}
                </p>
              </div>
            )}
            {grant.sessionId && (
              <div>
                <p className="text-xs text-gray-400">Session</p>
                <div className="flex items-center space-x-2">
                 
                  <Link
                    to={`/grants?session=${grant.sessionId}`}
                    className="text-sm text-blue-400 hover:text-blue-300 underline transition-colors duration-200"
                    title="View session grants"
                  >
                    {grant.sessionId}
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Included Tools */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Included Tools</p>
            <div className="flex flex-wrap gap-1">
              {grant.toolsIncluded.map((tool, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper functions for requester display
  function getRequesterIcon(requester: string) {
    switch (requester) {
      case "resource_owner":
        return <User className="w-4 h-4" />;
      case "client":
        return <Bot className="w-4 h-4" />;
      case "authorization_server":
        return <Cpu className="w-4 h-4" />;
      case "agent":
        return <ShieldCheck className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  }

  function getRequesterColor(requester: string) {
    switch (requester) {
      case "resource_owner":
        return "text-blue-500 bg-blue-100 dark:bg-blue-900/20";
      case "client":
        return "text-purple-500 bg-purple-100 dark:bg-purple-900/20";
      case "authorization_server":
        return "text-green-500 bg-green-100 dark:bg-green-900/20";
      case "guard":
        return "text-orange-500 bg-orange-100 dark:bg-orange-900/20";
      default:
        return "text-gray-500 bg-gray-100 dark:bg-gray-900/20";
    }
  }
 
}
