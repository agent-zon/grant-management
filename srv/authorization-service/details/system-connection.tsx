import React from "react";
import type { AuthorizationDetailProps } from "./types.tsx";

interface SystemConnectionProps extends AuthorizationDetailProps {
  system?: string;
  provider_name?: string;
  provider_url?: string;
  connection_scopes?: string[];
  existing_scopes?: string[];
}

export default function SystemConnectionAuthorizationDetail({
  index,
  description,
  riskLevel,
  category,
  system,
  provider_name,
  provider_url,
  connection_scopes,
  existing_scopes,
}: SystemConnectionProps) {
  const scopes = connection_scopes || [];
  return (
    <div
      className={`bg-white rounded-xl p-6 border-2 ${
        riskLevel === "high"
          ? "border-red-300 bg-red-50/30"
          : riskLevel === "medium"
            ? "border-amber-300 bg-amber-50/30"
            : "border-green-300 bg-green-50/30"
      } shadow-sm`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              riskLevel === "high"
                ? "bg-red-100 text-red-700"
                : riskLevel === "medium"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-green-100 text-green-700"
            }`}
          >
            System Connection
          </div>
          {category && (
            <span className="text-sm text-gray-600 font-medium">
              {category}
            </span>
          )}
        </div>
        <div
          className={`px-3 py-1 rounded-lg text-xs font-bold ${
            riskLevel === "high"
              ? "bg-red-100 text-red-700"
              : riskLevel === "medium"
                ? "bg-amber-100 text-amber-700"
                : "bg-green-100 text-green-700"
          }`}
        >
          {riskLevel === "high" ? "High Risk" : riskLevel === "medium" ? "Medium Risk" : "Low Risk"}
        </div>
      </div>

      <p className="text-base text-gray-700 mb-5 leading-relaxed">
        {description}
      </p>

      {/* Hidden fields for form submission */}
      <input type="hidden" name={`authorization_details[${index}].system`} value={system || ""} />
      <input type="hidden" name={`authorization_details[${index}].provider_name`} value={provider_name || ""} />
      <input type="hidden" name={`authorization_details[${index}].provider_url`} value={provider_url || ""} />

      {/* Provider Info */}
      {provider_name && (
        <div className="mb-4">
          <h5 className="text-sm font-semibold text-gray-900 mb-2">External System:</h5>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center space-x-2">
              <span className="text-base text-gray-900 font-bold">{provider_name}</span>
              {provider_url && (
                <a href={provider_url} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700 underline">
                  {provider_url}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Already-granted scopes (read-only pills) */}
      {existing_scopes && existing_scopes.length > 0 && (
        <div className="mb-4">
          <h5 className="text-sm font-semibold text-gray-900 mb-3">Already Granted Scopes:</h5>
          <div className="flex flex-wrap gap-2">
            {existing_scopes.map((scope) => (
              <span key={scope} className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-lg border border-green-200 font-medium">
                {scope}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Scope checkboxes */}
      {scopes.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-semibold text-gray-900">
              {existing_scopes && existing_scopes.length > 0 ? "Additional Scopes Requested:" : "Requested Scopes:"}
            </h5>
            <label className="flex items-center space-x-2 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" id={`selectall_${index}`} className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
              <span>Select All</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {scopes.map((scope) => (
              <div key={scope} className="flex items-start space-x-3 p-4 rounded-lg border bg-gray-50 border-gray-200">
                <input
                  type="checkbox"
                  name={`authorization_details[${index}].connection_scopes`}
                  id={`scope_${scope}_${index}`}
                  value={scope}
                  defaultChecked
                  className="w-5 h-5 border-gray-300 rounded focus:ring-blue-500 mt-0.5 text-blue-600"
                />
                <label htmlFor={`scope_${scope}_${index}`} className="flex-1">
                  <span className="text-sm text-gray-900 font-semibold">{scope}</span>
                  <div className="text-xs text-gray-600">Permission scope on {provider_name || system}</div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="text-xs text-blue-800">
          This grants consent for the agent to connect to{" "}
          <strong>{provider_name || system}</strong> on your behalf.
          The agent will initiate authentication with the external system
          using the scopes selected above.
        </div>
      </div>
    </div>
  );
}
