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
import z from "zod";
import { ulid } from "ulid";

export default function registerGrantTools(
  server: McpServer,
  tools: Record<string, RegisteredTool>
) {
 
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
  
      //using sid for session based grants, jti for token based grants.
      const grant_id = 
      cds.context?.user?.authInfo?.token?.payload["sid"] ||
      cds.context?.user?.authInfo?.token?.payload.jti;

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
        requested_actor: cds.context?.http?.req?.headers["user-agent"] || "agent",
        state: ulid(),
        authorization_details: JSON.stringify([
          {
            type: "mcp",
            server: getOrigin(),
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
          authorization_url: `${env.BASE_API_URL || getOrigin()}/oauth-server/authorize_dialog?request_uri=${encodeURIComponent(request_uri!)}`,
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

 function getOrigin() {
  const host = cds.context?.http?.req?.headers["x-forwarded-host"] ||
    cds.context?.http?.req?.headers.host;
  const protocol = cds.context?.http?.req?.headers["x-forwarded-proto"] ||
    cds.context?.http?.req?.protocol;
  const origin = `${protocol}://${host}`;
  return origin;
}
    