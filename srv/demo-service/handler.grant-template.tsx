import cds from "@sap/cds";
import { renderToString } from "react-dom/server";
import React from "react";
import type { DemoService } from "./demo-service.tsx";
import GrantsManagementService, {Grants} from "#cds-models/sap/scai/grants/GrantsManagementService";
import {isGrant} from "@/lib/is-grant.ts";

interface GrantData {
  id: string;
  status?: string;
  scope?: string;
  createdAt?: string;
  modifiedAt?: string;
  authorization_details?: any[];
}

export async function GET(this: DemoService, req: cds.Request) {
  const { grant_id } = req.data;
  try {
    // Fetch grant from grant-management service
    const grantService = await cds.connect.to(GrantsManagementService);
    const grant = await grantService.read(Grants,grant_id)

    if (!isGrant(grant)) {
      return cds.context?.http?.res.send(
        renderToString(
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🆕</div>
            <div className="text-gray-400 text-sm">No grant yet</div>
            <div className="text-gray-500 text-xs mt-2">
              Request permissions to create a grant
            </div>
          </div>
        )
      );
    }

    const scopes = grant.scope?.split(" ") || [];
    const hasAnalytics = scopes.some(s => s.includes("analytics"));
    const hasDeployment = scopes.some(s => s.includes("deployment"));
    const hasMonitoring = scopes.some(s => s.includes("monitoring"));

    cds.context?.http?.res.setHeader("Content-Type", "text/html");
    return cds.context?.http?.res.send(
      renderToString(
        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Status:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                grant.status === "active"
                  ? "bg-green-500/20 text-green-400"
                  : "bg-gray-500/20 text-gray-400"
              }`}
            >
              {grant.status || "unknown"}
            </span>
          </div>

          {/* Scopes */}
          <div>
            <div className="text-sm text-gray-400 mb-2">Granted Permissions:</div>
            {scopes.length > 0 ? (
              <div className="space-y-2">
                {hasAnalytics && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-blue-400">✓</span>
                    <span className="text-blue-300">📊 Analytics Read</span>
                  </div>
                )}
                {hasDeployment && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-yellow-400">✓</span>
                    <span className="text-yellow-300">🚀 Deployment</span>
                  </div>
                )}
                {hasMonitoring && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-green-400">✓</span>
                    <span className="text-green-300">📈 Monitoring</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No permissions granted yet</div>
            )}
          </div>

          {/* Raw Scope */}
          {grant.scope && (
            <div className="bg-gray-900/50 rounded p-3">
              <div className="text-xs text-gray-500 mb-1">Raw Scope:</div>
              <code className="text-xs text-gray-400">{grant.scope}</code>
            </div>
          )}

          {/* Timestamps */}
          {grant.createdAt && (
            <div className="text-xs text-gray-500">
              Created: {new Date(grant.createdAt).toLocaleString()}
            </div>
          )}

          {/* Link to Full Grant */}
          <a
            href={`/grants-management/Grants/${grant.id}`}
            className="inline-block text-blue-400 hover:text-blue-300 text-sm transition-colors"
            target="_blank"
          >
            View Full Grant →
          </a>
        </div>
      )
    );
  } catch (e) {
    console.error("Error fetching grant:", e);
    return cds.context?.http?.res.send(
      renderToString(
        <div className="text-center py-8 text-gray-500">
          <div className="text-2xl mb-2">⚠️</div>
          <div className="text-sm">Error loading grant</div>
        </div>
      )
    );
  }
}
