import {
  McpServer,
  RegisteredTool,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import grant from "@/mcp-service/tools.grant";
import todo from "@/mcp-service/tools.todo";
import cds from "@sap/cds";
import { MCPRequest } from "@types";
import {
  AuthorizationDetailMcpTool,
  MCPToolAuthorizationDetailRequest,
} from "#cds-models/sap/scai/grants";
import GrantsManagementService, {
  Grants,
  Grant,
  AuthorizationDetails,
} from "#cds-models/sap/scai/grants/GrantsManagementService";

export default async function (req: cds.Request<MCPRequest>, next: Function) {
  const server = (req.data.server = new McpServer({
    name: "mcp-todo-service",
    title: "MCP To-Do Service",
    description: "A simple To-Do service implemented with MCP",
    version: "1.0.0",
  }));

  todo(server, (req.data.tools = {}));
  grant(server, req.data.tools);

  await registerToGrantChanges(req.data);
  enableDisabledTools(req.data.tools, req.data.authorizationDetails);

  return await next();
}

async function registerToGrantChanges({
  meta,
  tools,
  server,
}: MCPRequest) {
  const { grant_id, host } = meta;
  const grantService = await cds.connect.to(GrantsManagementService);
  grantService.after(
    `UPDATE`,
    AuthorizationDetails,
    async (authorizationDetails) => {
      if (
        authorizationDetails?.consent_grant_id === grant_id &&
        authorizationDetails?.type === "mcp" &&
        authorizationDetails?.server === host
      ) {
        const grant = await grantService.read(Grants, grant_id);

        if (enableDisabledTools(tools, mcpDetails(grant as Grant, host))) {
          server.sendToolListChanged();
        }
      }
    }
  );
}

function enableDisabledTools(
  tools: Record<string, RegisteredTool>,
  authorizationDetails: MCPToolAuthorizationDetailRequest
) {
  const toolsToEnable = Object.entries(tools)
    .filter(([_, tool]) => !tool.enabled)
    .filter(([name, _]) => authorizationDetails.tools?.[name]);

  const toolsToDisable = Object.entries(tools)
    .filter(([name]) => name !== "grant:request") // grant:request always callable so user can request auth
    .filter(([_, tool]) => tool.enabled)
    .filter(([name, _]) => !authorizationDetails.tools?.[name]);

  toolsToEnable.forEach(([_, t]) => t.enable());
  toolsToDisable.forEach(([_, t]) => t.disable());
  return toolsToEnable.length || toolsToDisable.length;
}



function mcpDetails(grant?: Grant, host?: string): AuthorizationDetailMcpTool {
  return (grant?.authorization_details || [])
    ?.filter((detail) => detail.type === "mcp" && detail.server === host)
    .reduce(
      (acc, detail) => {
        acc.tools = {
          ...acc.tools,
          ...detail.tools,
        };
        return acc;
      },
      { type: "mcp", server: host, tools: {} } as AuthorizationDetailMcpTool
    );
}
