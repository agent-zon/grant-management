import cds from "@sap/cds";
import McpService from "./service";
import GrantsManagementService, {
    AuthorizationDetail,
    Grants,
    type Grant,
} from "#cds-models/grant_management";
import AuthorizationService from "#cds-models/authorization_service";


export default async function (
    this: McpService,
    req: cds.Request<MCPRequest>,
    next: Function
) {
    const host = req.headers["x-forwarded-host"] || req.http?.req.headers.host;
    const protocol = req.headers["x-forwarded-proto"] || req.http?.req.protocol;
    const origin = `${protocol}://${host}`
    const agent =  req.headers["x-agent"] || req.headers["user-agent"] || ("agent" as string);
    const grantService = await cds.connect.to(GrantsManagementService);
    const authService = await cds.connect.to(AuthorizationService);

    //@ts-ignore
    //using sid for session based grants, jti for token based grants.
    const grant_id = req.user?.authInfo?.token?.payload["sid"] || req.user?.authInfo?.token.payload.jti;
    const sessionId = req.headers["mcp-session-id"] ;
    console.log(`[MCP Filter] - ${req.data?.method} - Grant Id:`, grant_id, "user:", req.user?.id, "agent:", agent, "origin:", origin, "authHeader", req.headers.authorization?.slice(0, 5) + "...");
  
    const grant = await grantService.get(Grants, {
        id: grant_id
    }) as Grant;
    const authorization_details = mcpDetails(grant, origin);

    if (req.data.method === "tools/call" && !(authorization_details?.tools?.[req.data.params?.name] || req.data.params?.name?.startsWith("grant:"))) {

        console.log(
            "[MCP Filter] - Request Tool Authorization:",
            req.data.params?.name,
            grant.id
        );

        const {request_uri, ...response} = (await authService.par({
            response_type: "code",
            client_id: process.env.MCP_CLIENT_ID || "mcp-agent-client",
            redirect_uri: `urn:scai:grant:callback`,
            grant_management_action: grant ? "merge" : "create",
            grant_id: grant_id,
            authorization_details: JSON.stringify([
                {
                    type: "mcp",
                    server: origin,
                    transport: "http",
                    tools: {
                        [req.data.params?.name]: {essential: true},
                    },
                },
            ]),
            requested_actor: `urn:mcp:agent:${agent}`,
            subject: cds.context?.user?.id,
            subject_token: req.user?.authInfo?.token.jwt,
            subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
            scope: "mcp",
            state: `${sessionId}:${Date.now()}`,
        })) || {};

        console.log("[MCP Filter] - PAR Response:", response, "request_uri", request_uri);

        if (!request_uri) {
            console.error("Failed to create authorization request", {
                response,
                code: 500,
            });
            return {
                jsonrpc: "2.0",
                error: {
                    code: 32603,
                    message: "Failed to create authorization request",
                    data: response,
                },
                id: req.data.id || null,
            };
        }

        const authUrl = `${cds.requires["authorization_api"].credentials.url}?request_uri=${encodeURIComponent(request_uri!)}`;

        return {
            jsonrpc: "2.0",
            id: req.data.id || null, 
            result: {
                // isError: true,
                content: [
                    {
                        type: "text",
                        text: `Tool "${req.data.params?.name}" is not authorized. Please ask the user to authorize the tool by visiting the following URL: ${authUrl} then try again after user consent.`,
                    },
                    {
                        type: "text",
                        text: authUrl
                    },
                ]
            },

        };
    }
    return await next();
}

//workaround, should be done in grant server
function mcpDetails(
    grant?: Grant,
    host?: string
): AuthorizationDetailMcpTool | undefined {
    return grant?.authorization_details?.filter(
        isMcp
    ).reduce((acc, detail) => {
        acc.tools = {
            ...acc.tools,
            ...detail.tools
        };
        return acc;
    }, {type: "mcp", server: host, tools: {}});

    function isMcp(detail: AuthorizationDetail): detail is AuthorizationDetailMcpTool {
        return detail.type === "mcp" && detail.server === host;
    }
}


export type AuthorizationDetailMcpTool = Omit<AuthorizationDetail, "tools" | "type"> & {
    type: "mcp";
    server?: string;
    tools: Record<string, null>;
};

export type MCPRequest = {
    jsonrpc: String, id: number, method: String, params: Record<string, any>
}