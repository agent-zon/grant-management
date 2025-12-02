import cds from "@sap/cds";
import AuthorizationDetailsComponent from "./details/index.tsx";
import "./handler.authorize.tsx";
import type { AuthorizationService } from "./authorization-service.tsx";
import {
  AuthorizationRequest,
  AuthorizationRequests,
} from "#cds-models/sap/scai/grants/AuthorizationService";
import GrantsManagementService, {
  Grants,
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

  if (request.subject && request.subject !== cds.context?.user?.id) {
    return cds.context?.http?.res
      .status(403)
      .send(
        "Authorization request subject does not match the authenticated user"
      );
  }
  if (!request.subject_token || !request.subject) {
    await this.update(AuthorizationRequests, id)
      .set`subject_token = ${cds.context?.user?.authInfo?.token.jwt}`
      .set`subject = ${cds.context?.user?.id}`;
  }

  // Load the grant associated with this request
  console.log("🔧 Reading grant:", request);
  const grantManagement = await cds.connect.to(GrantsManagementService);

  const grant = await grantManagement
    .upsert({
      id: request.grant_id,
      client_id: request.client_id,
      risk_level: request.risk_level,
      actor: request.requested_actor,
      subject: request.subject,
    })
    .into(Grants);

  console.log("📋 Grant loaded for authorization:", grant.id);
  req.http?.res.setHeader("Content-Type", "text/html");
  req.http?.res.send(
    htmlTemplate(
      renderToString(
        <div className="min-h-screen bg-gray-950 text-white">
          <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center space-x-4 mb-6">
                <a
                  href="/grants-management/Grants"
                  className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <span>←</span>
                  <span>Go to Grant Management</span>
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
                <input type="hidden" name="scope" value={grant.scope} />

                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="p-3 rounded-lg bg-blue-500/20">
                      <div className="text-2xl">🛡️</div>
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white">
                        Rich Authorization Request
                      </h1>
                      <p className="text-gray-400">
                        Review and grant permissions for requested tools
                      </p>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-white">
                          Client: {request.client_id}
                        </h3>
                        <p className="text-sm text-gray-400">
                          Scope: {request.scope}
                        </p>
                        {request.requested_actor && (
                          <p className="text-xs text-purple-400 mt-1">
                            👤 {request.requested_actor} Acting on behalf of: "
                            {request.subject}"
                          </p>
                        )}
                        {request.grant_management_action === "merge" && (
                          <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded">
                            <p className="text-xs text-blue-400 font-medium">
                              🔄 Merging with existing grant: {grant.ID}
                            </p>
                            <p className="text-xs text-blue-300">
                              Current permissions: {grant.scope}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 px-3 py-1 rounded bg-yellow-500/20 text-yellow-400">
                        <div className="text-sm">⏳</div>
                        <span className="text-sm">
                          {request.grant_management_action === "merge"
                            ? "Merge Approval"
                            : "Pending Approval"}{" "}
                          ({request.status})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Authorization Details - Loaded via HTMX */}
                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-300 mb-4">
                      {request.grant_management_action === "merge"
                        ? "Additional Permissions to Add"
                        : "Authorization Details"}
                    </h4>
                    {request.grant_management_action === "merge" && (
                      <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-sm text-green-400 font-medium mb-2">
                          ✅ Current Permissions (will be preserved):
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {grant.scope
                            ?.split(" ")
                            .map((scope: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded"
                              >
                                {scope}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                    {request.access?.map((detail, index) => {
                      return (
                        <AuthorizationDetailsComponent
                          {...detail}
                          key={index}
                          index={index}
                        />
                      );
                    })}
                  </div>
                  {/* Security Warning */}
                  <div className="border rounded-lg p-4 bg-yellow-500/10 border-yellow-500/20">
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 mt-0.5 text-yellow-400">⚠️</div>
                      <div>
                        <h4 className="text-sm font-medium text-yellow-400">
                          Security Notice
                        </h4>
                        <p className="text-xs mt-1 text-yellow-300">
                          By granting this consent, you're allowing the agent to
                          access the tools and data specified above. This
                          permission can be revoked at any time.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-4">
                    <a
                      href="/grants/Grants"
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </a>
                    <button
                      type="submit"
                      className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <div className="w-4 h-4">🔓</div>
                      <span>Grant Consent</span>
                    </button>
                  </div>
                </div>
              </form>
              {/* Risk Information */}
              {request.risk_level === "high" && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-red-400 mt-0.5">⚠️</div>
                    <div>
                      <h4 className="text-sm font-medium text-red-400">
                        High Risk Permission
                      </h4>
                      <p className="text-xs text-red-300 mt-1">
                        This permission grants access to sensitive system
                        functions. Please review carefully before granting
                        access.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    )
  );
}
