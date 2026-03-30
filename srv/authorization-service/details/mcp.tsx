import React from "react";
import type { AuthorizationDetailProps } from "./types.tsx";
import type { MCPToolAuthorizationDetailRequest } from "#cds-models/sap/scai/grants";
import "./types.tsx";

export default function MCPAuthorizationDetail({
  index,
  description,
  riskLevel,
  category,
  ...detail
}: MCPToolAuthorizationDetailRequest & AuthorizationDetailProps) {
  const toolEntries = detail.tools
    ? Object.entries(detail.tools as Record<string, boolean | null | { essential: boolean }>)
    : [];
  const hasOptional = toolEntries.some(
    ([, v]) => !(v instanceof Object && v.essential)
  );

  return (
    <div
      className={`bg-white rounded-xl p-6 border-2 ${riskLevel === "high"
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
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${riskLevel === "high"
              ? "bg-red-100 text-red-700"
              : riskLevel === "medium"
                ? "bg-amber-100 text-amber-700"
                : "bg-green-100 text-green-700"
              }`}
          >
            Grant Tools Access
          </div>
          {detail.server && (
            <span className="text-sm text-gray-600 font-medium">{detail.server}</span>
          )}
          {category && (
            <span className="text-sm text-gray-600 font-medium">{category}</span>
          )}
        </div>
        <div
          className={`px-3 py-1 rounded-lg text-xs font-bold ${riskLevel === "high"
            ? "bg-red-100 text-red-700"
            : riskLevel === "medium"
              ? "bg-amber-100 text-amber-700"
              : "bg-green-100 text-green-700"
            }`}
        >
          {riskLevel === "high" ? "High Risk" : riskLevel === "medium" ? "Medium Risk" : "Low Risk"}
        </div>
      </div>

      <p className="text-base text-gray-700 mb-5 leading-relaxed">{description}</p>

      {/* Hidden inputs for fields not rendered as form controls */}
      {detail.server && (
        <input type="hidden" name={`authorization_details[${index}].server`} value={detail.server} />
      )}
      {detail.transport && (
        <input type="hidden" name={`authorization_details[${index}].transport`} value={detail.transport} />
      )}

      {/* Available Tools */}
      {toolEntries.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-semibold text-gray-900">Available Capabilities:</h5>
            {hasOptional && (
              <label className="flex items-center space-x-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" id={`selectall_${index}`} className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
                <span>Select All</span>
              </label>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {toolEntries.map(([toolName, permission]) => {
              const isRequired = permission instanceof Object && permission.essential;
              return (
                <div
                  key={toolName}
                  className={`flex items-start space-x-3 p-4 rounded-lg border ${
                    isRequired ? "bg-blue-50/50 border-blue-200" : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    name={`authorization_details[${index}].tools.${toolName.replace(/\./g, "_")}`}
                    id={`tool_${toolName}_${index}`}
                    value="true"
                    defaultChecked={Boolean(isRequired ? true : permission)}
                    disabled={Boolean(isRequired)}
                    className={`w-5 h-5 border-gray-300 rounded focus:ring-blue-500 mt-0.5 ${
                      isRequired ? "text-blue-400 cursor-not-allowed" : "text-blue-600"
                    }`}
                  />
                  <label htmlFor={`tool_${toolName}_${index}`} className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900 font-semibold">{toolName}</span>
                      {isRequired && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Required</span>
                      )}
                    </div>
                    {!isRequired && (
                      <div className="text-xs text-gray-600">
                        Optional - You can choose to grant or deny this capability
                      </div>
                    )}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
