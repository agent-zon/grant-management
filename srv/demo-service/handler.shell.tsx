import cds from "@sap/cds";
import { renderToString } from "react-dom/server";
import { htmlTemplate } from "../middleware/htmx.tsx";
import React from "react";
import type { DemoService } from "./demo-service.tsx";

export async function GET(this: DemoService, req: cds.Request) {
  const { grant_id } = req.data;

  req.http?.res.setHeader("Content-Type", "text/html");
  req.http?.res.send(
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
                
                {/* Analyze - loaded dynamically */}
                <div 
                  hx-get={`/demo/devops_bot/analyze?grant_id=${grant_id}`}
                  hx-trigger="load, grant-updated from:body"
                  hx-swap="outerHTML"
                  className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                >
                  <div className="text-center text-gray-400 py-4">Loading...</div>
                </div>

                {/* Deploy - loaded dynamically */}
                <div 
                  hx-get={`/demo/devops_bot/deploy?grant_id=${grant_id}`}
                  hx-trigger="load, grant-updated from:body"
                  hx-swap="outerHTML"
                  className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                >
                  <div className="text-center text-gray-400 py-4">Loading...</div>
                </div>

                {/* Monitor - loaded dynamically */}
                <div 
                  hx-get={`/demo/devops_bot/monitor?grant_id=${grant_id}`}
                  hx-trigger="load, grant-updated from:body"
                  hx-swap="outerHTML"
                  className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                >
                  <div className="text-center text-gray-400 py-4">Loading...</div>
                </div>
              </div>

              {/* Right: Grant Details & Content */}
              <div className="space-y-4">
                {/* Grant Details */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h2 className="text-xl font-bold text-white mb-4">📋 Grant Status</h2>
                  <div
                    id="grant-details"
                    hx-get={`/demo/devops_bot/grant?grant_id=${grant_id}`}
                    hx-trigger="load, grant-updated from:body"
                    hx-swap="innerHTML"
                  >
                    <div className="text-center text-gray-400 py-4">
                      Loading grant details...
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
