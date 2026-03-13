import React, { useState } from "react";
import { Copy, Download, CheckCircle, FileJson, FileText } from "lucide-react";
import type { AgentPolicies, OdrlPolicy } from "~/types/policies";

interface PolicyViewerProps {
  agent: AgentPolicies;
  manifest?: string;
}

type TabType = "odrl" | "yaml" | "manifest";

export function PolicyViewer({ agent, manifest }: PolicyViewerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("odrl");
  const [copied, setCopied] = useState(false);

  let parsedPolicies: OdrlPolicy | null = null;
  try {
    parsedPolicies = JSON.parse(agent.policies);
  } catch (error) {
    console.error("Failed to parse policies JSON:", error);
  }

  const handleCopy = async () => {
    let content = "";
    if (activeTab === "odrl") {
      content = JSON.stringify(parsedPolicies, null, 2);
    } else if (activeTab === "yaml") {
      content = agent.yaml;
    } else if (activeTab === "manifest" && manifest) {
      content = manifest;
    }

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleDownload = () => {
    let content = "";
    let filename = "";
    let mimeType = "";

    if (activeTab === "odrl") {
      content = JSON.stringify(parsedPolicies, null, 2);
      filename = `${agent.agentId}-policies.json`;
      mimeType = "application/json";
    } else if (activeTab === "yaml") {
      content = agent.yaml;
      filename = `${agent.agentId}.yaml`;
      mimeType = "text/yaml";
    } else if (activeTab === "manifest" && manifest) {
      content = manifest;
      filename = `${agent.agentId}-manifest.yaml`;
      mimeType = "text/yaml";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {agent.agentId}
            </h2>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>Created: {new Date(agent.createdAt).toLocaleString()}</span>
              <span>•</span>
              <span>
                Modified: {new Date(agent.modifiedAt).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="text-sm">Copy</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Download</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <div className="flex space-x-1 p-2">
          <button
            onClick={() => setActiveTab("odrl")}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
              ${
                activeTab === "odrl"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }
            `}
          >
            <FileJson className="w-4 h-4" />
            <span className="text-sm font-medium">ODRL JSON</span>
          </button>
          <button
            onClick={() => setActiveTab("yaml")}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
              ${
                activeTab === "yaml"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }
            `}
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">YAML</span>
          </button>
          {manifest && (
            <button
              onClick={() => setActiveTab("manifest")}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
                ${
                  activeTab === "manifest"
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                }
              `}
            >
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">Manifest</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "odrl" && (
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-300 font-mono">
              {parsedPolicies
                ? JSON.stringify(parsedPolicies, null, 2)
                : "Failed to parse ODRL policies"}
            </pre>
          </div>
        )}

        {activeTab === "yaml" && (
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-300 font-mono">
              {agent.yaml || "No YAML data available"}
            </pre>
          </div>
        )}

        {activeTab === "manifest" && manifest && (
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-300 font-mono">{manifest}</pre>
          </div>
        )}

        {/* Policy Stats */}
        {activeTab === "odrl" && parsedPolicies && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Permissions</p>
                  <p className="text-xl font-bold text-white">
                    {parsedPolicies.permission?.length || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <FileJson className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Prohibitions</p>
                  <p className="text-xl font-bold text-white">
                    {parsedPolicies.prohibition?.length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
