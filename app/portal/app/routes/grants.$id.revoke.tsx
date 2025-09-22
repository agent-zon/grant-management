import React from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Lock,
  Shield,
  XCircle,
} from "lucide-react";
import {
  Form,
  Link,
  redirect
} from "react-router";
import type { Route } from "./+types/grants.$id.revoke.ts";
import { grants } from "../grants.db.ts";
export { loader } from "./grants.$id._index.tsx";
// Mock data - same as main consent route

export function meta({ params, data }: Route.MetaArgs) {
  return [
    { title: `Revoke Consent - ${data?.grant?.id}` },
    { name: "description", content: "Revoke consent for specific permissions" },
  ];
}

export async function action({ request, params }: Route.ActionArgs) {
  const { id } = params;
  const formData = await request.formData();
  const grant = grants.find((g) => g.id === id);
  if (grant) {
    grant.granted = false;
    grant.revokedAt = new Date().toISOString();
    grant.usage = 0;
  }

  const grantUrl = new URL(request.url);
  grantUrl.pathname = grantUrl.pathname.replace(/\/grant$/, "");
  const requestUrl = new URL(request.url);
  const redirect_url = requestUrl.searchParams.get("redirect_url");
  const toRedirect = requestUrl.searchParams.get("redirect");
  if (redirect_url || toRedirect) {
    return redirect(
      redirect_url ? `${redirect_url}?revoked=${id}` : grantUrl.href,
    );
  }

  return {
    success: true,
    message: `${id} revoked successfully`,
    grant_id: id, // Following OAuth 2.0 Grant Management specification
    action: "revoked",
  };
}

export default function RevokeConsent({ loaderData }: Route.ComponentProps) {
  const { grant } = loaderData;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-4 mb-6">
            <Link
              to="/grants"
              className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Consent Management</span>
            </Link>
          </div>

          {/* Grant Details */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <Lock className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Revoke Consent
                </h1>
                <p className="text-gray-400">Remove access to {grant.scope}</p>
              </div>
            </div>

            {/* Current Status */}
            <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white">
                    {grant.scope}
                  </h3>
                  <p className="text-sm text-gray-400">{grant.description}</p>
                </div>
                <div
                  className={`flex items-center space-x-2 px-3 py-1 rounded ${
                    grant.granted
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {grant.granted
                    ? <Shield className="w-4 h-4" />
                    : <Lock className="w-4 h-4" />}
                  <span className="text-sm">
                    {grant.granted ? "Currently Granted" : "Currently Denied"}
                  </span>
                </div>
              </div>

              {/* Grant Info */}
              {grant.granted && (
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Granted At</p>
                      <p className="text-white">
                        {grant.grantedAt
                          ? new Date(grant.grantedAt).toLocaleString()
                          : "Unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Usage Count</p>
                      <p className="text-white font-mono">{grant.usage}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Session</p>
                      <p className="text-white font-mono">
                        {grant.sessionId || "None"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Warning */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-400">
                    Revocation Warning
                  </h4>
                  <p className="text-xs text-red-300 mt-1">
                    Revoking this consent will immediately terminate the agent's
                    access to the associated tools and data. Any active sessions
                    using this permission will be invalidated.
                  </p>
                </div>
              </div>
            </div>

            {/* Tools That Will Be Affected */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-300 mb-3">
                Tools That Will Lose Access
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {grant.toolsIncluded.map((tool, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-2 p-2 bg-red-500/10 rounded border border-red-500/20"
                  >
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-300">{tool}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Only show revoke form if currently granted */}
            {grant.granted
              ? (
                <Form method="post" className="space-y-6">
                  <input type="hidden" name="intent" value="revoke-consent" />

                  <div>
                    <label className="flex items-center space-x-3 mb-4">
                      <input
                        type="checkbox"
                        name="immediate"
                        value="true"
                        defaultChecked
                        className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-300">
                        Revoke immediately and terminate active sessions
                      </span>
                    </label>
                  </div>

                  <div>
                    <label
                      htmlFor="reason"
                      className="block text-sm font-medium text-gray-300 mb-2"
                    >
                      Reason for Revocation (Optional)
                    </label>
                    <textarea
                      id="reason"
                      name="reason"
                      rows={3}
                      placeholder="Explain why you're revoking this permission..."
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-4">
                    <Link
                      to="/grants"
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      className="flex items-center space-x-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Revoke Consent</span>
                    </button>
                  </div>
                </Form>
              )
              : (
                <div className="text-center py-8">
                  <Lock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">
                    This consent is already revoked
                  </p>
                  <Link
                    to={`/grants/${grant.id}/grant`}
                    className="inline-block mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Grant Access Instead
                  </Link>
                </div>
              )}
          </div>

          {/* Active Sessions Warning */}
          {grant.granted && grant.sessionId && (
            <div className="bg-yellow-800/20 border border-yellow-600/30 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-yellow-400" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-400">
                    Active Session Warning
                  </h4>
                  <p className="text-xs text-yellow-300">
                    Session {grant.sessionId}{" "}
                    is currently using this permission. Revoking will
                    immediately terminate access for this session.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
