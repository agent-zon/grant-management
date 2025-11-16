import cds from "@sap/cds";
import {MCPRequest} from "@/mcp-service/handler.filter.tsx";
import {McpService} from "@/mcp-service/mcp-service.tsx";

export async function logHandler( this: McpService,
                           req: cds.Request<MCPRequest>,
                           next: Function) {
    const start = Date.now();
    try {
        return await next();
    }
    finally {
        const duration = Date.now() - start;
        console.log(`[MCP Service] ${req.data?.method} handled in ${duration}ms for user: ${req.user?.id} sid: ${req.user?.authInfo?.token.payload["sid"]} jti: ${req.user?.authInfo?.token.payload.jti}`,
            "response", req.http?.res?.statusCode);
    }
}

export async function errorHandler( this: McpService,
                             req: cds.Request<MCPRequest>,
                             next: Function) {
    try {
        return await next();
    }
    catch (error:any) {
        console.error("[MCP Service Error]",
            "\tmethod:", req.data?.method,
            "\tuser:", req.user?.id,
            "\tsid:", req.user?.authInfo?.token.payload["sid"],
            "\tjti:", req.user?.authInfo?.token.payload.jti,
            "\nerror:",
            error.message, error.stack);
        throw error;
    }
}
  
