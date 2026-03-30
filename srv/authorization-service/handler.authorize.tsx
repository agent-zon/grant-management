import cds from "@sap/cds";
import { ulid } from "ulid";
import AuthorizationDetailsComponent from "./details/index.tsx";
import "./handler.authorize.tsx";
import type { AuthorizationService } from "./authorization-service.tsx";
import {
  AuthorizationRequest,
  AuthorizationRequests,
} from "#cds-models/sap/scai/grants/AuthorizationService";
import GrantsManagementService, {
  Grants,
  AuthorizationDetails,
} from "#cds-models/sap/scai/grants/GrantsManagementService";
import { renderToString } from "react-dom/server";
import { htmlTemplate } from "#cds-ssr";

export default async function authorize(
  this: AuthorizationService,
  req: cds.Request<{ request_uri: string; client_id: string }>
) {
  console.log("🔐 Authorize action:", req.data);
  const { request_uri } = req.data;

  const id = request_uri.split(":").pop();
  console.log("🔧 Reading authorization request:", id);
  const request = (await this.get(AuthorizationRequests, {
    ID: id,
  })) as AuthorizationRequest;

  if (!request) {
    return cds.context?.http?.res
      .status(404)
      .send("Authorization request not found");
  }

  const user_uuid = cds.context?.user?.authInfo?.token?.payload?.user_uuid as string | undefined;

  if (request.subject && request.subject !== cds.context?.user?.id) {
    // Also accept match by subject_uuid for cross-context identity
    if (!(request.subject_uuid && user_uuid && request.subject_uuid === user_uuid)) {
      return cds.context?.http?.res
        .status(403)
        .send(
          "Authorization request subject does not match the authenticated user"
        );
    }
  }
  if (!request.subject_token || !request.subject) {
    const subject = cds.context?.user?.id;
    await this.update(AuthorizationRequests, id)
      .set`subject_token = ${cds.context?.user?.authInfo?.token.jwt}`
      .set`subject = ${subject}`
      .set`subject_uuid = ${user_uuid}`;
    // Keep local variable in sync with DB update
    request.subject = subject;
    (request as any).subject_uuid = user_uuid;
  }

  // Grant ID and action come from the client via PAR.
  // "merge" acts as create_or_merge: if no grant_id provided, generate one.
  const subject = request.subject || cds.context?.user?.id;
  const actor = request.requested_actor;
  let resolvedGrantId = request.grant_id;

  if (!resolvedGrantId) {
    resolvedGrantId = `gnt_${ulid()}`;
    console.log(`🆕 Generated new grant ${resolvedGrantId} for (${subject}, ${actor})`);
    await this.update(AuthorizationRequests, id)
      .set`grant_id = ${resolvedGrantId}`;
    request.grant_id = resolvedGrantId;
  }

  // Load or create the grant associated with this request
  console.log("🔧 Reading grant:", request);
  const grantManagement = await cds.connect.to(GrantsManagementService);

  const grant = await grantManagement
    .upsert({
      id: resolvedGrantId,
      client_id: request.client_id,
      risk_level: request.risk_level,
      actor: request.requested_actor,
      subject,
      subject_uuid: user_uuid,
    })
    .into(Grants);

  console.log("📋 Grant loaded for authorization:", grant.id);

  // Filter out already-granted authorization details when merging
  let newAccessDetails: any[] = request.access || [];
  if (request.grant_management_action === "merge") {
    const existingDetails = await cds.run(
      SELECT.from(AuthorizationDetails).where({ consent_grant_id: resolvedGrantId })
    );
    console.log(`🔍 Existing details (${existingDetails.length}):`, JSON.stringify(existingDetails.map((d: any) => ({ type: d.type, server: d.server, tools: d.tools }))));
    console.log(`🔍 Requested details (${request.access?.length ?? 0}):`, JSON.stringify((request.access || []).map((d: any) => ({ type_code: d.type_code, server: d.server, tools: d.tools }))));
    newAccessDetails = filterNewDetails(newAccessDetails, existingDetails);
    console.log(
      `🔍 Filtered: ${request.access?.length ?? 0} requested → ${newAccessDetails.length} new`
    );
  }

  // If everything is already granted, auto-approve (no consent screen needed)
  if (request.grant_management_action === "merge" && newAccessDetails.length === 0) {
    console.log("✅ All requested capabilities already granted, skipping consent");
    req.http?.res.setHeader("Content-Type", "application/json");
    return req.http?.res.json({
      grant_id: resolvedGrantId,
      status: "already_granted",
    });
  }

  const selectAllScript = `<script>
document.body.addEventListener('click', function(e) {
  var sa = e.target;
  if (sa && sa.id && sa.id.indexOf('selectall_') === 0) {
    var container = sa.closest('.mb-4');
    if (container) {
      container.querySelectorAll('input[type="checkbox"]:not(:disabled)').forEach(function(cb) {
        if (cb !== sa) cb.checked = sa.checked;
      });
    }
  }
});
</script>`;

  req.http?.res.setHeader("Content-Type", "text/html");
  req.http?.res.send(
    htmlTemplate(
      renderToString(
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center space-x-4 mb-8">
                <a
                  href="/grants-management/Grants"
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors font-medium"
                >
                  <span>←</span>
                  <span>Back to Permissions</span>
                </a>
              </div>

              {/* Consent Form - HTMX POST to CDS auto-CRUD */}
              <form
                hx-ext="form-json"
                hx-swap="outerHTML"
                hx-post={`AuthorizationRequests/${id}/consent`}
                className="space-y-6"
              >
                <input type="hidden" name="_method" value="put" />
                <input type="hidden" name="grant_id" value={grant.id} />
                <input
                  type="hidden"
                  name="subject"
                  value={cds.context?.user?.id}
                />
                <input
                  type="hidden"
                  name="subject_uuid"
                  value={user_uuid || ""}
                />
                <input type="hidden" name="scope" value={grant.scope} />

                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                  <div className="flex items-center space-x-4 mb-8">
                    <div className="p-4 rounded-xl bg-blue-50">
                      <div className="text-3xl">🔐</div>
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">
                        Permission Request
                      </h1>
                      <p className="text-gray-600 mt-1">
                        Review what access is being requested
                      </p>
                    </div>
                  </div>

                  {/* Application Info */}
                  <div className="bg-blue-50 rounded-xl p-5 mb-6 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          Agent Requesting Access
                        </h3>
                        <p className="text-base text-gray-700 font-medium">
                          {request.client_id}
                        </p>
                        {request.requested_actor && (
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Acting on behalf of:</span> {request.subject}
                          </p>
                        )}
                        {request.grant_management_action === "merge" && (
                          <div className="mt-3 p-3 bg-white border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-700 font-medium mb-2">
                              🔄 Adding to Existing Permissions
                            </p>
                            <p className="text-xs text-gray-600">
                              Your current permissions will remain active. This request adds new capabilities.
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200">
                        <div className="text-base">⏳</div>
                        <span className="text-sm font-medium text-amber-700">
                          {request.grant_management_action === "merge"
                            ? "Pending Review"
                            : "Awaiting Approval"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* What's Being Requested */}
                  <div className="mb-6">
                    <h4 className="text-xl font-semibold text-gray-900 mb-4">
                      {request.grant_management_action === "merge"
                        ? "Additional Capabilities Requested"
                        : "What You're Granting Access To"}
                    </h4>
                    {request.grant_management_action === "merge" && (
                      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                        <p className="text-sm text-green-800 font-semibold mb-2">
                          ✅ Your Current Permissions (will remain active):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {grant.scope
                            ?.split(" ")
                            .map((scope: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-white text-green-700 text-sm rounded-lg border border-green-200 font-medium"
                              >
                                {scope}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                    {newAccessDetails.map((detail, index) => {
                      return (
                        <AuthorizationDetailsComponent
                          {...detail}
                          index={index}
                        />
                      );
                    })}
                  </div>
                  {/* Important Notice */}
                  <div className="border rounded-xl p-5 bg-amber-50 border-amber-200">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 mt-0.5 text-amber-600 text-xl">ℹ️</div>
                      <div>
                        <h4 className="text-sm font-semibold text-amber-900 mb-1">
                          Important Information
                        </h4>
                        <p className="text-sm text-amber-800">
                          By approving this request, you're granting the application access to the capabilities listed above.
                          You can revoke these permissions at any time from your permissions dashboard.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                    <a
                      href="/grants/Grants"
                      className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
                    >
                      Cancel
                    </a>
                    <button
                      type="submit"
                      className="flex items-center space-x-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold shadow-md hover:shadow-lg"
                    >
                      <div className="w-5 h-5">✓</div>
                      <span>Approve Request</span>
                    </button>
                  </div>
                </div>
              </form>
              {/* Risk Information */}
              {request.risk_level === "high" && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <div className="flex items-start space-x-3">
                    <div className="text-red-600 mt-0.5 text-xl">⚠️</div>
                    <div>
                      <h4 className="text-sm font-semibold text-red-900 mb-1">
                        High-Risk Access Request
                      </h4>
                      <p className="text-sm text-red-800">
                        This request includes access to sensitive functions or data.
                        Please review carefully and ensure you trust the requesting application before approving.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    ).replace('</body>', selectAllScript + '</body>')
  );
}

/**
 * Filters requested authorization details against already-granted ones.
 * - MCP type: removes individual tools that already exist for the same server
 * - Other types: removes entire detail if type + locations already match
 * Returns only genuinely new details (or details with only new tools).
 */
function filterNewDetails(
  requested: any[],
  existing: any[]
): any[] {
  return requested
    .map((detail) => {
      const type = detail.type_code as string;
      const matchingExisting = existing.filter((e) => e.type === type);

      if (matchingExisting.length === 0) return detail;

      if (type === "mcp") {
        // For MCP: match by server, then filter out already-granted tools
        // Also match null/undefined server (legacy data without server field)
        const server = detail.server as string;
        const serverMatch = matchingExisting.filter(
          (e) => e.server === server || !e.server
        );
        if (serverMatch.length === 0) return detail;

        // Only consider tools with boolean values (true/false) as decided.
        // Tools with null or other non-boolean values mean the user never
        // made a decision and should be presented again for consent.
        const grantedTools = new Set(
          serverMatch.flatMap((e) =>
            e.tools && typeof e.tools === "object"
              ? Object.entries(e.tools)
                  .filter(([, v]) => typeof v === "boolean")
                  .map(([name]) => name)
              : []
          )
        );

        const requestedTools = detail.tools as Record<string, unknown> | null;
        if (!requestedTools) return null;

        const newTools = Object.fromEntries(
          Object.entries(requestedTools).filter(([name]) => !grantedTools.has(name))
        );

        if (Object.keys(newTools).length === 0) return null;
        return { ...detail, tools: newTools };
      }

      if (type === "system_connection") {
        // For system_connection: match by system, filter already-granted scopes
        const system = detail.system as string;
        const systemMatch = matchingExisting.filter(
          (e) => e.system === system
        );
        if (systemMatch.length === 0) return detail;

        const grantedScopes = new Set(
          systemMatch.flatMap((e) =>
            Array.isArray(e.connection_scopes) ? e.connection_scopes : []
          )
        );

        const requestedScopes = detail.connection_scopes as string[] | undefined;
        if (!requestedScopes || requestedScopes.length === 0) return null;

        const newScopes = requestedScopes.filter((s: string) => !grantedScopes.has(s));
        if (newScopes.length === 0) return null;
        return { ...detail, connection_scopes: newScopes };
      }

      // For other types: match by type + locations
      const locations = detail.locations as string[] | undefined;
      const alreadyGranted = matchingExisting.some((e) => {
        const existingLocations = e.locations as string[] | undefined;
        if (!locations && !existingLocations) return true;
        if (!locations || !existingLocations) return false;
        return locations.every((loc) => existingLocations.includes(loc));
      });

      return alreadyGranted ? null : detail;
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
}
