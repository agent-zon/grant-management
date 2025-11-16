import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from "zod";
import cds from "@sap/cds";
import GrantsManagementService, {Grant, Grants} from "#cds-models/sap/scai/grants/GrantsManagementService";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";
import {env} from "process";
import {AuthorizationDetailMcpTool} from "#cds-models/sap/scai/grants";

export default function registerGrantTools(server: McpServer) {
    server.registerTool(
        'grant:query',
        {
            title: 'What granted to me?',
            description: 'Show all registered tools',
            outputSchema: {
                authorization_details: z.array(z.any())
            }
        },
        async () => {
            const grantService = await cds.connect.to(GrantsManagementService);
            const grant_id = cds.context?.user?.authInfo?.token.payload["sid"] || cds.context?.user?.authInfo?.token.payload.jti;
            const grant = (await grantService.read(Grants, grant_id)) as Grant;
            const authorization_details = mcpDetails(grant as Grant);


            return {
                content: [{
                    type: 'text', text: JSON.stringify({
                        grant_id,
                        authorization_details,
                        actor: grant?.scope,
                        subject: grant?.subject,
                        iat: grant?.createdAt 
                    }, (key,value) =>value != null ? value: undefined)
                }],
                structuredContent: {
                    authorization_details: mcpDetails(grant)
                }
            };
        }
    );

    // Authorize tool request 
    server.registerTool(
        'grant:request',
        {
            title: 'Tool Authorization Request',
            description: 'Build authorization request to send back to user for tool approval',
            inputSchema: {
                type: z.enum(['mcp']),
                server: z.string().optional(),
                tools: z.array(z.string())
            },
            outputSchema: {
                authorization_url: z.string().optional(),
                request_uri: z.string().optional(),
                expires_in: z.number().optional()
            }
        },
        async ({type, tools, server}, extra) => {
            const authService = await cds.connect.to(AuthorizationService);
            const host = cds.context?.http?.req?.host;
            const agent = cds.context?.http?.req?.headers['user-agent'] || 'agent';
            const grant_id = cds.context?.user?.authInfo?.token.payload["sid"] || cds.context?.user?.authInfo?.token.payload.jti;

            const {request_uri, expires_in} = (await authService.par({
                response_type: "code",
                subject: cds.context?.user?.id || "anonymous",
                subject_token: cds.context?.user?.authInfo?.token.jwt,
                client_id: "mcp-todo-service",
                scope: "openid profile email",
                redirect_uri: "urn:scai:grant:callback",
                grant_management_action: grant_id ? "merge" : "create",
                grant_id: grant_id,

                requested_actor: agent,
                state: extra.sessionId,
                authorization_details: JSON.stringify([{
                    type: type,
                    server: server || host,
                    tools: tools.reduce((acc, toolName) => {
                        acc[toolName] = null
                        return acc;
                    }, {})
                }])
            })) || {
                request_uri: "not_available",
                expires_in: undefined
            };


            const authUrl = `${env.BASE_API_URL || origin}/oauth-server/authorize_dialog?request_uri=${encodeURIComponent(request_uri!)}`;
            return {
                content: [{type: 'text', text: authUrl}, {
                    type: 'text', text: "show bellow URL to the user so they can approve the tool request"
                }],
                structuredContent: {
                    authorization_url: authUrl,
                    request_uri,
                    expires_in
                }
            };
        }
    );
}


//workaround, should be done in grant server
function mcpDetails(
    grant?: Grant
): AuthorizationDetailMcpTool[] | undefined {
    const details = grant?.authorization_details?.filter(
        (detail) => detail.type === "mcp"
    ).reduce((acc, detail) => {
        const server = detail.server || "default";
        if (!acc[server]) {
            acc[server] = [];
        }
        acc[server].push(detail);
        return acc;
    }, {} as Record<string, AuthorizationDetailMcpTool[]>);

    return details ? Object.values(details).flat() : undefined;
}