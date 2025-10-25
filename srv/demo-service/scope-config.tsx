// Scope configuration for demo service
// Each scope represents a permission level that can be requested independently

export interface ScopeConfig {
  name: string; // Internal name (e.g., "analysis")
  displayName: string; // Display name in UI
  icon: string; // Emoji icon
  scope: string; // OAuth scope
  color: "blue" | "yellow" | "red"; // UI color theme
  risk: "low" | "medium" | "high"; // Risk level
  endpoint: string; // Request endpoint
  authorization_details: any[]; // RAR authorization details
}

export const SCOPE_CONFIGS: Record<string, ScopeConfig> = {
  analysis: {
    name: "analysis",
    displayName: "Analysis",
    icon: "📊",
    scope: "analytics_read",
    color: "blue",
    risk: "low",
    endpoint: "/demo/analysis_request",
    authorization_details: [
      {
        type: "mcp",
        server: "devops-mcp-server",
        transport: "sse",
        tools: {
          "metrics.read": { essential: true },
          "logs.query": { essential: true },
          "dashboard.view": { essential: true },
        },
        actions: ["read", "query"],
        locations: ["analytics"],
      },
      {
        type: "fs",
        roots: ["/workspace/configs", "/home/agent/analytics"],
        permissions: {
          read: { essential: true },
          write: null,
          create: null,
          list: null,
        },
      },
    ],
  },
  
  deployment: {
    name: "deployment",
    displayName: "Deployment",
    icon: "🚀",
    scope: "deployments",
    color: "yellow",
    risk: "medium",
    endpoint: "/demo/deployment_request",
    authorization_details: [
      {
        type: "mcp",
        server: "devops-mcp-server",
        transport: "sse",
        tools: {
          "deploy.create": null,
          "deploy.read": { essential: true },
          "infrastructure.provision": null,
          "config.update": null,
        },
        locations: ["staging", "production"],
      },
      {
        type: "api",
        urls: [
          "https://api.deployment.internal/v1/deploy",
          "https://api.infrastructure.internal/v1/provision",
        ],
        protocols: ["HTTPS"],
      },
    ],
  },
  
  entitlements: {
    name: "entitlements",
    displayName: "Subscription Management",
    icon: "💳",
    scope: "billing_read",
    color: "red",
    risk: "high",
    endpoint: "/demo/subscription_request",
    authorization_details: [
      {
        type: "mcp",
        server: "billing-mcp-server",
        transport: "http",
        tools: {
          "subscription.create": null,
          "subscription.modify": null,
          "subscription.view": { essential: true },
          "user.provision": null,
        },
        locations: ["subscriptions", "users"],
      },
      {
        type: "fs",
        roots: ["/home/agent/subscriptions"],
        permissions: {
          read: { essential: true },
          write: null,
          create: null,
          list: null,
        },
      },
    ],
  },
};

// Ordered list of scopes for display (can be reordered)
export const SCOPE_ORDER = ["analysis", "deployment", "entitlements"];

// Helper to get granted scopes from token response
export function parseGrantedScopes(scopeString?: string): Set<string> {
  if (!scopeString) return new Set();
  
  const scopes = scopeString.split(" ");
  const grantedScopes = new Set<string>();
  
  // Map OAuth scopes to our internal scope names
  for (const scope of scopes) {
    for (const [name, config] of Object.entries(SCOPE_CONFIGS)) {
      if (config.scope === scope) {
        grantedScopes.add(name);
      }
    }
  }
  
  return grantedScopes;
}

// Helper to get next ungranted scope
export function getNextUngrantedScope(grantedScopes: Set<string>): string | null {
  for (const scopeName of SCOPE_ORDER) {
    if (!grantedScopes.has(scopeName)) {
      return scopeName;
    }
  }
  return null;
}

// Helper to get scope status
export type ScopeStatus = "granted" | "pending" | "requesting";

export function getScopeStatus(
  scopeName: string,
  grantedScopes: Set<string>,
  requestingScope?: string
): ScopeStatus {
  if (grantedScopes.has(scopeName)) return "granted";
  if (requestingScope === scopeName) return "requesting";
  return "pending";
}
