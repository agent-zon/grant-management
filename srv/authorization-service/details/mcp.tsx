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

      {/* Persist server and transport for consent record */}
      {detail.server && (
        <input
          type="hidden"
          name={`authorization_details[${index}].server`}
          value={detail.server}
        />
      )}
      {detail.transport && (
        <input
          type="hidden"
          name={`authorization_details[${index}].transport`}
          value={detail.transport}
        />
      )}

      {/* Available Tools */}
      {
        detail.tools && Object.keys(detail.tools).length > 0 && (
          <div className="mb-4">
            <h5 className="text-sm font-semibold text-gray-900 mb-3">Available Capabilities:</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(
                detail.tools as Record<
                  string,
                  boolean | null | { essential: boolean }
                >
              ).map(([toolName, permission]) => (
                <div
                  key={toolName}
                  className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <input
                    type="checkbox"
                    name={`authorization_details[${index}].tools.${toolName.replace(/\./g, "_")}`}
                    id={`tool_${toolName}_${index}`}
                    defaultChecked={Boolean(
                      permission instanceof Object
                        ? permission.essential
                        : permission
                    )}
                    disabled={Boolean(
                      permission instanceof Object ? permission.essential : false
                    )}
                    className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                  />
                  <label htmlFor={`tool_${toolName}_${index}`} className="flex-1">
                    <div className="text-sm text-gray-900 font-semibold mb-1">
                      {toolName}
                    </div>
                    {permission instanceof Object && permission.essential ? (
                      <div className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded-md mt-1 inline-block font-medium">
                        Required
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600">
                        Optional - You can choose to grant or deny this capability
                      </div>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )
      }
    </div >
  );
}
