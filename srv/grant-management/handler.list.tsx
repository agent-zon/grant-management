import React from "react";
import cds from "@sap/cds";
import {
  Grants,
  Consents,
  AuthorizationDetail,
  Consent,
} from "#cds-models/GrantsManagementService";
import type { GrantsManagementService } from "../grant-management.tsx";
// import type GrantsManagementService from "#cds-models/GrantsManagementService";

// type InstanceGrant = InstanceType<typeof Grants>;
// type AfterGrant = (
//   grants: InstanceGrant[],
//   req: InstanceType<typeof cds.Request>
// ) => InstanceGrant[] | Response | void;

export default function grantList(srv: GrantsManagementService) {
  //@ts-ignore
  srv.after("READ", Grants, async function (data, req) {
    if (cds.context?.http?.req.accepts("html") && data && !req.data.id) {
      const totalGrants = data.length;
      const activeGrants = (await srv.run(
        cds.ql.SELECT.columns(["*", "authorization_details"]).from(Consents)
      )) as Consents;
      const authorization_details = await srv.run(
        cds.ql.SELECT.from(AuthorizationDetail)
      );

      const grants = Object.values(
        activeGrants.reduce(
          (acc, consent) => {
            const consents = [
              ...(acc[consent.grant_id]?.consents || []),
              consent,
            ];
            acc[consent.grant_id] = {
              id: consent.grant_id,
              consents: consents,
              authorization_details: [
                ...(acc[consent.grant_id]?.authorization_details || []),
                ...authorization_details.filter(
                  (detail) => detail.consent_grant_id === consent.grant_id
                ),
              ],
              scope: consents
                .map((c) => c.scope)
                .filter(unique)
                .join(" "),
              subject: consents
                .map((c) => c.subject)
                .filter(unique)
                .join(" "),
              actor: consents
                .map((c) => c.actor)
                .filter(unique)
                .join(" "),
              risk_level: consents
                .map((c) => c.risk_level)
                .filter(unique)
                .join(" "),
              status: consents
                .map((c) => c.status)
                .filter(unique)
                .join(" "),
              createdAt: consent[0]?.createdAt,
              updatedAt: consent[0]?.updatedAt,
            };
            return acc;
          },
          {} as Record<
            string,
            {
              consents: Consent[];
              authorization_details: AuthorizationDetail[];
            }
          >
        )
      );

      console.log("🔧 Active grants:", activeGrants, authorization_details);
      console.log("🔧 Active grants:", activeGrants.length);
      return cds.context?.render(
        <div className="min-h-screen bg-gray-950 text-white">
          <div className="container mx-auto px-4 py-8 space-y-6">
            {/* Header */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Grant Management Dashboard
                  </h1>
                  <p className="text-sm text-blue-400 mt-1">
                    Manage consent grants and permissions
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    👤 Showing grants for current user
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-400">
                      Live Monitoring
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <div className="w-5 h-5 text-green-400">✅</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Active Grants</p>
                    <p className="text-xl font-bold text-white">
                      {activeGrants.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <div className="w-5 h-5 text-blue-400">🔑</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Grants</p>
                    <p className="text-xl font-bold text-white">
                      {totalGrants}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <div className="w-5 h-5 text-yellow-400">⏰</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Expired</p>
                    <p className="text-xl font-bold text-white">
                      {grants.filter((g) => g.status === "expired").length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <div className="w-5 h-5 text-red-400">🚫</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Revoked</p>
                    <p className="text-xl font-bold text-white">
                      {grants.filter((g) => g.status === "revoked").length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Grants List */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-white">
                  Your Consent Grants
                </h3>
                <span className="text-sm text-gray-400">
                  {totalGrants} grants • {activeGrants.length || 0} active
                </span>
              </div>

              <div className="space-y-4">
                {grants.map((grant) => (
                  <div
                    key={grant.id}
                    className="bg-gray-700/50 rounded-lg p-4 border border-gray-600"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-2 rounded-lg ${
                            grant.status === "active"
                              ? "bg-green-500/20"
                              : "bg-red-500/20"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 ${
                              grant.status === "active"
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {grant.status === "active" ? "🔓" : "🔒"}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {grant.scope}
                          </p>
                          <p className="text-xs text-gray-400">
                            Client: {grant.client_id}
                          </p>
                          <p className="text-xs text-purple-400">
                            👤 Subject: {grant.subject}
                          </p>
                          {grant.actor && (
                            <p className="text-xs text-blue-400">
                              🤖 Actor: {grant.actor}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-1">
                            <span
                              className={`px-2 py-1 text-xs rounded ${
                                grant.risk_level === "high"
                                  ? "bg-red-500/20 text-red-400"
                                  : grant.risk_level === "medium"
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-green-500/20 text-green-400"
                              }`}
                            >
                              {grant.risk_level} risk
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            grant.status === "active"
                              ? "bg-green-500/20 text-green-400"
                              : grant.status === "expired"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {grant.status}
                        </span>
                        <div className="flex space-x-2">
                          <a
                            href={`Grants/${grant.id}`}
                            className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors duration-200"
                          >
                            View Details
                          </a>
                          {grant.status === "active" && (
                            <button
                              hx-delete={`Grants/${grant.id}`}
                              className="text-xs text-red-400 hover:text-red-300 underline transition-colors duration-200"
                            >
                              <a className="text-xs text-red-400 hover:text-red-300 underline transition-colors duration-200">
                                Revoke
                              </a>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Grant Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-400">Grant ID</p>
                        <p className="text-sm text-white font-mono">
                          {grant.id}
                        </p>
                      </div>
                      {grant.createdAt && (
                        <div>
                          <p className="text-xs text-gray-400">Granted At</p>
                          <p className="text-sm text-white">
                            {new Date(grant.createdAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-400">Risk Level</p>
                        <p className="text-sm text-white capitalize">
                          {grant.risk_level}
                        </p>
                      </div>
                    </div>

                    {/* Scope Details */}
                    <div>
                      <p className="text-xs text-gray-400 mb-2">
                        Granted Scopes
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {grant.scope
                          ?.split(" ")
                          .map((scope: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded"
                            >
                              {scope}
                            </span>
                          ))}
                      </div>
                    </div>

                    {/* Authorization Details */}
                    {grant.authorization_details &&
                      grant.authorization_details.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-400 mb-2">
                            Authorization Details
                          </p>
                          <div className="space-y-2">
                            {grant.authorization_details
                              .map((d) => d.type)
                              .filter(unique)
                              .map((type: string, idx: number) => (
                                <div
                                  key={idx}
                                  className="bg-gray-600/30 rounded p-2 border border-gray-600"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-purple-300">
                                      {type}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {grant.authorization_details
                                        .filter((d) => d.type === type)
                                        .map((d) => d.locations)
                                        .filter(Boolean)
                                        .flat()
                                        .filter(unique)
                                        .join(", ") || "No locations"}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">
                                      {grant.authorization_details
                                        .filter((d) => d.type === type)
                                        .map((d) => d.actions)
                                        .filter(Boolean)
                                        .flat()
                                        .filter(unique)
                                        .join(", ") || "No actions"}
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                  </div>
                ))}

                {grants.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto mb-4 text-gray-400">
                      🔑
                    </div>
                    <h3 className="text-lg font-medium text-gray-400 mb-2">
                      No grants found
                    </h3>
                    <p className="text-sm text-gray-500">
                      No consent grants have been created yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return data;
  });
}

function unique(value: any, index: number, array: any[]): value is any {
  return array.indexOf(value) === index;
}
