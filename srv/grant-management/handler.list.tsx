import cds from "@sap/cds";
import {
  type Grant,
  Grants,
  Consents,
  AuthorizationDetails,
  Consent,
} from "#cds-models/sap/scai/grants/GrantsManagementService";
import type {
  GrantsHandler,
  GrantsManagementService,
} from "./grant-management";
import { isNativeError } from "node:util/types";
import e from "express";
import { render } from "#cds-ssr";

export async function LIST(
  this: GrantsManagementService,
  ...[req, next]: Parameters<GrantsHandler>
) {
  console.log("🔍 Listing grants with expand:", req.data, req.query, req.id);

  const response = await next(req);

  if (isGrants(response)) {
    console.log("🔧 Grants:", response);
    const grants = await getGrants(this, response);

    // For HTML responses, render the UI
    if (req?.http?.req.accepts("html")) {
      const totalGrants = grants.length;
      const activeGrants = grants.filter((g) => g.status === "active");
      return render(
        req,
        <div className="min-h-screen bg-[#f5f7fa] text-gray-900 font-sans">
          {/* SAP Fiori Shell Bar */}
          <div className="bg-[#354a5f] text-white h-11 flex items-center justify-between px-4 shadow-sm z-50 relative">
             <div className="flex items-center space-x-3">
               {/* SAP Logo */}
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 73 36" className="h-6 w-auto fill-current">
                   <path d="M36.1 0L18 0l18 36h18L36.1 0zM10.8 12L0 36h18l10.8-24h-18zm54 0l-10.8 24h18L72 12h-7.2z"/>
                   {/* Simplified geometric representation or just text */}
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

          {/* Subheader / App Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4 mb-6 shadow-sm">
             <div className="flex justify-between items-center max-w-7xl mx-auto">
               <div>
                  <h1 className="text-xl text-gray-800 font-normal">Workflow Automation Agent</h1>
                  <p className="text-xs text-gray-500 mt-1">Application ID: 7c4e8f2a-1b3d-4a5e-9f6c-8d2e0a1b3c4d</p>
               </div>
               <div className="flex space-x-2">
                 <button className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors">Edit</button>
               </div>
             </div>
          </div>

          <div className="container mx-auto px-6 py-2 space-y-6 max-w-7xl">
          
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded shadow-sm border border-gray-200 p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded">
                    <div className="w-5 h-5 text-green-700">✅</div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Active Grants</p>
                    <p className="text-xl font-bold text-gray-800">
                      {activeGrants.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded shadow-sm border border-gray-200 p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded">
                    <div className="w-5 h-5 text-blue-700">🔑</div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Total Grants</p>
                    <p className="text-xl font-bold text-gray-800">{totalGrants}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded shadow-sm border border-gray-200 p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded">
                    <div className="w-5 h-5 text-orange-700">⏰</div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Expired</p>
                    <p className="text-xl font-bold text-gray-800">
                      {
                        grants.filter((g) => (g.status as any) === "expired")
                          .length
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded shadow-sm border border-gray-200 p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded">
                    <div className="w-5 h-5 text-red-700">🚫</div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Revoked</p>
                    <p className="text-xl font-bold text-gray-800">
                      {grants.filter((g) => g.status === "revoked").length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Grants List */}
            <div className="bg-white rounded shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-base font-medium text-gray-800">
                  Consent Grants
                </h3>
                <span className="text-xs text-gray-500">
                  {totalGrants} grants • {activeGrants.length || 0} active
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {grants.map((grant, idx) => (
                  <div
                    key={grant?.id || idx}
                    className="p-4 hover:bg-gray-50 transition-colors"
                    id={`grant-${grant?.id || idx}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start space-x-3">
                        <div
                          className={`mt-1 p-1.5 rounded ${
                            grant.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                           <div className="w-4 h-4">
                            {grant.status === "active" ? "🔓" : "🔒"}
                           </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {grant.scope || "No Scope"}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-xs text-gray-500 flex items-center">
                               👤 {grant.subject || "Unknown Subject"}
                             </span>
                             {grant.actor && (
                                <span className="text-xs text-blue-600 flex items-center">
                                  🤖 {grant.actor}
                                </span>
                             )}
                          </div>
                          
                          <div className="flex items-center space-x-2 mt-2">
                            <span
                              className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-sm border ${
                                grant.risk_level === "high"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : grant.risk_level === "medium"
                                    ? "bg-orange-50 text-orange-700 border-orange-200"
                                    : "bg-green-50 text-green-700 border-green-200"
                              }`}
                            >
                              {grant.risk_level || "low"} risk
                            </span>
                             <span
                              className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-sm border ${
                                grant.status === "active"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : (grant.status as any) === "expired"
                                    ? "bg-orange-50 text-orange-700 border-orange-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {grant.status || "active"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-3 items-center">
                        <a
                          href={`Grants/${grant?.id || ""}`}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          View
                        </a>
                        {grant.status === "active" && (
                          <form
                            action={`Grants/${grant?.id || ""}`}
                            method="POST"
                            hx-swap="outerHTML"
                            hx-target="body"
                            className="inline"
                          >
                            <input
                              type="hidden"
                              name="_method"
                              value="DELETE"
                            />
                            <button
                              type="submit"
                              className="text-sm text-red-600 hover:text-red-800 hover:underline"
                            >
                              Revoke
                            </button>
                          </form>
                        )}
                      </div>
                    </div>

                    {/* Grant Details Compact */}
                    <div className="mt-3 pl-11 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                       <div className="flex gap-2">
                          <span className="font-medium text-gray-400">Grant ID:</span> 
                          <span className="font-mono text-gray-600 bg-gray-100 px-1 rounded">{grant?.id || ""}</span>
                       </div>
                       {grant.createdAt && (
                         <div className="flex gap-2">
                            <span className="font-medium text-gray-400">Granted:</span>
                            <span>{new Date(grant.createdAt).toLocaleString()}</span>
                         </div>
                       )}
                    </div>

                    {/* Authorization Details */}
                    {grant.authorization_details &&
                      grant.authorization_details.length > 0 && (
                        <div className="mt-3 pl-11">
                          <div className="bg-gray-50 rounded border border-gray-100 p-2">
                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">
                              Authorization Details
                            </p>
                            <div className="space-y-1">
                              {grant.authorization_details
                                .map((d) => d.type)
                                .filter(unique)
                                .filter((type) => !!type)
                                .map(
                                  (
                                    type: string | null | undefined,
                                    idx: number
                                  ) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between text-xs"
                                    >
                                      <span className="font-medium text-gray-700">
                                        {type}
                                      </span>
                                      <span className="text-gray-500">
                                        {grant.authorization_details
                                          ?.filter((d) => d.type === type)
                                          .map((d) => d.actions)
                                          .filter(Boolean)
                                          .flat()
                                          .filter(unique)
                                          .join(", ") || "No actions"}
                                      </span>
                                    </div>
                                  )
                                )}
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                ))}

                {grants.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto mb-4 text-gray-300">🔑</div>
                    <h3 className="text-lg font-medium text-gray-500 mb-2">
                      No grants found
                    </h3>
                    <p className="text-sm text-gray-400">
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

    // For JSON responses, return the processed grants
    return grants;
  }
  return response;
}

//workround for last grant overwrite issue
async function getGrants(srv: GrantsManagementService, data: Grants) {
  const consentRecords = await srv.read(Consents);
  const authorization_details = await srv.run(
    cds.ql.SELECT.from(AuthorizationDetails)
  );

  // Fetch all AuthorizationRequests to get client_id mapping
  const authRequests = await cds.run(
    cds.ql.SELECT.from("sap.scai.grants.AuthorizationRequests").columns(
      "ID",
      "client_id",
      "grant_id"
    )
  );
  const grantToClientMap = new Map<string, string>();
  authRequests.forEach((req: any) => {
    if (req.grant_id && req.client_id) {
      grantToClientMap.set(req.grant_id, req.client_id);
    }
  });

  const grants = consentRecords.reduce(
    (acc, consent) => {
      const consents = [...(acc[consent.grant_id!]?.consents || []), consent];
      const grant = data?.find((g) => g.id === consent.grant_id);

      // Collect unique client_ids, actors, and subjects from all consents
      const client_ids = consents
        .map((c: any) => c.client_id)
        .filter(Boolean)
        .filter(unique);

      // If no client_ids from consents, try grant record or AuthRequest mapping
      const finalClientIds =
        client_ids.length > 0
          ? client_ids
          : [
              grant?.client_id ||
                grantToClientMap.get(consent.grant_id!) ||
                "unknown",
            ].filter(Boolean);

      const actors = consents
        .map((c: any) => c.actor)
        .filter(Boolean)
        .filter(unique);

      const subjects = consents
        .map((c: any) => c.subject)
        .filter(Boolean)
        .filter(unique);

      acc[consent.grant_id!] = {
        consents: consents,
        authorization_details: [
          ...(acc[consent.grant_id!]?.authorization_details || []),
          ...authorization_details.filter(
            (detail) => detail.consent_grant_id === consent.grant_id
          ),
        ],
        scope: consents
          .map((c) => c.scope)
          .filter(unique)
          .join(" "),
        createdAt: consent[0]?.createdAt,
        modifiedAt: consent[0]?.modifiedAt,
        risk_level: consent[0]?.risk_level,
        ...(grant || {}),
        id: consent.grant_id,
        client_id: finalClientIds as any,
        actor: (actors.length > 0
          ? actors
          : grant?.actor
            ? [grant.actor]
            : undefined) as any,
        subject: (subjects.length > 0
          ? subjects
          : grant?.subject
            ? [grant.subject]
            : undefined) as any,
      };

      return acc;
    },
    {} as Record<string, Grant>
  );

  return Object.values(grants).reverse();
}

function unique<T>(value: T, index: number, array: T[]): value is T {
  return array.indexOf(value) === index;
}

//workaround for single grant query
async function getGrant(
  srv: GrantsManagementService,
  grant: Grant
): Promise<Grant> {
  if (!grant.id) return grant;

  const consentRecords = await srv.run(
    cds.ql.SELECT.from(Consents).where({ grant_id: grant.id })
  );
  const authorization_details = await srv.run(
    cds.ql.SELECT.from(AuthorizationDetails).where({
      consent_grant_id: grant.id,
    })
  );

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
    ...grant,
    scope: aggregatedScope || grant.scope,
    authorization_details,
    consents: consentRecords,
    client_id: (client_ids.length > 0
      ? client_ids
      : grant.client_id
        ? [grant.client_id]
        : []) as any,
    actor: (actors.length > 0
      ? actors
      : grant.actor
        ? [grant.actor]
        : undefined) as any,
    subject: (subjects.length > 0
      ? subjects
      : grant.subject
        ? [grant.subject]
        : undefined) as any,
  } as Grant;
}

function isGrant(grant: Grant | void | Grants | Error): grant is Grant {
  return (
    !!grant &&
    !isNativeError(grant) &&
    grant.hasOwnProperty("id") &&
    !Array.isArray(grant)
  );
}

function isGrants(grant: Grant | void | Grants | Error): grant is Grants {
  return !!grant && !isNativeError(grant) && grant.hasOwnProperty("length");
}
