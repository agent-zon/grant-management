import cds from "@sap/cds";
import McpService from "./mcp-service";
import GrantsManagementService, {
    AuthorizationDetails,
    Grants,
    type Grant,
} from "#cds-models/sap/scai/grants/GrantsManagementService";
import type {
    AuthorizationDetailMcpTool,
    AuthorizationDetailMcpTools,
} from "#cds-models/sap/scai/grants";
import {env} from "process";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";
 
export default async function(
    this: McpService,
    req: cds.Request<MCPRequest>,
    next: Function
) {
    const host = req.headers["x-forwarded-host"] || req.http?.req.headers.host;
    const protocol = req.headers["x-forwarded-proto"] || req.http?.req.protocol;
    const origin =  `${protocol}://${host}`
    const agent =
        req.headers["x-agent"] || req.headers["user-agent"] || ("agent" as string);
    const grantService = await cds.connect.to(GrantsManagementService);
    const authService = await cds.connect.to(AuthorizationService);

    //using sid for session based grants, jti for token based grants.
    const grant_id = req.user?.authInfo?.token.payload["sid"] || req.user?.authInfo?.token.payload.jti;

    console.log(`[MCP Filter] - ${req.data?.method} - Grant Id:`, grant_id, "user:", req.user?.id, "agent:", agent, "origin:", origin, "authHeader", req.headers.authorization?.slice(0,5)+"...");


    // const details = mcpDetails(await grantService.read(
    //     Grants,
    //     grant_id
    // ) as Grant, origin);
    if (req.data.method !== "tools/call") {
        return await next(req);
    }
    const grant = await grantService.get(Grants, {
        id: grant_id
    }) as Grant;
    const authorization_details = mcpDetails(grant, origin);

    /* fetch one authorization detail
        const authorization_details = await grantService.get(AuthorizationDetails,{
          consent_grant_id: grant_id,
          type: "mcp",
          server: origin
        }); 
     */

    console.log(
        "[MCP Filter] - Authorization Details:",
        authorization_details,
        grant
    );

    const toolName = req.data.params?.name;
    if (authorization_details?.tools?.[toolName] || toolName.startsWith("grant:")) {

        console.log(`[MCP Filter] - Tool "${toolName}" authorized`);
        return await next(req);
    }

    console.log(
        `MCP  Filter - Tool "${toolName}" not authorized, initiating authorization flow`
    );

    const response = await authService.par({
        response_type: "code",
        client_id: process.env.MCP_CLIENT_ID || "mcp-agent-client",
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
        subject_token: req.user?.authInfo?.token.jwt,
        subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
    });
    
    console.log("[MCP Filter] - PAR Response:", response);

    if (!response || !response.request_uri) {
        return cds.error("Failed to create authorization request", {
            code: 500,
        });
    }

    const authUrl = `${env.BASE_API_URL || origin}/oauth-server/authorize_dialog?request_uri=${encodeURIComponent(response.request_uri!)}`;

    return {
        jsonrpc: "2.0", 
        result: {
            isError: true,
            content: [
                {
                    type: "text",
                    text: `Tool "${toolName}" is not authorized. Please ask the user to authorize the tool by visiting the following URL: ${authUrl} then try again after user consent.`,
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

//workaround, should be done in grant server
function mcpDetails(
    grant?: Grant,
    host?: string
): AuthorizationDetailMcpTool | undefined {
    return grant?.authorization_details?.filter(
        (detail) => detail.type === "mcp" && detail.server === host
    ) .reduce((acc, detail) => {
        acc.tools = {
            ...acc.tools,
            ...detail.tools
        };
        return acc;
    }, {type: "mcp", server: host, tools: {} } as AuthorizationDetailMcpTool );
}


export type MCPRequest = {
    jsonrpc: String, id: number, method: String, params: Record<string, any>
}