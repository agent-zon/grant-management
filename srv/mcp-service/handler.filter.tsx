import cds from "@sap/cds";
import {GrantHandler} from "../grant-management/grant-management";
import McpProxyService, {type McpHandler} from "./mcp-service";
import GrantsManagementService, {
    AuthorizationDetail,
    Grants,
    type Grant,
} from "#cds-models/sap/scai/grants/GrantsManagementService";
import type {AuthorizationDetailMcpTool, AuthorizationDetailMcpTools} from "#cds-models/sap/scai/grants";
import {env} from "process";
import AuthorizationService from "#cds-models/sap/scai/grants/AuthorizationService";

export async function POST(
    this: McpProxyService,
    ...[req, next]: Parameters<McpHandler>
) {
    const host = req.http?.req.headers.host || env.SERVER_IDENTIFIER || "server";
    const agent = req.headers["x-agent"] || req.headers["user-agent"] || "agent" as string;
    const sessionId = req.headers["mcp-session-id"] as string;
    var grant_id = sessionId;
    const grantService = await cds.connect.to(GrantsManagementService);
    const authService = await cds.connect.to(AuthorizationService);

    console.log("MCP Proxy Filter - Session ID:", sessionId);
    //first intilization with no session yet?
    if (!sessionId) {
        return await next(req);
        //todo: should we wait for session to be created, and intialize the grant?
    }
    console.log(`MCP Proxy Filter ${req.data?.method}- Checking authorization for session: `);


    try {
        const authorization_details = await cds.run(
            cds.ql.SELECT.one.from(AuthorizationDetail).where({consent_grant_id: grant_id, type: "mcp", server: host})
        );

    } catch (error) {
        console.error("MCP Proxy Filter - Error fetching authorization details:", error);
        debugger;
    }

    // const details = mcpDetails(await grantService.read(
    //     Grants,
    //     grant_id
    // ) as Grant, host);
    if (req.data.method !== "tools/call") {
        return await next(req);
    }
    const authorization_details = await cds.run(
        cds.ql.SELECT.one.from(AuthorizationDetail).where({consent_grant_id: grant_id, type: "mcp", server: host})
    );
    console.log("MCP Proxy Filter - Authorization Details:", authorization_details);
    if (req.data.method !== "tools/call" || authorization_details?.tools?.[req.data.params?.name]) {
        return await next(req);
    }
    const toolName = req.data.params?.name;
    if (authorization_details?.tools?.[toolName]) {
        console.log(`MCP Proxy Filter - Tool "${toolName}" authorized`);
        return await next(req);
    }

    console.log(`MCP Proxy Filter - Tool "${toolName}" not authorized, initiating authorization flow`);

    var response = await authService.par({
        response_type: "code",
        client_id: process.env.MCP_CLIENT_ID || "mcp-agent-client",
        redirect_uri: `${req.http?.req.protocol}://${req.http?.req.headers.host}/mcp/callback`,
        grant_management_action: grant_id ? "merge" : "create",
        grant_id: grant_id,
        authorization_details: JSON.stringify([{
            type: "mcp",
            server: host,
            transport: "http",
            tools: {
                [toolName]: {essential: true}
            },
        }]),
        requested_actor: `urn:mcp:agent:${agent}`,
        subject: cds.context?.user?.id,
        scope: "mcp:tools",
        state: `state_${Date.now()}`,
        subject_token_type: "urn:ietf:params:oauth:token-type:basic",
    })
    if (!response || !response.request_uri) {
        return cds.error("Failed to create authorization request", {
            code: 500,
        });
    }

    var authUrl = `${req.http?.req.protocol}://${req.http?.req.headers.host}/oauth-server/authorize?request_uri=${encodeURIComponent(response.request_uri!)}`;

    return {
        jsonrpc: "2.0",

        result: {
            isError: true,
            content: [
                {
                    type: "text",
                    text: `Authorization required for tool "${toolName}". Please authorize by visiting the following URL: 
                    
                    ${authUrl}
                    `,
                }
            ]
        },
        id: req.data.id || null
    };

}


function mcpDetails(grant?: Grant, host?: string): AuthorizationDetailMcpTool | undefined {
    return grant?.authorization_details?.find(
        (detail) => detail.type === "mcp" && detail.server === host
    ) as unknown as AuthorizationDetailMcpTool;
}

async function getAuthDetails(
    sessionId: string,
    server: string
): Promise<AuthorizationDetailMcpTool | undefined> {
    const grantService = await cds.connect.to(GrantsManagementService);

    // Try to find grant by session metadata or user
    const userId = cds.context?.user?.id;
    const grant = (await grantService.read(
        Grants,
        sessionId
    )) as unknown as Grant;
    return grant?.authorization_details?.find(
        (detail) => detail.type === "mcp" && detail.server === server
    ) as unknown as AuthorizationDetailMcpTool;
}
