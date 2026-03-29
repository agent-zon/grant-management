import { Hono } from "hono";
import { RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { inspect } from "node:util";
import cds from "@sap/cds";
import type { SessionMeta } from "./middleware.meta";
import { Env } from "./type";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

// ---------------------------------------------------------------------------
// Hono sub-app  —  mounted at /:destination/grant by the root app
// ---------------------------------------------------------------------------

const app = new Hono<Env>();

function toolsInputSchema(
  tools: Record<string, Tool>,
  authorizationDetails: Record<string, unknown>,
) {
  const requireGrant = Object.keys(tools).filter(
    (name) => !authorizationDetails[name],
  );
  return {
    schema:
      requireGrant.length > 0
        ? z.array(z.enum(requireGrant as [string, ...string[]]))
        : z.array(z.string()),
    requireGrant,
  };
}

function pushAuthorizationRequestDescription(requireGrant: string[]) {
  return [
    "Some tools are disabled until the user gives permission.",
    "Use this tool to build an authorization request for one or more tools.",
    "It returns an authorization URL for user approval.",
    requireGrant.length
      ? `Tools requiring authorization (${requireGrant.length}): ${requireGrant.join(", ")}`
      : "No tools currently require authorization.",
  ].join(" ");
}

function applyPushParToolFromDetails(
  parTool: RegisteredTool,
  remoteTools: Record<string, Tool>,
  details: Record<string, unknown>,
) {
  const { schema: toolsSchema, requireGrant } = toolsInputSchema(
    remoteTools,
    details,
  );
  parTool.update({
    description: pushAuthorizationRequestDescription(requireGrant),
    paramsSchema: {
      tools: toolsSchema.describe("Tools that need user authorization"),
      redirect_uri: z
        .string()
        .default("urn:scai:grant:callback")
        .describe("Redirect URI for the authorization request"),
    },
    outputSchema: {
      authorization_url: z
        .string()
        .optional()
        .describe("URL for user approval"),
      request_uri: z.string().optional().describe("Internal request URI"),
      expires_in: z.number().optional().describe("Seconds until expiry"),
    },
  });
}

// ---------------------------------------------------------------------------
// Route — expects meta + grant middlewares to have run upstream
// ---------------------------------------------------------------------------

app.all("/", async (c) => {
  const meta = c.get("meta") as SessionMeta;
  const authorizationDetails =
    (c.get("authorization_details") as Record<string, unknown>) || {};

  console.log(
    `[mcp.grant] ${c.req.method}`,
    `\n  destination: ${meta.destination}`,
    `\n  agent: ${meta.agent}`,
    `\n  grant_id: ${meta.grant_id}`,
  );
  const pathname = new URL(c.req.raw.url).pathname;
  const handler = await createMcpHandler(
    async (server) => {
      const start = Date.now();
      const tools: Record<string, RegisteredTool> = {};
      if (!c.get("client")) {
        console.error(`[grant] [${c.req.path}] No client found`);
        return;
      }
      const authService = await cds.connect.to(
        "sap.scai.grants.AuthorizationService",
      );

      const remoteTools = c.get("client")?.tools || {};
      const { schema: toolsSchema, requireGrant } = toolsInputSchema(
        remoteTools,
        c.get("authorization_details") as Record<string, unknown>,
      );

      // ── push-authorization-request tool ───────────────────────────────────
      tools["push-authorization-request"] = server.registerTool(
        "push-authorization-request",
        {
          title: "Tool Authorization Request",
          description: pushAuthorizationRequestDescription(requireGrant),
          inputSchema: {
            tools: toolsSchema.describe("Tools that need user authorization"),
            redirect_uri: z
              .string()
              .default("urn:scai:grant:callback")
              .describe("Redirect URI for the authorization request"),
          },
          outputSchema: {
            authorization_url: z
              .string()
              .optional()
              .describe("URL for user approval"),
            request_uri: z.string().optional().describe("Internal request URI"),
            expires_in: z.number().optional().describe("Seconds until expiry"),
          },
        },
        async ({ tools: requestedTools, redirect_uri }) => {
          const { request_uri, expires_in } = (await (authService as any).par({
            response_type: "code",
            client_id: cds.context?.user?.authInfo?.token?.payload?.azp,
            scope: "openid profile email",
            redirect_uri: redirect_uri || "urn:scai:grant:callback",
            grant_management_action: c.get("meta").grant_id ? "merge" : "create",
            grant_id: c.get("meta").grant_id,
            requested_actor: c.get("meta").agent,
            state: randomUUID(),
            authorization_details: JSON.stringify([
              {
                type: "mcp",
                tools: requestedTools.reduce(
                  (acc: Record<string, null>, name: string) => {
                    acc[name] = null;
                    return acc;
                  },
                  {},
                ),
              },
            ]),
          }))!;

          const baseUrl = process.env.BASE_API_URL || c.get("meta").host;
          const authUrl = `${baseUrl}/oauth-server/authorize_dialog?request_uri=${encodeURIComponent(request_uri!)}`;

          return {
            structuredContent: {
              authorization_url: authUrl,
              request_uri,
              expires_in,
            },
            content: [
              {
                type: "text" as const,
                text: `To approve the requested tools send the authorization URL to the user ${authUrl} .`,
              },
            ],
          };
        },
      );

      const watch = c.get("grant.watch");
      if (watch) {
        watch((details) => {
          applyPushParToolFromDetails(
            tools["push-authorization-request"],
            remoteTools,
            details,
          );
        });
      }

      // ── authorization-url prompt ──────────────────────────────────────────
      server.registerPrompt(
        "authorization-url",
        {
          title: "Authorization URL Prompt",
          description:
            "Show the authorization URL to the user for tool approval.",
          argsSchema: {
            authorization_url: z.url().describe("The authorization URL") as any,
          },
        },
        async ({ authorization_url }) => ({
          definition: "prompt user to authorize tool request",
          messages: [
            {
              role: "assistant" as const,
              content: {
                type: "text" as const,
                text: [
                  "I need you to approve the requested tools.",
                  "Please open the link below to review and approve the access request:",
                  authorization_url,
                  "After you approve, the tool will become available.",
                ].join("\n"),
              },
            },
          ],
        }),
      );

      console.log(
        `[mcp.grant] Ready in ${Date.now() - start}ms — ${Object.keys(tools).length} tools`,
        `\n  tools: ${inspect(Object.keys(tools), { colors: true, compact: true })}`,
        `\n  requireGrant: ${requireGrant.length}`,
      );
     },
    {
      serverInfo: {
        name: `grant:${c.get("destination").name}`,
        version: "1.0.0",
      },
    },
    {
      streamableHttpEndpoint: pathname,
      sseEndpoint: `${pathname}/sse`,
      sseMessageEndpoint: `${pathname}/message`,
      redisUrl: process.env.REDIS_URL,
    },
  );
  return handler(c.req.raw);
});

export { app as grantApp };
export default app;
