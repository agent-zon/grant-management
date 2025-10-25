import cds from "@sap/cds";
import type {
  GrantHandler,
  GrantsHandler,
  GrantsManagementService,
} from "./grant-management.tsx";
import { isNativeError } from "node:util/types";
import type {Grants, Grant} from "#cds-models/sap/scai/grants/GrantsManagementService";

export function POST(
  this: GrantsManagementService,
  ...[req, next]: Parameters<GrantHandler>
) {
  console.log("🔑 TODO: Implement grant update");
  return cds.context?.http?.res.redirect(`/grants-management/Grants`);
} 
export async function GET(
  this: GrantsManagementService,
  ...[req, next]: Parameters<GrantsHandler>
) {
  console.log("🔧 GET request:", req.data);

  // Only handle single grant requests
  if (!req.query.SELECT?.one) {
    return await next(req);
  }

  // If JSON requested (API), bypass UI pipeline and read directly from DB
  if (cds.context?.http?.req && cds.context.http.req.accepts("html") === false) {
    const id = req.data?.id as string | undefined;
    if (id) {
      const row = await cds.run(
        cds.ql.SELECT.one.from("sap.scai.grants.Grants").where({ id })
      );
      if (row) return row as any;
    }
  }

  let grant = await next(req);
  console.log("🔧 Grant:", grant);
  console.log(
    "🔧 GET response:",
    !!grant,
    !isNativeError(grant),
    cds.context?.http?.req.accepts("html")
  );
  // Fallback: if JSON requested and no valid grant returned, fetch directly from DB
  if (
    req.query.SELECT?.one &&
    cds.context?.http?.req.accepts("html") === false &&
    (!isGrant(grant) || !grant.id)
  ) {
    const id = req.data?.id as string | undefined;
    if (id) {
      const row = await cds.run(
        cds.ql.SELECT.one.from("sap.scai.grants.Grants").where({ id })
      );
      if (row) return row as any;
    }
  }
  if (
    isGrant(grant) &&
    cds.context?.http?.req.accepts("html")
  ) {
    return cds.context?.render(
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 text-white">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Modal-style Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <a
                href="/grants-management/Grants"
                className="w-10 h-10 bg-white/10 hover:bg-white/15 rounded-xl flex items-center justify-center transition-colors border border-white/20"
              >
                <span className="text-lg text-white">←</span>
              </a>
              <div>
                <h1 className="text-xl font-bold text-white">Grant Details</h1>
                <p className="text-sm text-slate-400">
                  Manage permissions & access
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${grant.status !== "revoked" ? "bg-emerald-400" : "bg-red-400"}`}
              ></div>
              <span className="text-sm text-slate-300 capitalize">
                {grant.status !== "revoked" ? "Active" : "Revoked"}
              </span>
            </div>
          </div>

          {/* Application Info Card */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-6">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                <span className="text-2xl">🔑</span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-1">
                  {grant.client_id || "Unknown Application"}
                </h2>
                <p className="text-slate-400 mb-3">
                  {grant.actor
                    ? `🤖 ${grant.actor.replace("urn:agent:", "").replace("-v1", "").replace("-v2", "").replace("-v3", "")}`
                    : "Direct Access"}
                </p>

                {/* Risk Badge */}
                <div className="flex items-center space-x-3">
                  <div
                    className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium border ${getRiskColor(grant.risk_level || "low")}`}
                  >
                    <span>⚠️</span>
                    <span className="capitalize">
                      {grant.risk_level || "low"} Risk
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    ID: {grant.id?.slice(-8) || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Risk Warning */}
            {grant.risk_level === "high" && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <span className="text-red-400 mt-0.5 text-lg">⚠️</span>
                  <div>
                    <h4 className="text-sm font-medium text-red-400">
                      High Risk Access
                    </h4>
                    <p className="text-xs text-red-300 mt-1">
                      This grant provides access to sensitive system functions.
                      Review permissions carefully.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Permissions & Scopes */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Granted Permissions
              </h3>
              <button className="px-3 py-1 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 rounded-lg text-sm transition-colors border border-blue-500/20">
                Edit Scopes
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {grant.scope?.split(" ").map((scope: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/10"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{getScopeIcon(scope)}</span>
                    <span className="text-sm text-white">{scope}</span>
                  </div>
                  <button className="text-xs text-slate-400 hover:text-red-400 transition-colors">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Authorization Details with Editing */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Access Details
              </h3>
              <button className="px-3 py-1 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 rounded-lg text-sm transition-colors border border-purple-500/20">
                Manage Access
              </button>
            </div>

            {/* Authorization Details for Demo */}
            <div className="space-y-4">
              {/* MCP Tools Access */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🔧</span>
                    <div>
                      <h4 className="text-sm font-medium text-white">
                        MCP Tools Access
                      </h4>
                      <p className="text-xs text-slate-400">
                        Development & monitoring tools
                      </p>
                    </div>
                  </div>
                  <button className="text-xs text-blue-400 hover:text-blue-300">
                    Edit
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {["metrics.read", "logs.query", "dashboard.view"].map(
                    (tool, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/20"
                      >
                        <span className="text-xs text-emerald-300">{tool}</span>
                        <input
                          type="checkbox"
                          checked
                          className="w-3 h-3 text-emerald-500"
                          title={`Toggle ${tool}`}
                        />
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* API Access */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">🌐</span>
                    <div>
                      <h4 className="text-sm font-medium text-white">
                        API Access
                      </h4>
                      <p className="text-xs text-slate-400">
                        External service endpoints
                      </p>
                    </div>
                  </div>
                  <button className="text-xs text-blue-400 hover:text-blue-300">
                    Edit
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-blue-500/10 rounded-lg p-2 border border-blue-500/20">
                    <span className="text-xs text-blue-300">
                      https://api.monitoring.internal/v1/metrics
                    </span>
                    <span className="text-xs text-slate-400">HTTPS</span>
                  </div>
                </div>
              </div>

              {/* File System Access */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">📁</span>
                    <div>
                      <h4 className="text-sm font-medium text-white">
                        File System Access
                      </h4>
                      <p className="text-xs text-slate-400">
                        Directory and file permissions
                      </p>
                    </div>
                  </div>
                  <button className="text-xs text-blue-400 hover:text-blue-300">
                    Edit
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {["read", "write", "execute", "list"].map((perm, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/20"
                    >
                      <span className="text-xs text-yellow-300">{perm}</span>
                      <input
                        type="checkbox"
                        checked={perm !== "execute"}
                        className="w-3 h-3 text-yellow-500"
                        title={`Toggle ${perm} permission`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Grant Metadata */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Grant Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Subject</p>
                  <p className="text-sm text-white">{grant.subject || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Client ID</p>
                  <p className="text-sm text-white font-mono">
                    {grant.client_id || "N/A"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Created</p>
                  <p className="text-sm text-white">
                    {grant.createdAt
                      ? new Date(grant.createdAt).toLocaleString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Grant ID</p>
                  <p className="text-sm text-white font-mono">
                    {grant.id || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between space-x-4">
            <a
              href="/grants-management/Grants"
              className="flex items-center space-x-2 px-6 py-3 bg-slate-600/20 hover:bg-slate-600/30 text-slate-300 rounded-xl transition-colors border border-slate-600/30"
            >
              <span>←</span>
              <span>Back to Grants</span>
            </a>

            <div className="flex items-center space-x-3">
              <form
                method="POST"
                action={`/grants-management/Grants/${grant.id}`}
                hx-swap="innerHTML"
                className="inline"
              >
                <input type="hidden" name="_method" value="PATCH" />
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-xl transition-colors border border-blue-500/30"
                >
                  <span>💾</span>
                  <span>Save Changes</span>
                </button>
              </form>

              {grant.status === "active" && (
                <form
                  action={`/grants-management/Grants/${grant.id}`}
                  method="POST"
                  // hx-swap="innerHTML"
                  // hx-delete={`/grants-management/Grants/${grant.id}`}
                  // hx-target={`#grant-${grant.id}`}
                  className="inline"
                >
                  <input type="hidden" name="_method" value="DELETE" />
                  <button
                    type="submit"
                    className="flex items-center space-x-2 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-colors border border-red-500/30"
                  >
                    <span>🚫</span>
                    <span>Revoke Grant</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  return grant;
}

function getRiskColor(level: string) {
  switch (level) {
    case "low":
      return "text-green-400 bg-green-500/20 border-green-500/30";
    case "medium":
      return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";
    case "high":
      return "text-red-400 bg-red-500/20 border-red-500/30";
  }
  return "text-gray-400 bg-gray-500/20 border-gray-500/30";
}

function getScopeIcon(scope: string) {
  if (scope?.includes("tools")) return "🔧";
  if (scope?.includes("data")) return "📊";
  if (scope?.includes("file")) return "📁";
  if (scope?.includes("system")) return "⚙️";
  return "🛡️";
}
function unique<T>(value: T, index: number, array: T[]): value is T {
  return array.indexOf(value) === index;
}

function isGrant(grant: Grant| void | Grants | Error): grant is Grant {
  return !!grant && !isNativeError(grant) && grant.hasOwnProperty("id");
}
