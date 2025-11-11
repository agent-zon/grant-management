import cds from "@sap/cds";
import McpProxyService from "./service";
import GrantsManagementService, {
    Grants,
    type Grant, 
    type AuthorizationDetail,
} from "#cds-models/grant_management";
import {env} from "process";
import AuthorizationService from "#cds-models/authorization_service";

export default async function (
    this: McpProxyService,
    req: cds.Request<MCPRequest>,
    next: Function
) {
    const host = req.headers["x-forwarded-host"] || req.http?.req.headers.host;
    const protocol = req.headers["x-forwarded-proto"] || req.http?.req.protocol;
    const origin = `${protocol}://${host}`
    const agent =
        req.headers["x-agent"] || req.headers["user-agent"] || ("agent" as string);
    const grantService = await cds.connect.to(GrantsManagementService);
    const authService = await cds.connect.to(AuthorizationService);

    //using sid for session based grants, jti for token based grants.
    const grant_id = req.user?.authInfo?.token.payload["sid"] || req.user?.authInfo?.token.payload.jti;

    console.log(`MCP Proxy Filter - ${req.data?.method} - Grant Id:`, grant_id);


    if (req.data.method !== "tools/call") {
        return await next(req);
    }
    var grant = await grantService.get(Grants, {
        id: grant_id
    }) as Grant;
    var authorization_details = mcpDetails(grant, origin);

    /* fetch one authorization detail
        const authorization_details = await grantService.get(AuthorizationDetails,{
          consent_grant_id: grant_id,
          type: "mcp",
          server: origin
        }); 
     */

    console.log(
        "MCP Proxy Filter - Authorization Details:",
        authorization_details,
        grant
    );

    const toolName = req.data.params?.name as string;
    if (authorization_details?.tools?.[toolName]) {

        console.log(`MCP Proxy Filter - Tool "${toolName}" authorized`);
        return await next(req);
    }

    console.log(
        `MCP Proxy Filter - Tool "${toolName}" not authorized, initiating authorization flow`
    );

    var response = await authService.par({
        response_type: "code",
        client_id: env.MCP_CLIENT_ID || "mcp-agent-client",
        redirect_uri: `${env.BASE_API_URL|| origin}/mcp/callback`,
        grant_management_action: grant ? "merge" : "create",
        grant_id: grant_id,
        authorization_details: JSON.stringify([
            {
                type: "mcp",
                server: origin,
                transport: "http",
                tools: {
                    [toolName]: {essential: true},
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

    var authUrl = `${origin}/oauth-server/authorize_dialog?request_uri=${encodeURIComponent(response.request_uri!)}`;

    return {
        jsonrpc: "2.0",

        result: {
            isError: true,
            content: [
                {
                    type: "text",
                    text: `Tool "${toolName}" is not authorized. Please authorize the tool by visiting the following URL:`,
                },
                {
                    type: "text",
                    text: authUrl
                },
            ],
        },
        id: req.data.id || null,
    };
}

function mcpDetails(
    grant?: Grant,
    host?: string
): AuthorizationDetail | undefined {
    return grant?.authorization_details?.find(
        (detail) => detail.type === "mcp" && detail.server === host
    ) as unknown as AuthorizationDetail;
}


export type MCPRequest = {
    jsonrpc: String, id: number, method: String, params: Record<string, any>
}