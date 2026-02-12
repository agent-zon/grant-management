import {
  McpServer,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import cds from "@sap/cds";
import { MCPRequest } from "@types";
import AuthorizationService, { Consents } from "#cds-models/sap/scai/grants/AuthorizationService";
import { ulid } from "ulid";
import { inspect } from "node:util";
import { env } from "node:process";
import GrantsManagementService, {
  AuthorizationDetails,
} from "#cds-models/sap/scai/grants/GrantsManagementService";


export default async function (req: cds.Request<MCPRequest>, next: Function) {

  const { host, agent, grant_id } = req.data.meta;

  console.log(`[handler.grant] grant_id: ${grant_id}`);
  const grantService = await cds.connect.to(GrantsManagementService);
  const authorizationDetails = mcpDetails(await grantService.run(
    cds.ql.SELECT.from(AuthorizationDetails).where({
      consent_grant_id: grant_id,
    })))

  const toolNames = Object.keys(req.data.tools || {}).filter((toolName) => !authorizationDetails[toolName]);

  console.log("[handler.tools] Registering tools for server:", ` grant_id: ${grant_id}, host: ${host}\n\ttoolNames: ${inspect(toolNames, { colors: true, depth: 1, compact: true })}`);



  const toolsArraySchema =
    toolNames.length > 0
      ? z.array(z.enum(toolNames as [string, ...string[]]))
      : z.array(z.string());

  const pushAuthorizationRequestTool = req.data.server.registerTool(
    "push-authorization-request",
    {
      title: "Tool Authorization Request",
      description: `Some tools are disabled until the user gives permission. Use this tool to build an authorization request for one or more tools. It returns an authorization URL that you can show to the user for approval. Available tools: ${toolNames.join(", ")}`,
      inputSchema: {
        tools: toolsArraySchema.describe("The list of tools that need user authorization"),
        redirect_uri: z.string().default("urn:scai:grant:callback").describe("The redirect URI to use for the authorization request"),
      },
      outputSchema: {
        authorization_url: z
          .string()
          .optional()
          .describe("The URL that should be shown to the user to approve the requested tools"),
        request_uri: z
          .string()
          .optional()
          .describe("The internal request URI, if provided by the authorization server"),
        expires_in: z
          .number()
          .optional()
          .describe("Time in seconds until the authorization request expires")
      }
    },
    async ({ tools, redirect_uri }) => {
      const authService = await cds.connect.to(AuthorizationService);
      const { request_uri, expires_in } = (await authService.par({
        response_type: "code",
        // subject: cds.context?.user?.id || "anonymous",
        // subject_token: cds.context?.user?.authInfo?.token.jwt,
        client_id: cds.context?.user?.authInfo?.token.payload.azp,
        scope: "openid profile email",
        redirect_uri: redirect_uri || "urn:scai:grant:callback",
        grant_management_action: grant_id ? "merge" : "create",
        grant_id: grant_id,
        requested_actor: agent,
        state: ulid(),
        authorization_details: JSON.stringify([
          {
            type: "mcp",
            tools: tools.reduce((acc, toolName) => {
              acc[toolName] = null;
              return acc;
            }, {} as Record<string, null>),
          },
        ]),
      }))!
      return {
        structuredContent: {
          authorization_url: `${env.BASE_API_URL || host}/oauth-server/authorize_dialog?request_uri=${encodeURIComponent(request_uri!)}`,
          request_uri,
          expires_in,
        },
        content: [
          {
            type: "text",
            text: `To approve the requested tools send the authorization URL to the user ${env.BASE_API_URL || host}/oauth-server/authorize_dialog?request_uri=${encodeURIComponent(request_uri!)} .`,
          },
        ],
      };
    })


  registerGrantElevateTool(req.data.server);

  // Register prompts
  req.data.server.registerPrompt("authorization-url", {
    title: "Authorization URL Prompt",
    description: `The user needs to approve the requested tools.
        Use this prompt to show the authorization URL to the user.`,
    argsSchema: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP SDK expects Zod v3 types; we use Zod v4
      authorization_url: z.url().describe("The authorization URL to show to the user") as any,
    },
  }, async ({ authorization_url }) => ({
    definition: "prompt user to authorize tool request",
    messages: [
      {
        role: "assistant",
        content: {
          type: "text",
          text: `I need you to approve the requested tools. 
          Please open the link below to review and approve the access request:
          ${authorization_url} 
          After you approve, the tool will become available.`,
        },
      },
    ],
  }));

  return await next();

  async function registerGrantElevateTool(server: McpServer) {
    const authService = await cds.connect.to(AuthorizationService);

    authService.after(
      [`CREATE`, `UPDATE`],
      Consents,
      async (data: any) => {
        try {
          const records = Array.isArray(data) ? data : [data];
          for (const record of records) {
            if (record?.grant_id === grant_id) {
              console.log(`[registerToGrantChanges] Consent changed for grant ${grant_id}, re-checking tools`);
              const details = mcpDetails(await grantService.run(
                cds.ql.SELECT.from(AuthorizationDetails).where({
                  consent_grant_id: grant_id,
                })
              ));

              const toolNames = Object.keys(req.data.tools || {}).filter((toolName) => !details[toolName]);

              pushAuthorizationRequestTool.update({
                paramsSchema: {
                  tools: z.array(z.enum(toolNames as [string, ...string[]])),
                  redirect_uri: z.string().default("https://n8n.cfapps.sap.hana.ondemand.com/webhook/grant-updated"),
                }
              });

            }
            server.sendToolListChanged();
          }
        } catch (error) {
          console.error(`[registerGrantElevateTool] Error updating pushAuthorizationRequestTool: ${error}`);
        }
      }
    );
  }
}



function mcpDetails(authorization_details: AuthorizationDetails) {
  return authorization_details.filter((detail) => detail.type === "mcp").reduce((acc, detail) => {
    return {
      ...acc,
      ...detail.tools,
    }
  }, {})

}


