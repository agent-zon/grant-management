import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Code,
  Database,
  Globe,
  Zap,
  ExternalLink,
  Copy,
  Download,
  MessageCircle,
  Shield,
} from "lucide-react";
import {
  Form,
  useLoaderData,
  useActionData,
  useFetcher,
  Link,
  redirect,
} from "react-router";
import type { Route } from "./+types/chat";

interface Message {
  id: string;
  type: "user" | "agent" | "system";
  content: string;
  timestamp: string;
  tools?: string[];
  status?: "processing" | "completed" | "error";
  artifacts?: DeploymentArtifact[];
}

interface DeploymentArtifact {
  type: "url" | "config" | "code" | "documentation";
  title: string;
  content: string;
  description?: string;
}

interface ConsentRequest {
  id: string;
  workloadId: string;
  requiredScopes: string[];
  reason: string;
  status: "pending" | "approved" | "denied";
}

// Store chat state in memory (in real app, this would be in database)
let chatSessions: Record<string, Message[]> = {
  default: [
    {
      id: "1",
      type: "system",
      content:
        "MCP Consent Agent initialized. Welcome! I can help you with file operations, data analysis, and system tasks - but I'll need your consent for specific tool access.",
      timestamp: new Date().toISOString(),
      status: "completed",
    },
  ],
};

let pendingConsentRequests: ConsentRequest[] = [];

export function meta({}: Route.MetaArgs) {
  return [
    { title: "AI Chat - Agent Grants" },
    {
      name: "description",
      content: "Chat with AI agent with consent-aware tool access",
    },
  ];
}

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session") || "default";

  return {
    messages: chatSessions[sessionId] || [],
    sessionId,
    pendingRequests: pendingConsentRequests.filter(
      (r) => r.workloadId === sessionId
    ),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "send-message") {
    const message = formData.get("message") as string;
    const sessionId = (formData.get("sessionId") as string) || "default";

    if (!message.trim()) {
      return { success: false, error: "Message cannot be empty" };
    }

    // Initialize session if it doesn't exist
    if (!chatSessions[sessionId]) {
      chatSessions[sessionId] = [];
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: message,
      timestamp: new Date().toISOString(),
      status: "completed",
    };

    chatSessions[sessionId].push(userMessage);

    // Check if message requires consent
    const requiresWriteAccess =
      message.toLowerCase().includes("create") ||
      message.toLowerCase().includes("write") ||
      message.toLowerCase().includes("modify") ||
      message.toLowerCase().includes("update");

    const requiresExportAccess =
      message.toLowerCase().includes("export") ||
      message.toLowerCase().includes("download") ||
      message.toLowerCase().includes("backup");

    if (requiresWriteAccess || requiresExportAccess) {
      const requiredScopes = [];
      if (requiresWriteAccess) requiredScopes.push("tools:write");
      if (requiresExportAccess) requiredScopes.push("data:export");

      // Create consent request
      const consentRequest: ConsentRequest = {
        id: `consent-${Date.now()}`,
        workloadId: sessionId,
        requiredScopes,
        reason: `Agent needs ${requiredScopes.join(", ")} permissions to complete: "${message}"`,
        status: "pending",
      };

      pendingConsentRequests.push(consentRequest);

      // Add agent response requesting consent
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "agent",
        content:
          `I need your consent to access the following scopes to complete your request:\n\n` +
          `${requiredScopes.map((scope) => `• ${scope}`).join("\n")}\n\n` +
          `This will allow me to use tools like ${requiresWriteAccess ? "CreateFile, UpdateFile" : ""} ${requiresExportAccess ? "ExportData, GenerateReport" : ""}.\n\n` +
          `Please grant consent to proceed.`,
        timestamp: new Date().toISOString(),
        status: "completed",
        tools: requiredScopes,
        artifacts: [
          {
            type: "url",
            title: "Grant Consent",
            content: `/consent-modal?request=${consentRequest.id}`,
            description: `Grant ${requiredScopes.join(", ")} permissions`,
          },
        ],
      };

      chatSessions[sessionId].push(agentMessage);

      return {
        success: true,
        requiresConsent: true,
        consentRequestId: consentRequest.id,
        requiredScopes,
      };
    }

    // Add normal agent response
    const agentMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: "agent",
      content: `I've successfully processed your request using the available permissions. Here are the results:`,
      timestamp: new Date().toISOString(),
      status: "completed",
      tools: ["ListFiles", "ReadFile", "GetFileInfo"],
      artifacts: [
        {
          type: "config",
          title: "Task Results",
          content: `{
  "status": "completed",
  "permissions_used": ["tools:read"],
  "completion_time": "${new Date().toISOString()}",
  "result": "Task completed successfully"
}`,
          description: "Task completed with available permissions",
        },
      ],
    };

    chatSessions[sessionId].push(agentMessage);

    return {
      success: true,
      requiresConsent: false,
    };
  }

  if (intent === "approve-consent") {
    const requestId = formData.get("requestId") as string;
    const grantedScopes = formData.getAll("scopes") as string[];

    // Find and update consent request
    const request = pendingConsentRequests.find((r) => r.id === requestId);
    if (request) {
      request.status = "approved";

      // Add success message to chat
      const sessionId = request.workloadId;
      if (chatSessions[sessionId]) {
        const successMessage: Message = {
          id: `consent-approved-${Date.now()}`,
          type: "agent",
          content: `✅ Consent granted! I now have access to: ${grantedScopes.join(", ")}\n\nTask completed successfully with your approved permissions.`,
          timestamp: new Date().toISOString(),
          status: "completed",
          tools: grantedScopes.includes("tools:write")
            ? ["CreateFile", "UpdateFile"]
            : ["ExportData", "GenerateReport"],
        };

        chatSessions[sessionId].push(successMessage);
      }

      return {
        success: true,
        message: "Consent approved and task completed",
        grantedScopes,
      };
    }

    return { success: false, error: "Consent request not found" };
  }

  return null;
}

