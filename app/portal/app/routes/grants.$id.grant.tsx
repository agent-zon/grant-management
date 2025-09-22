import React from "react";
import {
  ArrowLeft,
  CheckCircle,
  Key,
  Shield,
  Unlock,
} from "lucide-react";
import {
  Form,
  Link,
  redirect,
} from "react-router";
import type { Route } from "./+types/grants.$id.grant.ts";
export { loader } from "./grants.$id._index.tsx";
import { type ConsentGrant, grants } from "../grants.db.ts";
export async function action({ request, params }: Route.ActionArgs) {
  const id = (params as { id: string }).id;
  const formData = await request.formData();
  const duration = formData.get("duration") as string;
  const consentRequestId = formData.get("consentRequestId") as string;
  const requiredScopes = formData.get("requiredScopes") as string;
  const grant = grants.find((g) => g.id === id);
  if (grant) {
    grant.granted = true;
    grant.grantedAt = new Date().toISOString();
    grant.expiresAt = grant.expiresAt ||
      new Date(Date.now() + parseInt(duration) * 60 * 60 * 1000).toISOString();
    grant.sessionId = grant.sessionId || consentRequestId;
    grant.usage = 0;
    grant.lastUsed = new Date().toISOString();
    grant.toolsIncluded = grant.toolsIncluded || requiredScopes.split(",");
  }

  const grantUrl = new URL(request.url);
  grantUrl.pathname = grantUrl.pathname.replace(/\/grant$/, "");
  const requestUrl = new URL(request.url);
  const redirect_url = requestUrl.searchParams.get("redirect_url");
  const toRedirect = requestUrl.searchParams.get("redirect");
  if (redirect_url || toRedirect) {
    return redirect(
      redirect_url
        ? `${redirect_url}?granted=${id}&scope=${requiredScopes}`
        : grantUrl.href,
    );
  }

  return {
    success: true,
    grant_id: id, // Following OAuth 2.0 Grant Management specification
    consentRequestId,
    action: "granted",
    requiredScopes: requiredScopes ? requiredScopes.split(",") : [],
    message: `Permission granted for ${requiredScopes}`,
  };
}

export default function GrantConsent(
  { loaderData, params }: Route.ComponentProps,
) {
  const { grant } = loaderData;

  const redirect_url = (params as { redirect_url: string }).redirect_url;

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

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Shield className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Grant Consent</h1>
                <p className="text-gray-400">
                  Authorize access to {grant.scope}
                </p>
              </div>
            </div>

            <ConsentForm {...grant} />
          </div>

          {/* Current Grant Info */}
          {grant.granted && (
            <div className="bg-green-800/20 border border-green-600/30 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <h4 className="text-sm font-medium text-green-400">
                    Currently Active
                  </h4>
                  <p className="text-xs text-green-300">
                    Granted {grant.grantedAt
                      ? new Date(grant.grantedAt).toLocaleString()
                      : "recently"}
                    {grant.expiresAt &&
                      ` • Expires ${
                        new Date(
                          grant.expiresAt,
                        ).toLocaleString()
                      }`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Reusable Consent Form Component
  function ConsentForm(grant: ConsentGrant) {
    return (
      <>
        {/* Current Status */}
        <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">{grant.scope}</h3>
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
                ? <CheckCircle className="w-4 h-4" />
                : <Shield className="w-4 h-4" />}
              <span className="text-sm">
                {grant.granted ? "Currently Granted" : "Currently Denied"}
              </span>
            </div>
          </div>
        </div>

        {/* Tools Included */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">
            Tools Included in This Grant
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {grant.toolsIncluded.map((tool, idx) => (
              <div
                key={idx}
                className="flex items-center space-x-2 p-2 bg-blue-500/10 rounded border border-blue-500/20"
              >
                <Key className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-300">{tool}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grant Form */}
        <Form method="post" className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Grant Duration
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="duration"
                  value="1"
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">1 hour</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="duration"
                  value="8"
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">
                  8 hours (work day)
                </span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="duration"
                  value="24"
                  defaultChecked
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">24 hours</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="duration"
                  value="168"
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">1 week</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="duration"
                  value="permanent"
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">
                  Permanent (until manually revoked)
                </span>
              </label>
            </div>
          </div>

          <div>
            <label
              htmlFor="reason"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Reason for Grant (Optional)
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={3}
              placeholder="Explain why you're granting this permission..."
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-400">
                  Security Notice
                </h4>
                <p className="text-xs text-yellow-300 mt-1">
                  By granting this consent, you're allowing the agent to access
                  the tools and data specified above. This permission can be
                  revoked at any time from the consent management page.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            {redirect_url
              ? (
                <Link
                  type="button"
                  to={redirect_url}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </Link>
              )
              : (
                <Link
                  to="/grants"
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </Link>
              )}
            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Unlock className="w-4 h-4" />
              <span>Grant Consent</span>
            </button>
          </div>
        </Form>
      </>
    );
  }
}
