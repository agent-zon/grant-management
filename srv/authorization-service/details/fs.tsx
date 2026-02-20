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
            File System Access
          </div>
          {category && (
            <span className="text-sm text-gray-600 font-medium">{category}</span>
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

      <p className="text-base text-gray-700 mb-5 leading-relaxed">{description}</p>

      {/* Access Configuration */}
      <div className="mb-4">
        <h5 className="text-sm font-semibold text-gray-900 mb-3">
          Access Configuration:
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {detail.roots && (
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
              <div className="text-xs text-gray-600 uppercase font-semibold mb-2">Allowed Directories</div>
              <div className="space-y-1">
                {detail.roots.map((root, rootIndex) => (
                  <input
                    key={root}
                    title="Root Path"
                    name={`authorization_details[${index}].roots[${rootIndex}]`}
                    type="text"
                    className="w-full bg-white text-gray-700 px-3 py-1.5 rounded-md text-xs border border-yellow-200 font-mono"
                    value={`${root}`}
                    readOnly
                  />
                ))}
              </div>
            </div>
          )}
          {detail.actions && (
            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
              <div className="text-xs text-gray-600 uppercase font-semibold mb-2">Allowed Operations</div>
              <div className="space-y-1">
                {detail.actions.map((action, actionIndex) => (
                  <input
                    key={action}
                    title="Action"
                    name={`authorization_details[${index}].actions[${actionIndex}]`}
                    type="text"
                    className="w-full bg-white text-gray-700 px-3 py-1.5 rounded-md text-xs border border-green-200 font-medium"
                    value={`${action}`}
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
        <h5 className="text-sm font-semibold text-gray-900 mb-3">
          File Access Permissions:
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
                className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
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
                  className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                />
                <label htmlFor={`perm_${permName}_${index}`} className="flex-1">
                  <div className="text-sm text-gray-900 font-semibold mb-1">
                    {permName}
                  </div>
                  {permission instanceof Object && permission?.essential ? (
                    <div className="text-xs text-red-700 bg-red-100 px-2 py-1 rounded-md mt-1 inline-block font-medium">
                      Required
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600">
                      Optional - You can choose to grant or deny this permission
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
