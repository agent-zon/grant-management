import {
  McpServer,
  ToolCallback,
  type RegisteredTool,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import cds from "@sap/cds";
import GrantsManagementService, {
  Grant,
  Grants,
} from "#cds-models/sap/scai/grants/GrantsManagementService";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";
import { env } from "process";
import { AuthorizationDetailMcpTool } from "#cds-models/sap/scai/grants";
import { MCPRequest } from "@types";
import z from "zod";
import { ulid } from "ulid";

export default function registerGrantTools(
  server: McpServer,
  tools: Record<string, RegisteredTool>
) {
  server.registerTool(
    "grant:query",
    {
      title: "What granted to me?",
      description: "Show all registered tools",
      outputSchema: {
        id: z.string(),
        actor: z.string().optional(),
        subject: z.string().optional(),
        iat: z.string().optional(),
        authorization_details: z.array(
          z.object({
            type: z.string(),
            server: z.string(),
            tools: z.record(z.boolean()).optional(),
          })
        ),
      },
    },
    async () => {
      const grantService = await cds.connect.to(GrantsManagementService);
      const grant_id =
        cds.context?.user?.authInfo?.token.payload["sid"] ||
        cds.context?.user?.authInfo?.token.payload.jti;
      const grant = (await grantService.read(Grants, grant_id)) as Grant;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                grant_id,
                authorization_details: grant?.authorization_details,
                actor: grant?.scope,
                subject: grant?.subject,
                iat: grant?.createdAt,
              },
              (key, value) => (value != null ? value : undefined)
            ),
          },
        ],
        structuredContent: {
          id: grant_id,
          authorization_details: grant?.authorization_details?.map(
            (detail) => ({
              type: detail.type,
              server: detail.server,
              tools: detail.tools || {},
            })
          ),
          actor: grant?.scope,
          subject: grant?.subject,
          iat: grant?.createdAt,
        },
      };
    }
  );

  server.registerTool(
    "grant:request",
    {
      title: "Tool Authorization Request",
      description: `Some tools are disabled until the user gives permission.
                    Use this tool to build an authorization request for one or more tools.
                    It returns an authorization URL that you can show to the user for approval.
                    Available tools: ${Object.keys(tools).join(", ")}`,
      inputSchema: {
        tools: z
            .array(z.enum(Object.keys(tools) as [string, ...string[]]))
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
      console.log("[MCP] Grant Request:", { tools });
      const authService = await cds.connect.to(AuthorizationService);
      const host =
        cds.context?.http?.req?.headers["x-forwarded-host"] ||
        cds.context?.http?.req?.headers.host;
      const protocol =
        cds.context?.http?.req?.headers["x-forwarded-proto"] ||
        cds.context?.http?.req?.protocol;
      const origin = `${protocol}://${host}`;
  
      const agent = cds.context?.http?.req?.headers["user-agent"] || "agent";
      const grant_id =
        cds.context?.user?.authInfo?.token.payload["sid"] ||
        cds.context?.user?.authInfo?.token.payload.jti;

      const { request_uri, expires_in, ...response } = (await authService.par({
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
            server: origin,
            tools: tools.reduce((acc, toolName) => {
              acc[toolName] = null;
              return acc;
            }, {}),
          },
        ]),
      })) || {
        request_uri: "not_available",
        expires_in: undefined,
      };

      console.log("[MCP] PAR Response:", request_uri, response);
      const authUrl = `${env.BASE_API_URL || origin}/oauth-server/authorize_dialog?request_uri=${encodeURIComponent(request_uri!)}`;
      return {
        content: [
          { type: "text", text: authUrl },
          {
            type: "text",
            text: "show bellow URL to the user so they can approve the tool request",
          },
        ],
        structuredContent: {
          authorization_url: authUrl,
          request_uri,
          expires_in,
        },
      };
    }
  );
  
  //prompts
  server.registerPrompt("grant", {
    title: "Tool Grant Prompt",
    description: `Some tools stay disabled until the user gives permission.
    To request access, use the grant request tool and prompt the user the authorization URL.`,
    argsSchema: {
      authorization_uri: z.string().url().describe("The authorization URL returned from grant:request"),
      tool: z.string().describe("The name of the tool that needs permission"),
      format: z.enum(["html", "markdown", "plain"])
          .describe("How the prompt should be formatted")
          .optional(),
    },
  }, async ({ authorization_uri, format, tool }) => {

    return {
      definition: "prompt user to authorize tool request",
      messages: [
        {
          role: "assistant",
          content: {
            type: "text",
            text: `The tool "${tool}" needs your permission. 
    Please open the link below to review and approve the access request:
    ${authorization_uri} 
    After you approve, the tool will become available.`,
          },
          _meta: { format: format || "plain"  }
        },
      ],
    };
  });
  
  
  
}
    