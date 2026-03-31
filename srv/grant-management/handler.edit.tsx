import cds from "@sap/cds";
import type {
  GrantHandler,
  GrantsHandler,
  GrantsManagementService,
} from "./grant-management";
import { isNativeError } from "node:util/types";
import type {
  Grants,
  Grant,
} from "#cds-models/sap/scai/grants/GrantsManagementService";
import { render } from "#cds-ssr";

export function POST(
  this: GrantsManagementService,
  ...[req, next]: Parameters<GrantHandler>
) {
  console.log("🔑 TODO: Implement grant update");
  return cds.context?.http?.res.redirect(`/grants-management/Grants`);
}
export async function GET(
  this: GrantsManagementService,
  ...[req, next]: Parameters<GrantHandler>
) {
  console.log("🔧 GET request:", req.data);

  // Only handle single grant requests
  if (!req.query.SELECT?.one) {
    return await next(req);
  }
  console.log("🔧 Single grant request.");
  // Apply workaround to process grant with consents and authorization details
  const raw = await next(req);
  if (!raw || isNativeError(raw) || !(raw as Grant).id) {
    return req.reject(404, "Grant not found");
  }
  let grant = await getGrant(this, {
    ...req.data,
    ...raw,
  });

  // Ownership check: caller must be subject, actor, or grant_admin
  const callerUuid = cds.context?.user?.authInfo?.token?.payload?.user_uuid as string | undefined;
  const callerEmail = (cds.context?.user?.authInfo?.token?.payload?.mail ?? cds.context?.user?.authInfo?.token?.payload?.email) as string | undefined;
  const callerId = cds.context?.user?.id;
  const isAdmin = cds.context?.user?.is("grant_admin");

  // Build set of all known caller identities for matching
  const callerIds = new Set([callerId, callerUuid, callerEmail].filter(Boolean));

  // If both grant and caller have UUID, compare those (stable across auth contexts);
  // otherwise fall back to matching subject against any known caller identity
  const isSubject = ((grant as any).subject_uuid && callerUuid)
    ? (grant as any).subject_uuid === callerUuid
    : callerIds.has(grant.subject as string);
  const isActor = callerIds.has(grant.actor as string);

  if (!isAdmin && !isSubject && !isActor) {
    return req.reject(403, "Not authorized to view this grant");
  }

  if (req?.http?.req.accepts("html")) {
    return render(
      req,
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
                  {Array.isArray(grant.client_id)
                    ? grant.client_id.join(", ")
                    : grant.client_id || "Unknown Application"}
                </h2>
                {grant.actor && (
                  <p className="text-slate-400 mb-3">
                    {Array.isArray(grant.actor)
                      ? grant.actor.join(", ")
                      : grant.actor}
                  </p>
                )}

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

          {/* Grant Metadata */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Grant Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Subject</p>
                  <p className="text-sm text-white">
                    {grant.subject
                      ? Array.isArray(grant.subject)
                        ? grant.subject.join(", ")
                        : grant.subject
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">
                    Client ID
                    {Array.isArray(grant.client_id) &&
                    grant.client_id.length > 1
                      ? "s"
                      : ""}
                  </p>
                  <p className="text-sm text-white font-mono">
                    {grant.client_id
                      ? Array.isArray(grant.client_id)
                        ? grant.client_id.join(", ")
                        : grant.client_id
                      : "N/A"}
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

            <div className="space-y-4">
              {(grant.authorization_details || []).length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <span className="text-3xl block mb-2">🔒</span>
                  <p className="text-sm">No authorization details for this grant.</p>
                </div>
              )}
              {(grant.authorization_details || []).map((detail: any, dIdx: number) => (
                <DetailCard key={dIdx} detail={detail} />
              ))}
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

async function getGrant(_srv: GrantsManagementService, { id, ...grant }: Grant) {
  const db = cds.db;
  const { Consents, AuthorizationDetails } = db.entities("sap.scai.grants");

  const [consentRecords, authorization_details] = await Promise.all([
    db.run(SELECT.from(Consents).where({ grant_id: id })),
    db.run(SELECT.from(AuthorizationDetails).where({ consent_grant_id: id })),
  ]);

  const aggregatedScope = consentRecords
    .map((c: any) => c.scope)
    .filter(Boolean)
    .filter(unique)
    .join(" ");

  return {
    id,
    ...grant,
    scope: aggregatedScope,
    authorization_details: aggregateDetails(authorization_details),
    consents: consentRecords,
  } as Grant;
}

/** Merge consent-level details into one entry per (type + merge key) */
function aggregateDetails(details: any[]): any[] {
  const grouped = new Map<string, any>();

  for (const d of details) {
    const type = d.type || "unknown";
    // Merge key depends on type: server for MCP, system for system_connection, type for others
    const key = type === "mcp" ? `${type}::${d.server || ""}`
      : type === "system_connection" ? `${type}::${d.system || ""}`
      : type === "api" ? `${type}::${(d.urls || []).join(",")}`
      : `${type}::${d.ID}`;

    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...d });
      continue;
    }

    // Merge type-specific fields
    if (type === "mcp" && d.tools) {
      existing.tools = { ...existing.tools, ...d.tools };
    }
    if (type === "system_connection" && d.connection_scopes) {
      const scopes = new Set([...(existing.connection_scopes || []), ...d.connection_scopes]);
      existing.connection_scopes = [...scopes];
    }
    if (type === "api") {
      existing.urls = [...new Set([...(existing.urls || []), ...(d.urls || [])])];
      existing.protocols = [...new Set([...(existing.protocols || []), ...(d.protocols || [])])];
    }
    if (type === "database") {
      existing.tables = [...new Set([...(existing.tables || []), ...(d.tables || [])])];
      existing.schemas = [...new Set([...(existing.schemas || []), ...(d.schemas || [])])];
    }
  }

  return [...grouped.values()];
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

function isGrant(grant: Grant | void | Grants | Error): grant is Grant {
  return (
    !!grant &&
    !isNativeError(grant) &&
    grant.hasOwnProperty("id") &&
    !Array.isArray(grant)
  );
}

const detailMeta: Record<string, { icon: string; label: string; color: string }> = {
  mcp:               { icon: "🔧", label: "MCP Tools",          color: "emerald" },
  system_connection: { icon: "🔗", label: "System Connection",  color: "cyan" },
  api:               { icon: "🌐", label: "API Access",         color: "blue" },
  database:          { icon: "🗄️", label: "Database Access",    color: "purple" },
  fs:                { icon: "📁", label: "File System",         color: "yellow" },
  agent_invocation:  { icon: "🤖", label: "Agent Invocation",   color: "green" },
};

function colorClasses(color: string) {
  const map: Record<string, { bg: string; border: string; text: string }> = {
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-300" },
    cyan:    { bg: "bg-cyan-500/10",    border: "border-cyan-500/20",    text: "text-cyan-300" },
    blue:    { bg: "bg-blue-500/10",    border: "border-blue-500/20",    text: "text-blue-300" },
    purple:  { bg: "bg-purple-500/10",  border: "border-purple-500/20",  text: "text-purple-300" },
    yellow:  { bg: "bg-yellow-500/10",  border: "border-yellow-500/20",  text: "text-yellow-300" },
    green:   { bg: "bg-green-500/10",   border: "border-green-500/20",   text: "text-green-300" },
    slate:   { bg: "bg-slate-500/10",   border: "border-slate-500/20",   text: "text-slate-300" },
  };
  return map[color] || map.slate;
}

function DetailCard({ detail, key: _key }: { detail: any; key?: any }) {
  const type = detail.type as string || "unknown";
  const meta = detailMeta[type] || { icon: "📋", label: type, color: "slate" };
  const c = colorClasses(meta.color);

  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center space-x-3 mb-3">
        <span className="text-2xl">{meta.icon}</span>
        <div>
          <h4 className="text-sm font-medium text-white">{meta.label}</h4>
          {detail.server && <p className="text-xs text-slate-400">{detail.server}</p>}
          {detail.system && <p className="text-xs text-slate-400">{detail.provider_name || detail.system}</p>}
        </div>
      </div>

      {/* MCP Tools */}
      {type === "mcp" && detail.tools && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(detail.tools as Record<string, unknown>)
            .filter(([, v]) => typeof v === "boolean")
            .map(([name, granted]) => (
              <div key={name} className={`flex items-center justify-between ${c.bg} rounded-lg p-2 border ${c.border}`}>
                <span className={`text-xs ${c.text}`}>{name}</span>
                <span className={`text-xs ${granted ? "text-emerald-400" : "text-red-400"}`}>
                  {granted ? "granted" : "denied"}
                </span>
              </div>
            ))}
        </div>
      )}

      {/* System Connection Scopes */}
      {type === "system_connection" && detail.connection_scopes && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {(detail.connection_scopes as string[]).map((scope: string) => (
            <div key={scope} className={`${c.bg} rounded-lg p-2 border ${c.border}`}>
              <span className={`text-xs ${c.text}`}>{scope}</span>
            </div>
          ))}
        </div>
      )}

      {/* API */}
      {type === "api" && (
        <div className="space-y-2">
          {(detail.urls || []).map((url: string) => (
            <div key={url} className={`flex items-center justify-between ${c.bg} rounded-lg p-2 border ${c.border}`}>
              <span className={`text-xs ${c.text} font-mono`}>{url}</span>
              <span className="text-xs text-slate-400">
                {(detail.protocols || []).join(", ") || "HTTPS"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Database */}
      {type === "database" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {(detail.tables || []).map((table: string) => (
            <div key={table} className={`${c.bg} rounded-lg p-2 border ${c.border}`}>
              <span className={`text-xs ${c.text}`}>{table}</span>
            </div>
          ))}
          {(detail.schemas || []).map((schema: string) => (
            <div key={schema} className={`${c.bg} rounded-lg p-2 border ${c.border}`}>
              <span className={`text-xs ${c.text}`}>schema: {schema}</span>
            </div>
          ))}
        </div>
      )}

      {/* File System */}
      {type === "fs" && (
        <div className="space-y-2">
          {(detail.roots || []).map((root: string) => (
            <div key={root} className={`${c.bg} rounded-lg p-2 border ${c.border}`}>
              <span className={`text-xs ${c.text} font-mono`}>{root}</span>
            </div>
          ))}
          {detail.permissions && (
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(detail.permissions as Record<string, boolean>)
                .filter(([, v]) => v)
                .map(([perm]) => (
                  <div key={perm} className={`${c.bg} rounded-lg p-2 border ${c.border}`}>
                    <span className={`text-xs ${c.text}`}>{perm}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Agent Invocation */}
      {type === "agent_invocation" && detail.identifier && (
        <div className={`${c.bg} rounded-lg p-3 border ${c.border}`}>
          <span className={`text-xs ${c.text} font-mono`}>
            {detail.identifier}
          </span>
        </div>
      )}

      {/* Fallback for unknown types */}
      {!["mcp", "system_connection", "api", "database", "fs", "agent_invocation"].includes(type) && (
        <div className="text-xs text-slate-400">
          {detail.locations && <p>Locations: {(detail.locations as string[]).join(", ")}</p>}
          {detail.actions && <p>Actions: {(detail.actions as string[]).join(", ")}</p>}
        </div>
      )}
    </div>
  );
}
