import React, { useState } from "react";
import {
  Copy,
  Download,
  CheckCircle,
  FileJson,
  Shield,
  ShieldOff,
  FileText,
  ChevronRight,
  Layers,
  Zap,
  Target,
  GitBranch,
} from "lucide-react";
import type {
  AgentPolicies,
  DcnContainer,
  DcnPolicy,
  PolicyRule,
  PolicyCondition,
  PolicyConditionArg,
} from "~/types/policies";

interface PolicyViewerProps {
  agent: AgentPolicies;
  manifest?: string;
}

type TabType = "dcn" | "rules" | "manifest";

function parsePolicies(raw: string): DcnContainer | DcnPolicy[] | null {
  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

function extractPolicies(data: DcnContainer | DcnPolicy[] | null): DcnPolicy[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.policies ?? [];
}

function totalRules(policies: DcnPolicy[]): number {
  return policies.reduce((sum, p) => sum + (p.rules?.length ?? 0), 0);
}

function totalResources(policies: DcnPolicy[]): number {
  const resources = new Set<string>();
  for (const p of policies) {
    for (const r of p.rules ?? []) {
      for (const res of r.resources ?? []) {
        resources.add(res);
      }
    }
  }
  return resources.size;
}

function ConditionRenderer({ condition, depth = 0 }: { condition: PolicyCondition; depth?: number }) {
  const operator = condition.call?.[0] ?? "?";

  return (
    <div className={`${depth > 0 ? "ml-4 pl-3 border-l border-gray-600/50" : ""}`}>
      <div className="flex items-center gap-1.5 text-xs">
        <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded font-mono font-medium">
          {operator}
        </span>
      </div>
      <div className="mt-1 space-y-1">
        {condition.args?.map((arg, i) => (
          <ConditionArgRenderer key={i} arg={arg} depth={depth + 1} />
        ))}
      </div>
    </div>
  );
}

function ConditionArgRenderer({ arg, depth }: { arg: PolicyConditionArg; depth: number }) {
  if (typeof arg === "string" || typeof arg === "number" || typeof arg === "boolean") {
    return (
      <div className="ml-4 flex items-center gap-1.5 text-xs text-gray-300">
        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0" />
        <span className="font-mono">{JSON.stringify(arg)}</span>
      </div>
    );
  }

  if (arg && typeof arg === "object" && "ref" in arg) {
    return (
      <div className="ml-4 flex items-center gap-1.5 text-xs">
        <GitBranch className="w-3 h-3 text-purple-400 flex-shrink-0" />
        <span className="font-mono text-purple-300">
          {(arg as { ref: string[] }).ref.join(".")}
        </span>
      </div>
    );
  }

  if (arg && typeof arg === "object" && "call" in arg) {
    return <ConditionRenderer condition={arg as PolicyCondition} depth={depth} />;
  }

  return (
    <div className="ml-4 text-xs text-gray-500 font-mono">
      {JSON.stringify(arg)}
    </div>
  );
}

function RuleCard({ rule, index }: { rule: PolicyRule; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const isGrant = rule.rule === "grant";

  return (
    <div className="bg-gray-800/60 rounded-lg border border-gray-700 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700/30 transition-colors"
      >
        <ChevronRight
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
        <div className={`flex items-center gap-2 px-2 py-0.5 rounded text-xs font-semibold ${
          isGrant
            ? "bg-emerald-500/20 text-emerald-300"
            : "bg-red-500/20 text-red-300"
        }`}>
          {isGrant ? <Shield className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
          {rule.rule.toUpperCase()}
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm text-gray-300">
            {(rule.resources ?? []).join(", ") || "all resources"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {(rule.actions ?? []).map((action) => (
            <span
              key={action}
              className="px-2 py-0.5 text-xs bg-blue-500/15 text-blue-300 rounded-full"
            >
              {action}
            </span>
          ))}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-700/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            {/* Actions */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-wider mb-2">
                <Zap className="w-3 h-3" />
                Actions
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(rule.actions ?? []).map((action) => (
                  <span
                    key={action}
                    className="px-2.5 py-1 text-xs bg-blue-500/15 text-blue-300 rounded-md border border-blue-500/20"
                  >
                    {action}
                  </span>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-wider mb-2">
                <Target className="w-3 h-3" />
                Resources
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(rule.resources ?? []).map((resource) => (
                  <span
                    key={resource}
                    className="px-2.5 py-1 text-xs bg-purple-500/15 text-purple-300 rounded-md border border-purple-500/20 font-mono"
                  >
                    {resource}
                  </span>
                ))}
                {(rule.resources ?? []).length === 0 && (
                  <span className="text-xs text-gray-500 italic">all</span>
                )}
              </div>
            </div>
          </div>

          {/* Condition */}
          {rule.condition && (
            <div className="mt-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-wider mb-2">
                <Layers className="w-3 h-3" />
                Condition
              </div>
              <div className="bg-gray-900/60 rounded-md p-3 border border-gray-700/50">
                <ConditionRenderer condition={rule.condition} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PolicyViewer({ agent, manifest }: PolicyViewerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("rules");
  const [copied, setCopied] = useState(false);

  const parsed = parsePolicies(agent.policies);
  const policies = extractPolicies(parsed);

  const handleCopy = async () => {
    let content = "";
    if (activeTab === "dcn") {
      content = JSON.stringify(parsed, null, 2);
    } else if (activeTab === "rules") {
      content = JSON.stringify(policies, null, 2);
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

    if (activeTab === "dcn") {
      content = JSON.stringify(parsed, null, 2);
      filename = `${agent.agentId}-policy.dcn.json`;
      mimeType = "application/json";
    } else if (activeTab === "rules") {
      content = JSON.stringify(policies, null, 2);
      filename = `${agent.agentId}-rules.json`;
      mimeType = "application/json";
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
              <span>·</span>
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
            onClick={() => setActiveTab("rules")}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
              ${
                activeTab === "rules"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }
            `}
          >
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">AMS Rules</span>
          </button>
          <button
            onClick={() => setActiveTab("dcn")}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors
              ${
                activeTab === "dcn"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }
            `}
          >
            <FileJson className="w-4 h-4" />
            <span className="text-sm font-medium">DCN JSON</span>
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
        {/* Rules Tab */}
        {activeTab === "rules" && (
          <div className="space-y-6">
            {policies.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No AMS policies defined</p>
              </div>
            )}

            {policies.map((policy, pIdx) => (
              <div key={pIdx}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-indigo-500/20 rounded">
                    <Layers className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {policy.policy?.join(".") || `Policy ${pIdx + 1}`}
                  </h3>
                  <span className="text-xs text-gray-500 ml-2">
                    {policy.rules?.length ?? 0} rule{(policy.rules?.length ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-2">
                  {(policy.rules ?? []).map((rule, rIdx) => (
                    <RuleCard key={rIdx} rule={rule} index={rIdx} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DCN JSON Tab */}
        {activeTab === "dcn" && (
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-300 font-mono">
              {parsed
                ? JSON.stringify(parsed, null, 2)
                : "Failed to parse AMS DCN policy"}
            </pre>
          </div>
        )}

        {/* Manifest Tab */}
        {activeTab === "manifest" && manifest && (
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-300 font-mono">{manifest}</pre>
          </div>
        )}

        {/* Policy Stats */}
        {activeTab === "rules" && policies.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                  <Layers className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Policies</p>
                  <p className="text-xl font-bold text-white">
                    {policies.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Rules</p>
                  <p className="text-xl font-bold text-white">
                    {totalRules(policies)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Target className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Resources</p>
                  <p className="text-xl font-bold text-white">
                    {totalResources(policies)}
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
