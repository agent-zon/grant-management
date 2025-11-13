import cds from "@sap/cds";
import McpProxyService from "./service";
import { env } from "process";
import AuthorizationService from "#cds-models/authorization_service";
// EvaluationService will be available after CDS compilation
// Using string reference for service connection
const EvaluationServiceName = "sap.scai.grants.EvaluationService";

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
  const authService = await cds.connect.to(AuthorizationService);
  const evaluationService = await cds.connect.to(EvaluationServiceName);
  const { params, method, id } = req.data;

  // Get subject from authenticated user
  const subjectId = cds.context?.user?.id || req.user?.id || "unknown";
  const tokenPayload = req.user?.authInfo?.token?.payload as any;
  const clientId =
    tokenPayload?.client_id ||
    tokenPayload?.azp ||
    env.MCP_CLIENT_ID ||
    "mcp-agent-client";
 
    // Call evaluation API to check if tool is authorized
    const evaluationResult = await evaluationService.run(
      cds.ql.SELECT.one
        .from("EvaluationService.evaluation")
        .where({
          subject: { type: "user", id: subjectId },
          action: { name:  method, properties: params },
          resource: { type: "mcp", server: origin },
          context: { client_id: clientId, agent: agent },
        })
    );

    const {decision, grant_id} = evaluationResult;

    if (decision == "deny")  { 
      var response = await authService.par({
        response_type: "code",
        client_id: clientId,
        redirect_uri: `urn:scai:grant:callback`,
        grant_management_action: grant_id ? "merge" : "create",
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
            text: `${cds.requires["authorization_api"].credentials.url}/authorize_dialog?request_uri=${encodeURIComponent(response.request_uri!)}`,
          },
        ],
      },
        id: id,
      };
    }  
  

  return await next(req);
}

export type MCPRequest = {
  jsonrpc: String;
  id: number;
  method: String;
  params: Record<string, any>;
};
