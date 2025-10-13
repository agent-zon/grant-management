import type {
  AuthorizationDetailRequest,
  AuthorizationRequest,
} from "#cds-models/com/sap/agent/grants";
import { createMachine, assign } from "xstate";

// Types for the state machine context
export interface PermissionsContext {
  grant_id?: string;
  access_token?: string;
  current_permissions: string[];
  risk_level: "low" | "medium" | "high";
  client_id: string;
  subject: string;
  actor?: string;
  step: number;
  error?: string;
  request: Omit<AuthorizationRequest, "authorization_details"> & {
    authorization_details: (Omit<AuthorizationDetailRequest, "type"> & {
      type: string;
    })[];
  };
}

// Events that can trigger state transitions
type PermissionsEvent =
  | {
      type: "GRANT_UPDATED";
      grant_id: string;
      access_token: string;
      scope: string;
      actor?: string;
    }
  | { type: "START_DEMO" }
  | { type: "RETRY" }
  | { type: "RESET" };

// XState machine for permissions elevation demo
export const permissionsElevationMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QAcwCcC2BLWssHsA7WAUQBswA3AQwBcDCA6LCCgYgGUAVAQQCUuAfQAiJALIB5ANoAGALqIU+PPSKKQAD0QBGAEzaA7IwAsugJwA2bQGYzx4wFYZ13QBoQAT0QO7J7dodrJ1MDAA4LXQBfSPdUTBw8IlIKGlUmACNqPABjQVRCCCxCKDYAcT4eADkhAFUABWEeLhJhWQUkEGRlLDT1LQQ9QxNzK1t7Jxd3LwRQ7UYnGRlA830LCwNjaNj0bFwGZKo6BkZMnLywAqKSvhIuPgBNNvUulQY+nWMrRl1Ag3MDWyA6xTRDGAxGSzaYyhXQGGRmUJBbRbTo7BL7ciHNInLJYXL5QrFNg3Di3J4dF49N4dfp6MxmRgGbShHyI-zOAwWEEIBzGayMMz+T6hUJmJlmGQWFFxXaJYiY1LHU54wRQNDUQi0SDEkikrjkpSvNQ0xAWGRGax6XnGbQybRmax-bmfByMKxM8HwwIwszStF7JIKo5EHFnNUarUQNgaWC0OhgRjUABmWrQAApdIsZABKNgy9GBlLBjK43LhzWQA2dbq9E0IM0Wq32W32x1uTyIFxzcJ-cK8gEWRF++IB+VF7HUCDYQjnS5E8pVWoNJotKuU2ugfoNxiWn7Nu0Op0dhC6H7fUU2W18iWSqIxVEjuUHRUhyfT2eE663B5rmvUzeICycw2GsrKWDCALcro9g7usuhWLo1hWBKoQGMOsoYuOxxvkUH5XDqeq-kahDvAMiyhIysyGLYoSLBsDjci4uiMD2iEOHC+gsqE6EFmOWLYVOuHlpGBFkvIzx-saAEnmsjDOHo1gyFxSLGNyIoyG61F2LMiF6Nx975qOz7FomgkzsJ2oxnGWqJim6AZlmuaGU+QYTmZqrqhWEBEVSUmaIg8EWHJu6KcpDhQtyfzGOexiLNYLoWGKyIGf6LlYSGSYAK5kGQeHzhU1SCPUjTNK04kUpJJF1tuu7Wi2h7ttMDjhDuugwlCkoyOYDgODxRmuccWU5XlX53I85WGr5VXSdebqDs4izMoOCLchYPiweKoSOMyhhSilj6YfxGXZblBL4SSYntJNG7+fW5o7k2NoHm2kUOMx-gArF1iIkpzh9WlR1MENuUWVGF36hN1bEaRtpKZRH00XRjirfCG0-Khti6Xt96EPgEBwM8qWHS+01Q1NpEALRcseFOuvS9MMwzBi+vtGGFoDzCsGAEnQ3W-htQK3UihY1ii-BKMMj2LjC447G9azvHGdiyr4hcn48+TfOxZL6x2iMpiio13iiyYVi8iKPV8ua-3EyZKseRGkAazd-TffybWXi4fLNexzr2gKZingi5qIiyf0K-16VMDhM5ncUzv-rdzMMhs9J8oMfyTMe5g6wCsLfYYfY2+zJOme+oMJ35-SmGp8UB4hSw2g6jry9sB0lyZwMjZXpOuyK56e9BQQsgYkVQixcEWI4Yo2i4xd8aXXcVxVvPScnjLGGnu6GIhRs8i1SF-C2g7Mtb0SREAA */
    id: "permissionsElevation",
    initial: "idle",

    context: {
      request: {} as PermissionsContext["request"],
      grant_id: undefined,
      access_token: undefined,
      current_permissions: [],
      risk_level: "low" as const,
      client_id: "demo-client-app",
      subject: "alice",
      actor: undefined,
      step: 0,
      error: undefined,
    } as PermissionsContext,

    states: {
      // Initial state - no grants yet
      idle: {
        meta: {
          next: {
            target: "analysis_granted",
            active: "Want to Analyze",
            permitted: "Can Analyze",
            pending: "Analysis",
          },
        },
        entry: assign({
          actor: "urn:agent:accounting-bot-v1",
          request: ({ context }) => ({
            name: "Analysis Agent",
            scope: "analytics_read",
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
            color: "blue",
            risk: "low",
          }),
        }),
        on: {
          GRANT_UPDATED: {
            target: "analysis_granted",
            actions: assign({
              grant_id: ({ event }) => event.grant_id,
              access_token: ({ event }) => event.access_token,
              current_permissions: ({ event }) => event.scope?.split(" "),
              actor: ({ event }) => event.actor,
              risk_level: "low",
              step: 1,
            }),
          },
          RESET: "idle",
        },
      },

      // Step 1 Complete: Analysis permissions granted
      analysis_granted: {
        meta: {
          next: {
            target: "deployment_granted",
            active: "Want to Deploy",
            permitted: "Can Deploy",
            pending: "Deployment",
          },
        },
        entry: [
          "logStateEntry",
          assign({
            request: ({ context: { grant_id } }) => ({
              name: "Deployment Agent",
              action: "merge",
              grant_id,
              scope: "deployments",
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
              color: "yellow",
              risk: "medium",
            }),
          }),
        ],
        on: {
          GRANT_UPDATED: {
            target: "deployment_granted",
            actions: assign({
              access_token: ({ event }) => event.access_token,
              current_permissions: ({ event }) => event.scope?.split(" "),
              actor: ({ event }) => event.actor,
              risk_level: "medium",
              step: 2,
            }),
          },
          RESET: "idle",
        },
      },

      // Step 2 Complete: Deployment permissions merged
      deployment_granted: {
        meta: {
          next: {
            target: "subscription_granted",
            active: "Want to Manage Subscriptions",
            permitted: "Can Manage Subscriptions",
            pending: "Subscription Management",
          },
        },
        entry: [
          "logStateEntry",
          assign({
            request: ({ context: { grant_id } }) => ({
              name: "Subscription Agent",
              action: "merge",
              grant_id,
              scope: "billing_read",
              actor: "urn:agent:billing-assistant",
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
              color: "red",
              risk: "high",
            }),
          }),
        ],
        on: {
          GRANT_UPDATED: {
            target: "subscription_granted",
            actions: assign({
              access_token: ({ event }) => event.access_token,
              current_permissions: ({ event }) => event.scope.split(" "),
              actor: ({ event }) => event.actor,
              risk_level: "high",
              step: 3,
            }),
          },
          RESET: "idle",
        },
      },

      // Final state: Full subscription management access granted
      subscription_granted: {
        entry: "logStateEntry",
        on: {
          RESET: "idle",
        },
      },
    },
  },
  {
    actions: {
      logStateEntry: ({ context }) => {
        console.log(`🎯 State Machine: Entered state with context:`, {
          step: context.step,
          grant_id: context.grant_id,
          permissions_count: context.current_permissions?.length,
          risk_level: context.risk_level,
          actor: context.actor,
        });
      },
    },
  }
);

export default permissionsElevationMachine;
