import React from "react";
import type { AuthorizationDetailProps } from "./types.tsx";
import type { MCPToolAuthorizationDetailRequest } from "#cds-models/com/sap/agent/grants";
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
      className={`bg-gray-700/30 rounded-lg p-6 border-l-4 ${
        riskLevel === "high"
          ? "border-red-500"
          : riskLevel === "medium"
            ? "border-yellow-500"
            : "border-green-500"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div
            className={`px-3 py-1 rounded text-sm font-medium ${
              riskLevel === "high"
                ? "bg-red-500/20 text-red-300"
                : riskLevel === "medium"
                  ? "bg-yellow-500/20 text-yellow-300"
                  : "bg-green-500/20 text-green-300"
            }`}
          >
            MCP Access
          </div>
          <span className="text-sm text-gray-400">{category}</span>
        </div>
        <div
          className={`px-2 py-1 rounded text-xs font-bold ${
            riskLevel === "high"
              ? "bg-red-500/20 text-red-300"
              : riskLevel === "medium"
                ? "bg-yellow-500/20 text-yellow-300"
                : "bg-green-500/20 text-green-300"
          }`}
        >
          {riskLevel?.toUpperCase()} RISK
        </div>
      </div>

      <p className="text-sm text-gray-300 mb-4">{description}</p>

      {/* MCP Server Configuration */}
      <div className="mb-4">
        <h5 className="text-sm font-medium text-gray-400 mb-2">
          MCP Server Configuration:
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {detail.server && (
            <div className="bg-gray-600/50 rounded p-2">
              <div className="text-xs text-gray-400 uppercase">Server</div>
              <div className="text-sm text-white">
                <input
                  title="Server"
                  name={`authorization_details[${index}].server`}
                  type="text"
                  className="inline-block bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs"
                  value={`🖥️ ${detail.server}`}
                  readOnly
                />
              </div>
            </div>
          )}
          {detail.transport && (
            <div className="bg-gray-600/50 rounded p-2">
              <div className="text-xs text-gray-400 uppercase">Transport</div>
              <div className="text-sm text-white">
                <input
                  title="Transport"
                  name={`authorization_details[${index}].transport`}
                  type="text"
                  className="inline-block bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs"
                  value={`🔗 ${detail.transport}`}
                  readOnly
                />
              </div>
            </div>
          )}
          {detail.locations && (
            <div className="bg-gray-600/50 rounded p-2">
              <div className="text-xs text-gray-400 uppercase">Locations</div>
              <div className="text-sm text-white">
                {detail.locations.map((loc, locIndex) => (
                  <input
                    key={loc}
                    title="Location"
                    name={`authorization_details[${index}].locations[${locIndex}]`}
                    type="text"
                    className="inline-block bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs mr-1 mb-1"
                    value={`🌐 ${loc}`}
                    readOnly
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MCP Tools */}
      {detail.tools && Object.keys(detail.tools).length > 0 && (
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-400 mb-3">MCP Tools:</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(
              detail.tools as Record<
                string,
                boolean | null | { essential: boolean }
              >
            ).map(([toolName, permission]) => (
              <div
                key={toolName}
                className="flex items-center space-x-3 p-3 bg-gray-600/30 rounded"
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
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor={`tool_${toolName}_${index}`} className="flex-1">
                  <div className="text-sm text-white font-medium">
                    {toolName}
                  </div>
                  {permission instanceof Object && permission.essential ? (
                    <div className="text-xs text-red-300 bg-red-500/20 px-2 py-1 rounded mt-1 inline-block">
                      REQUIRED
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">
                      Optional - you can choose to grant or deny
                    </div>
                  )}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