export default function Chat({ loaderData }: Route.ComponentProps) {
  const { messages, sessionId, pendingRequests } = loaderData;
  const actionData = useActionData<typeof action>();
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case "ListFiles":
        return <Database className="w-3 h-3" />;
      case "ReadFile":
        return <Code className="w-3 h-3" />;
      case "CreateFile":
        return <Zap className="w-3 h-3" />;
      case "UpdateFile":
        return <Code className="w-3 h-3" />;
      case "DeleteFile":
        return <Globe className="w-3 h-3" />;
      case "ExportData":
        return <Database className="w-3 h-3" />;
      case "GenerateReport":
        return <Code className="w-3 h-3" />;
      case "mcp-guard":
        return <Globe className="w-3 h-3" />;
      case "scope-validator":
        return <Database className="w-3 h-3" />;
      case "consent-manager":
        return <Zap className="w-3 h-3" />;
      case "session-manager":
        return <MessageCircle className="w-3 h-3" />;
      case "token-validator":
        return <Zap className="w-3 h-3" />;
      case "HttpRequest":
        return <Globe className="w-3 h-3" />;
      default:
        return <Zap className="w-3 h-3" />;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getArtifactIcon = (type: string) => {
    switch (type) {
      case "url":
        return <ExternalLink className="w-4 h-4" />;
      case "config":
        return <Code className="w-4 h-4" />;
      case "code":
        return <Code className="w-4 h-4" />;
      case "documentation":
        return <Database className="w-4 h-4" />;
      default:
        return <Code className="w-4 h-4" />;
    }
  };

  const getArtifactColor = (type: string) => {
    switch (type) {
      case "url":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "config":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "code":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "documentation":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/"
            className="text-blue-400 hover:text-blue-300 transition-colors mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-2xl font-bold text-white">AI Chat Assistant</h1>
          <p className="text-gray-400">Chat with consent-aware AI agent</p>
        </div>

        {/* Action Results */}
        {actionData && actionData.success && actionData.requiresConsent && (
          <div className="mb-6 bg-yellow-800/50 backdrop-blur-sm rounded-xl border border-yellow-700 p-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-yellow-400" />
              <p className="text-yellow-300">
                Consent required for scopes:{" "}
                {actionData.requiredScopes?.join(", ")}
              </p>
            </div>
          </div>
        )}

        {actionData && actionData.success && !actionData.requiresConsent && (
          <div className="mb-6 bg-green-800/50 backdrop-blur-sm rounded-xl border border-green-700 p-4">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5 text-green-400" />
              <p className="text-green-300">Message processed successfully</p>
            </div>
          </div>
        )}

        {/* Chat Interface */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
          {/* Chat Header */}
          <div className="bg-gray-700/50 px-6 py-4 border-b border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">
                    MCP Consent Assistant
                  </h3>
                  <p className="text-sm text-gray-400">
                    AI Agent with consent-aware tool access
                  </p>
                  <p className="text-xs text-blue-400">Session: {sessionId}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  to="/grants"
                  className="text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  Manage Grants
                </Link>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-400">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                    message.type === "user"
                      ? "bg-blue-600 text-white"
                      : message.type === "system"
                        ? "bg-gray-700 text-gray-300"
                        : "bg-gray-700 text-white"
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.type !== "user" && (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>

                      {message.tools && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {message.tools.map((tool, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center space-x-1 px-2 py-1 bg-gray-600/50 rounded text-xs text-gray-300"
                            >
                              {getToolIcon(tool)}
                              <span>{tool}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {message.status === "processing" && (
                        <div className="mt-2 flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-xs text-gray-400">
                            Processing...
                          </span>
                        </div>
                      )}

                      {/* Artifacts with Consent Modal Trigger */}
                      {message.artifacts && message.artifacts.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <h4 className="text-sm font-medium text-white">
                            Generated Artifacts:
                          </h4>
                          {message.artifacts.map((artifact, index) => (
                            <div
                              key={index}
                              className={`p-3 rounded-lg border ${getArtifactColor(artifact.type)}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  {getArtifactIcon(artifact.type)}
                                  <span className="text-sm font-medium">
                                    {artifact.title}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {artifact.type === "url" &&
                                    artifact.content.includes(
                                      "consent-modal"
                                    ) && (
                                      <ConsentModal
                                        requestId={
                                          artifact.content.split("request=")[1]
                                        }
                                        requiredScopes={message.tools || []}
                                      />
                                    )}
                                  {artifact.type === "url" &&
                                    !artifact.content.includes(
                                      "consent-modal"
                                    ) && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          globalThis.open(
                                            artifact.content,
                                            "_blank"
                                          )
                                        }
                                        className="p-1 hover:bg-white/10 rounded transition-colors duration-200"
                                        title="Open URL"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                      </button>
                                    )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      copyToClipboard(artifact.content)
                                    }
                                    className="p-1 hover:bg-white/10 rounded transition-colors duration-200"
                                    title="Copy to clipboard"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              {artifact.description && (
                                <p className="text-xs opacity-80 mb-2">
                                  {artifact.description}
                                </p>
                              )}
                              {!artifact.content.includes("consent-modal") && (
                                <div className="bg-black/20 rounded p-2 font-mono text-xs overflow-x-auto">
                                  {artifact.type === "code" ||
                                  artifact.type === "config" ? (
                                    <pre className="whitespace-pre-wrap">
                                      {artifact.content}
                                    </pre>
                                  ) : (
                                    <span>{artifact.content}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-600 p-4">
            <Form method="post" className="flex space-x-3">
              <input type="hidden" name="intent" value="send-message" />
              <input type="hidden" name="sessionId" value={sessionId} />
              <input
                type="text"
                name="message"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Try: 'Create a new configuration file' or 'Export my project data'"
                className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                title="Send message"
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </Form>

            <div className="mt-2 flex flex-wrap gap-2">
              {[
                "Create a new configuration file",
                "Export my project data",
                "Can you list my files with current permissions?",
                "Update my system settings",
                "Show me my current tool access permissions",
                "Generate a backup of my data",
                "Modify the database configuration",
              ].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(suggestion)}
                  className="text-xs bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 px-3 py-2 rounded-lg transition-colors duration-200 max-w-xs text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Consent Modal Component that uses the grants route
function ConsentModal({
  requestId,
  requiredScopes,
}: {
  requestId: string;
  requiredScopes: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGrantId, setSelectedGrantId] = useState<string | null>(null);
  const grantFetcher = useFetcher();
  const consentFetcher = useFetcher();

  // Map scopes to grant IDs (this would be more sophisticated in a real app)
  const getGrantIdForScope = (scope: string): string => {
    const scopeToGrantMap: Record<string, string> = {
      "tools:read": "1",
      "tools:write": "2",
      "data:export": "3",
      "system:analyze": "4",
      "notifications:send": "5",
      "deployment:hotfix": "6",
      "payroll:access": "7",
      "network:access": "8",
      "system:admin": "9",
      "database:write": "10",
    };
    return scopeToGrantMap[scope] || "1";
  };

  const handleGrantConsent = (scope: string) => {
    const grantId = getGrantIdForScope(scope);
    setSelectedGrantId(grantId);
    setIsOpen(true);
  };

  const handleModalClose = () => {
    setIsOpen(false);
    setSelectedGrantId(null);
  };

  const handleApprove = () => {
    const formData = new FormData();
    formData.set("intent", "approve-consent");
    formData.set("requestId", requestId);
    requiredScopes.forEach((scope) => formData.append("scopes", scope));

    consentFetcher.submit(formData, { method: "post" });
    handleModalClose();
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {requiredScopes.map((scope, index) => (
          <Link
            key={index}
            type="button"
            to={`/grants/${getGrantIdForScope(scope)}/grant?redirect_url=${location}`}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
          >
            Grant {scope}
          </Link>
        ))}
      </div>

      {isOpen && selectedGrantId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Shield className="w-6 h-6 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">
                    Grant Permission
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Close modal"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Load the grant form in modal */}
              <GrantModalContent
                grantId={selectedGrantId}
                onApprove={handleApprove}
                onClose={handleModalClose}
                requestId={requestId}
                requiredScopes={requiredScopes}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Component that loads the grant form content
function GrantModalContent({
  grantId,
  onApprove,
  onClose,
  requestId,
  requiredScopes,
}: {
  grantId: string;
  onApprove: () => void;
  onClose: () => void;
  requestId: string;
  requiredScopes: string[];
}) {
  const grantFetcher = useFetcher<{
    grant: any;
    sessionId: string | null;
    success?: boolean;
    consentRequestId?: string;
  }>();
  const consentFetcher = useFetcher();

  // Load the grant data when component mounts
  React.useEffect(() => {
    if (grantFetcher.state === "idle" && !grantFetcher.data) {
      grantFetcher.load(`/grants/${grantId}/grant?modal=true`);
    }
  }, [grantId, grantFetcher]);

  const handleGrantSubmit = (formData: FormData) => {
    // Add the consent request info to the form
    formData.set("consentRequestId", requestId);
    formData.set("requiredScopes", requiredScopes.join(","));

    grantFetcher.submit(formData, {
      method: "post",
      action: `/grants/${grantId}/grant?modal=true`,
    });
  };

  // Handle successful grant submission
  React.useEffect(() => {
    if (
      grantFetcher.data?.success &&
      grantFetcher.data.consentRequestId === requestId
    ) {
      // Grant was successful, now approve the consent request
      const formData = new FormData();
      formData.set("intent", "approve-consent");
      formData.set("requestId", requestId);
      requiredScopes.forEach((scope) => formData.append("scopes", scope));

      consentFetcher.submit(formData, { method: "post" });
      onClose();
    }
  }, [grantFetcher.data, requestId, requiredScopes, consentFetcher, onClose]);

  if (grantFetcher.state === "loading") {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        <span className="ml-3 text-gray-300">Loading grant form...</span>
      </div>
    );
  }

  if (grantFetcher.state === "idle" && grantFetcher.data === undefined) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">Failed to load grant form</p>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  // If we have the grant data, render a simplified grant form
  if (grantFetcher.data?.grant) {
    const grant = grantFetcher.data.grant;

    return (
      <div>
        <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>Consent Request:</strong> {requestId}
          </p>
          <p className="text-sm text-blue-300">
            <strong>Required Scopes:</strong> {requiredScopes.join(", ")}
          </p>
        </div>

        {/* Grant Information */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-white mb-2">
            {grant.scope}
          </h4>
          <p className="text-gray-300 mb-4">{grant.description}</p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-400">Requester</p>
              <p className="text-sm text-white">
                {grant.requesterName || grant.requesterId}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Current Status</p>
              <p
                className={`text-sm ${grant.granted ? "text-green-400" : "text-red-400"}`}
              >
                {grant.granted ? "Granted" : "Not Granted"}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2">Included Tools</p>
            <div className="flex flex-wrap gap-1">
              {grant.toolsIncluded.map((tool: string, idx: number) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Grant Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleGrantSubmit(formData);
          }}
        >
          <input type="hidden" name="modal" value="true" />
          <input type="hidden" name="consentRequestId" value={requestId} />
          <input
            type="hidden"
            name="requiredScopes"
            value={requiredScopes.join(",")}
          />

          <div className="space-y-4">
            <div>
              <label
                htmlFor="duration"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Grant Duration
              </label>
              <select
                id="duration"
                name="duration"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="1h">1 Hour</option>
                <option value="24h">24 Hours</option>
                <option value="7d">7 Days</option>
                <option value="30d">30 Days</option>
                <option value="permanent">Permanent</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Reason for Grant
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Explain why this permission is needed..."
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={grantFetcher.state !== "idle"}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {grantFetcher.state !== "idle"
                ? "Granting..."
                : "Grant Permission"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <p className="text-gray-300">No grant data available</p>
    </div>
  );
}
