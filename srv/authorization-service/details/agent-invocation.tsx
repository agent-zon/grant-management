import React from "react";
import type { AuthorizationDetailProps } from "./types.tsx";

interface AgentInvocationProps extends AuthorizationDetailProps {
  identifier?: string;
  actions?: string[];
}

export default function AgentInvocationAuthorizationDetail({
  index,
  description,
  riskLevel,
  category,
  identifier,
  actions,
}: AgentInvocationProps) {
  const agentName = identifier?.replace(/^urn:agent:/, "") ?? "Unknown Agent";
  const hasOptional = (actions?.length ?? 0) > 0;

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
      {/* Header */}
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
            Agent Invocation
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
          {riskLevel === "high"
            ? "High Risk"
            : riskLevel === "medium"
              ? "Medium Risk"
              : "Low Risk"}
        </div>
      </div>

      <p className="text-base text-gray-700 mb-5 leading-relaxed">
        {description}
      </p>

      {/* Target Agent */}
      {identifier && (
        <div className="mb-4">
          <h5 className="text-sm font-semibold text-gray-900 mb-2">
            Target Agent:
          </h5>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center space-x-2">
              <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-md text-xs font-semibold">
                {agentName}
              </span>
              <span className="text-xs text-gray-500 font-mono">
                {identifier}
              </span>
            </div>
            <input
              type="hidden"
              name={`authorization_details[${index}].identifier`}
              value={identifier}
            />
          </div>
        </div>
      )}

      {/* Requested Skills / Actions */}
      {actions && actions.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-semibold text-gray-900">
              Requested Skills:
            </h5>
            {hasOptional && (
              <label className="flex items-center space-x-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" id={`selectall_${index}`} className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                <span>Select All</span>
              </label>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {actions.map((action) => (
              <div
                key={action}
                className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <input
                  type="checkbox"
                  name={`authorization_details[${index}].actions.${action}`}
                  id={`action_${action}_${index}`}
                  defaultChecked
                  className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                />
                <label
                  htmlFor={`action_${action}_${index}`}
                  className="flex-1"
                >
                  <span className="text-sm text-gray-900 font-semibold">
                    {action}
                  </span>
                  <div className="text-xs text-gray-600">
                    Skill invocation on {agentName}
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="text-xs text-amber-800">
          This grants the requesting agent permission to invoke{" "}
          <strong>{agentName}</strong> with the skills listed above. The target
          agent's own permissions will determine what resources are accessible.
        </div>
      </div>
    </div>
  );
}
