//preserve react import to avoid runtime error
import React from "react";
import type {
  FileSystemAuthorizationDetailRequest,
  RARClaim,
} from "#cds-models/sap/scai/grants";
import type { AuthorizationDetailProps } from "./types.tsx";
import "./types.tsx";
export default function FSAuthorizationDetail({
  index,
  description,
  riskLevel,
  category,
  type_code,
  ...detail
}: FileSystemAuthorizationDetailRequest & AuthorizationDetailProps) {
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
            {type_code}
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

      {/* File System Configuration */}
      <div className="mb-4">
        <h5 className="text-sm font-medium text-gray-400 mb-2">
          File System Configuration:
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {detail.roots && (
            <div className="bg-gray-600/50 rounded p-2">
              <div className="text-xs text-gray-400 uppercase">Root Paths</div>
              <div className="text-sm text-white">
                {detail.roots.map((root, rootIndex) => (
                  <input
                    key={root}
                    title="Root Path"
                    name={`authorization_details[${index}].roots[${rootIndex}]`}
                    type="text"
                    className="inline-block bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs mr-1 mb-1"
                    value={`📁 ${root}`}
                    readOnly
                  />
                ))}
              </div>
            </div>
          )}
          {detail.actions && (
            <div className="bg-gray-600/50 rounded p-2">
              <div className="text-xs text-gray-400 uppercase">Actions</div>
              <div className="text-sm text-white">
                {detail.actions.map((action, actionIndex) => (
                  <input
                    key={action}
                    title="Action"
                    name={`authorization_details[${index}].actions[${actionIndex}]`}
                    type="text"
                    className="inline-block bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs mr-1 mb-1"
                    value={`⚡ ${action}`}
                    readOnly
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* File Permissions */}
      <div className="mb-4">
        <h5 className="text-sm font-medium text-gray-400 mb-3">
          File Permissions:
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {detail.permissions &&
            Object.entries(
              detail.permissions as Record<
                string,
                { essential: true } | boolean | null
              >
            ).map(([permName, permission]) => (
              <div
                key={permName}
                className="flex items-center space-x-3 p-3 bg-gray-600/30 rounded"
              >
                <input
                  type="checkbox"
                  name={`authorization_details[${index}].permissions_${permName}`}
                  id={`perm_${permName}_${index}`}
                  defaultChecked={Boolean(
                    permission instanceof Object
                      ? permission?.essential
                      : permission
                  )}
                  disabled={Boolean(
                    permission instanceof Object ? permission?.essential : false
                  )}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <label htmlFor={`perm_${permName}_${index}`} className="flex-1">
                  <div className="text-sm text-white font-medium">
                    {permName}
                  </div>
                  {permission instanceof Object && permission?.essential ? (
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
    </div>
  );
}
