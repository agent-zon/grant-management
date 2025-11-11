import cds from "@sap/cds";
import McpProxyService from "./service";
import GrantsManagementService, {
  Grants,
  type Grant,
  type AuthorizationDetail,
} from "#cds-models/grant_management";
import { env } from "process";
import AuthorizationService, {
  AuthorizationDetails,
} from "#cds-models/authorization_service";

export default async function (
  this: McpProxyService,
  req: cds.Request<MCPRequest>,
  next: Function
) {
  const host = req.headers["x-forwarded-host"] || req.http?.req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || req.http?.req.protocol;
  const origin = `${protocol}://${host}`;
  const agent =
    req.headers["x-agent"] || req.headers["user-agent"] || ("agent" as string);
  const grantService = await cds.connect.to(GrantsManagementService);
  const authService = await cds.connect.to(AuthorizationService);
  const { params, method, id } = req.data;
  //using sid for session based grants, jti for token based grants.
  const grant_id =
    (req.user?.authInfo?.token.payload as { sid?: string }).sid ||
    req.user?.authInfo?.token.payload.jti ||
    "no-grant-id";

  console.log(
    `MCP Proxy Filter - ${req.data?.method} - Grant Id:`,
    grant_id,
    "User:",
    req.user,
    req.user?.authInfo
  );

  // we can get authorization details from grant
  var grant = (await grantService.get(Grants, {
    id: grant_id,
  })) as Grant;
  var authorization_details = mcpDetails(grant, origin);

  /*
  Or, fetch one authorization detail filtered by resource details and grant id
    const authorization_details = (await grantService.get(AuthorizationDetails, {
      consent_grant_id: grant_id,
      type: "mcp",
      server: origin,
    })) as McpAuthorizationDetail;
*/
  console.log(
    "MCP Proxy Filter - Authorization Details:",
    authorization_details,
    grant
  );

  if (
    method === "tools/call" &&
    !authorization_details?.tools?.[params?.name]
  ) {
    console.log(
      `MCP Proxy Filter - Tool "${params?.name}" not authorized, initiating authorization flow`
    );

    const grantOAuthServerUrl =
      cds.requires["authorization_service"].credentials.url;
    var response = await authService.par({
      response_type: "code",
      client_id: env.MCP_CLIENT_ID || "mcp-agent-client",
      redirect_uri: `urn:scai:grant:callback`,
      grant_management_action: grant ? "merge" : "create",
      grant_id: grant_id,
      authorization_details: JSON.stringify([
        {
          type: "mcp",
          server: origin,
          transport: "http",
          tools: {
            [params?.name]: { essential: true },
          },
        },
      ]),
      requested_actor: `urn:mcp:agent:${agent}`,
      subject: cds.context?.user?.id,
      scope: "mcp",
      state: `state_${Date.now()}`,
      subject_token_type: "urn:ietf:params:oauth:token-type:basic",
    });

    if (!response || !response.request_uri) {
      return console.error("Failed to create authorization request", {
        code: 500,
      });
    }

    console.log(
      "env:",
      env["cds_requires_authorization_service_credentials_url"]
    );
    console.log("origin:", origin);
    console.log("cds:", cds.requires["authorization_service"].credentials);

    var authUrl = `${cds.requires["authorization_api"].credentials.url}/authorize_dialog?request_uri=${encodeURIComponent(response.request_uri!)}`;

    return {
      jsonrpc: "2.0",

      result: {
        isError: true,
        content: [
          {
            type: "text",
            text: `Tool "${params?.name}" is not authorized. Please authorize the tool by visiting the following URL:`,
          },
          {
            type: "text",
            text: authUrl,
          },
        ],
      },
      id: id,
    };
  }

  return await next(req);
}

type McpAuthorizationDetail = Pick<
  AuthorizationDetail,
  "type" | "server" | "transport" | "tools"
> & {
  tools: Record<string, boolean | { essential: boolean }>;
};

function mcpDetails(
  grant?: Grant,
  host?: string
): McpAuthorizationDetail | undefined {
  return grant?.authorization_details?.find(
    (detail) => detail.type === "mcp" && detail.server === host
  ) as McpAuthorizationDetail;
}

export type MCPRequest = {
  jsonrpc: String;
  id: number;
  method: String;
  params: Record<string, any>;
};
