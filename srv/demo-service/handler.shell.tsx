import cds from "@sap/cds";
import { renderToString } from "react-dom/server";
import { htmlTemplate } from "../middleware/htmx.tsx";
import React from "react";
import type { DemoService } from "./demo-service.tsx";

export async function GET(this: DemoService, grant_id: string) {
  cds.context?.http?.res.setHeader("Content-Type", "text/html");
  cds.context?.http?.res.send(
    htmlTemplate(
      renderToString(
        <body className="bg-gray-950 text-white min-h-screen">
          <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
                🤖 DevOps Bot
              </h1>
              <p className="text-gray-400 text-lg mb-2">
                Grant ID: <code className="text-purple-400 font-mono text-sm">{grant_id}</code>
              </p>
              <p className="text-gray-500 text-sm">
                Progressive permissions demo
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Actions */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white mb-4">🎯 Actions</h2>
                
                {/* Analyze */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-3xl">📊</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">Analyze</h3>
                      <p className="text-sm text-gray-400">View metrics and logs</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button
                      hx-post={`/demo/analysis_request?grant_id=${grant_id}`}
                      hx-target="#content"
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Request Analysis Access
                    </button>
                    <button
                      hx-get={`/demo/analysis_elements?grant_id=${grant_id}`}
                      hx-target="#content"
                      className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                    >
                      Go to Analysis →
                    </button>
                  </div>
                </div>

                {/* Deploy */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-yellow-500 transition-colors">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-3xl">🚀</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">Deploy</h3>
                      <p className="text-sm text-gray-400">Deploy to environments</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button
                      hx-post={`/demo/deployment_request?grant_id=${grant_id}`}
                      hx-target="#content"
                      className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                    >
                      Request Deployment Access
                    </button>
                    <button
                      hx-get={`/demo/deployment_elements?grant_id=${grant_id}`}
                      hx-target="#content"
                      className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                    >
                      Go to Deployment →
                    </button>
                  </div>
                </div>

                {/* Monitor */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500 transition-colors">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-3xl">📈</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white">Monitor</h3>
                      <p className="text-sm text-gray-400">View system health</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <button
                      hx-post={`/demo/monitoring_request?grant_id=${grant_id}`}
                      hx-target="#content"
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Request Monitoring Access
                    </button>
                    <button
                      hx-get={`/demo/monitoring_elements?grant_id=${grant_id}`}
                      hx-target="#content"
                      className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                    >
                      Go to Monitoring →
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Grant Details & Content */}
              <div className="space-y-4">
                {/* Grant Details */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h2 className="text-xl font-bold text-white mb-4">📋 Grant Status</h2>
                  <div
                    id="grant-details"
                    hx-get={`/demo/grant_status?grant_id=${grant_id}`}
                    hx-trigger="load, grant-updated from:body"
                    hx-swap="innerHTML"
                  >
                    <div className="text-center text-gray-400 py-4">
                      Loading grant details...
                    </div>
                  </div>
                </div>

                {/* Dynamic Content Area */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 min-h-[400px]">
                  <h2 className="text-xl font-bold text-white mb-4">📄 Content</h2>
                  <div id="content" className="text-gray-400">
                    <div className="text-center py-12">
                      <span className="text-6xl">👈</span>
                      <p className="mt-4">Click an action to get started</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </body>
      )
    )
  );
}
