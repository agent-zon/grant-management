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
  AuthorizationDetail,
} from "#cds-models/sap/scai/grants/GrantsManagementService";
import {
  Consents,
  AuthorizationDetails,
} from "#cds-models/sap/scai/grants/GrantsManagementService";
import { render } from "#cds-ssr";
import { AuthorizationDetailMcpTool } from "#cds-models/sap/scai/grants";

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
  let grant = await getGrant(this, {
    ...req.data,
    ...(await next(req)),
  });
  console.log("🔧 Grant:", grant);

    if (req?.http?.req.accepts("html")) {
    return render(
      req,
      <div className="min-h-screen bg-[#f5f7fa] text-gray-900 font-sans pb-10">
        {/* SAP Fiori Shell Bar */}
        <div className="bg-[#354a5f] text-white h-11 flex items-center justify-between px-4 shadow-sm z-50 relative sticky top-0">
           <div className="flex items-center space-x-3">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 73 36" className="h-6 w-auto fill-current">
                 <path d="M36.1 0L18 0l18 36h18L36.1 0zM10.8 12L0 36h18l10.8-24h-18zm54 0l-10.8 24h18L72 12h-7.2z"/>
                 <text x="36" y="24" fontSize="24" fontFamily="Arial" fontWeight="bold" textAnchor="middle" fill="white">SAP</text>
             </svg>
             <span className="text-sm font-semibold tracking-tight opacity-90">Cloud Identity Services</span>
           </div>
           <div className="flex items-center space-x-4">
              <div className="w-8 h-8 rounded-full bg-blue-400/20 flex items-center justify-center text-xs border border-white/20 cursor-pointer">
                JD
              </div>
           </div>
        </div>

        <div className="container mx-auto px-6 py-6 max-w-5xl">
          {/* Back Nav */}
          <div className="flex items-center space-x-2 mb-6 text-sm">
            <a href="/grants-management/Grants" className="text-blue-600 hover:underline">Home</a>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">Grant Details</span>
          </div>

          {/* Header Card */}
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between">
               <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 text-2xl">
                     🔑
                  </div>
                  <div>
                     <h1 className="text-xl font-bold text-gray-800">
                         {Array.isArray(grant.client_id)
                            ? grant.client_id.join(", ")
                            : grant.client_id || "Unknown Application"}
                     </h1>
                     <div className="flex items-center space-x-2 mt-1">
                         <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${grant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                             {grant.status || 'Unknown'}
                         </span>
                         <span className="text-gray-500 text-sm">ID: {grant.id}</span>
                     </div>
                  </div>
               </div>
               {/* Risk Badge */}
               <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getRiskColor(grant.risk_level || "low")}`}>
                  {grant.risk_level || "low"} Risk
               </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Main Info */}
             <div className="lg:col-span-2 space-y-6">
                
                {/* Details Panel */}
                <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
                   <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
                      <h3 className="text-sm font-bold text-gray-700 uppercase">General Information</h3>
                   </div>
                   <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                      <div>
                         <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Subject / User</p>
                         <p className="text-sm text-gray-900 font-medium">{grant.subject || "N/A"}</p>
                      </div>
                      <div>
                         <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Actor / Client</p>
                         <p className="text-sm text-gray-900 font-medium">{grant.actor || "N/A"}</p>
                      </div>
                      <div>
                         <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Created At</p>
                         <p className="text-sm text-gray-900 font-medium">{grant.createdAt ? new Date(grant.createdAt).toLocaleString() : "N/A"}</p>
                      </div>
                      <div>
                         <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Grant Type</p>
                         <p className="text-sm text-gray-900 font-medium">OAuth 2.0 / UMA</p>
                      </div>
                   </div>
                </div>

                {/* Permissions Panel */}
                 <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
                   <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="text-sm font-bold text-gray-700 uppercase">Scopes & Permissions</h3>
                   </div>
                   <div className="p-6">
                      <div className="flex flex-wrap gap-2">
                         {grant.scope?.split(" ").map((scope: string, idx: number) => (
                            <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 border border-blue-100">
                               <span className="mr-1.5 text-xs">{getScopeIcon(scope)}</span>
                               {scope}
                            </span>
                         ))}
                      </div>
                   </div>
                </div>

                {/* Access Details Panel */}
                <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
                   <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="text-sm font-bold text-gray-700 uppercase">Detailed Access Control</h3>
                      <button className="text-xs text-blue-600 hover:underline">Edit Access</button>
                   </div>
                   <div className="p-6 space-y-4">
                       {/* Authorization details logic similar to list but light theme */}
                       <div className="space-y-4">
                         {/* ... demo content or real content ... */}
                         {/* Using the hardcoded demo blocks from original code but restyled */}
                         <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                            <div className="flex items-center justify-between mb-2">
                               <h4 className="text-sm font-semibold text-gray-800">MCP Tools Access</h4>
                               <span className="text-xs text-gray-500">Development Tools</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-3">
                               {["metrics.read", "logs.query", "dashboard.view"].map((tool, idx) => (
                                  <label key={idx} className="flex items-center space-x-2 text-sm text-gray-600">
                                     <input type="checkbox" checked className="rounded text-blue-600 focus:ring-blue-500" />
                                     <span>{tool}</span>
                                  </label>
                               ))}
                            </div>
                         </div>
                       </div>
                   </div>
                </div>

             </div>

             {/* Sidebar Actions */}
             <div className="space-y-6">
                <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
                   <div className="bg-gray-50 px-6 py-3 border-b border-gray-100">
                      <h3 className="text-sm font-bold text-gray-700 uppercase">Actions</h3>
                   </div>
                   <div className="p-4 space-y-3">
                      <form
                        method="POST"
                        action={`/grants-management/Grants/${grant.id}`}
                        hx-swap="innerHTML"
                        className="block"
                      >
                         <input type="hidden" name="_method" value="PATCH" />
                         <button type="submit" className="w-full flex justify-center items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors shadow-sm text-sm">
                            <span>Save Changes</span>
                         </button>
                      </form>

                      {grant.status === "active" && (
                        <form
                          action={`/grants-management/Grants/${grant.id}`}
                          method="POST"
                          className="block"
                        >
                           <input type="hidden" name="_method" value="DELETE" />
                           <button type="submit" className="w-full flex justify-center items-center space-x-2 px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded font-medium transition-colors text-sm">
                              <span>Revoke Grant</span>
                           </button>
                        </form>
                      )}
                   </div>
                </div>

                {grant.risk_level === 'high' && (
                   <div className="bg-orange-50 rounded shadow-sm border border-orange-200 p-4">
                      <div className="flex items-start space-x-3">
                         <div className="text-orange-500 mt-0.5">⚠️</div>
                         <div>
                            <h4 className="text-sm font-bold text-orange-800">High Risk Grant</h4>
                            <p className="text-xs text-orange-700 mt-1 leading-relaxed">
                               This grant allows access to sensitive operations. Please verify the necessity of these permissions.
                            </p>
                         </div>
                      </div>
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  }

  return grant;
}

//workaround for single grant query
async function getGrant(srv: GrantsManagementService, { id, ...grant }: Grant) {
  const consentRecords = await srv.run(
    cds.ql.SELECT.from(Consents).where({ grant_id: id })
  );
  const authorization_details = await srv.run(
    cds.ql.SELECT.from(AuthorizationDetails).where({
      consent_grant_id: id,
    })
  );

  console.log("🔧 Authorization Details:", authorization_details);
  // Collect unique client_ids, actors, and subjects from all consents
  const client_ids = consentRecords
    .map((c: any) => c.client_id)
    .filter(Boolean)
    .filter(unique);

  const actors = consentRecords
    .map((c: any) => c.actor)
    .filter(Boolean)
    .filter(unique);

  const subjects = consentRecords
    .map((c: any) => c.subject)
    .filter(Boolean)
    .filter(unique);

  // Aggregate scope from all consents
  const aggregatedScope = consentRecords
    .map((c: any) => c.scope)
    .filter(unique)
    .join(" ")
    .split(/\s+/)
    .filter((v: string, i: number, a: string[]) => v && a.indexOf(v) === i)
    .join(" ");

  return {
    id,
    status: "active",
    ...grant,
    scope: aggregatedScope,
    authorization_details: mcpDetails(authorization_details),
    consents: consentRecords,
    client_id: client_ids.length > 1 ? client_ids : client_ids[0],
    actor: actors.length > 1 ? actors : actors[0],
    subject: subjects.length > 1 ? subjects : subjects[0],
  } as Grant;
}

function getRiskColor(level: string) {
  switch (level) {
    case "low":
      return "text-green-700 bg-green-100 border-green-200";
    case "medium":
      return "text-orange-700 bg-orange-100 border-orange-200";
    case "high":
      return "text-red-700 bg-red-100 border-red-200";
  }
  return "text-gray-700 bg-gray-100 border-gray-200";
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

//workaround, should be done in grant server
function mcpDetails(
  authorization_details?: AuthorizationDetail[]
): AuthorizationDetailMcpTool[] | undefined {
  const details = authorization_details
    ?.filter((detail) => detail.type === "mcp")
    .reduce(
      (acc, detail) => {
        const server = detail.server || "default";
        if (!acc[server]) {
          acc[server] = detail;
        }
        acc[server] = {
          ...acc[server],
          tools: {
            ...acc[server].tools,
            ...detail.tools,
          },
        };
        return acc;
      },
      {} as Record<string, AuthorizationDetailMcpTool>
    );

  return details
    ? Object.values(details).concat(
        authorization_details?.filter((detail) => detail.type != "mcp") || []
      )
    : [];
}
