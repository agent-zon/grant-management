import {
  McpServer,
  RegisteredTool,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import grant from "@/mcp-service/tools.grant";
import cds from "@sap/cds";
import { MCPRequest } from "@types";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";
import { env } from "process";
import { ulid } from "ulid";
import { Tool } from "#cds-models/sap/scai/grants/GrantToolsService";



export default async function (req: cds.Request<MCPRequest>, next: Function) {

  const { host, agent, grant_id } = await req.data.meta;

  const server = (req.data.server = new McpServer({
    name: "grant-tools-service",
    title: "Grant Tools Service",
    description: "Service for managing grant tools with configurable available tools schema",
    version: "1.0.0",
  }));

  server.registerTool(
    "push-authorization-request",
    {
      title: "Tool Authorization Request",
      description: `Some tools are disabled until the user gives permission.
                    Use this tool to build an authorization request for one or more tools.
                    It returns an authorization URL that you can show to the user for approval.
                    Available tools: ${Object.keys(req.data.tools).join(", ")}`,
      inputSchema: {
        tools: z
          .array(z.enum(Object.keys(req.data.tools) as [string, ...string[]]))
          .describe("The list of tools that need user authorization"),
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
    async ({ tools }) => {

      const authService = await cds.connect.to(AuthorizationService);
      const { request_uri, expires_in } = (await authService.par({
        response_type: "code",
        subject: cds.context?.user?.id || "anonymous",
        subject_token: cds.context?.user?.authInfo?.token.jwt,
        client_id: cds.context?.user?.authInfo?.token.payload.azp,
        scope: "openid profile email",
        redirect_uri: "urn:scai:grant:callback",
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
            }, {}),
          },
        ]),
      }))!

      return {
        content: [
          {
            type: "text",
            text: "To approve the requested tools send the authorization URL to the user.",
          },
        ],
        structuredContent: {
          authorization_url: `${host}/oauth-server/authorize_dialog?request_uri=${encodeURIComponent(request_uri!)}`,
          request_uri,
          expires_in,
        },
      };
    })


  //prompts
  server.registerPrompt("authorization-url", {
    title: "Authorization URL Prompt",
    description: `The user needs to approve the requested tools.
        Use this prompt to show the authorization URL to the user.`,
    argsSchema: {
      authorization_url: z.string().url().describe("The authorization URL to show to the user"),
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

  req.data.server = server;

  return await next();
}


