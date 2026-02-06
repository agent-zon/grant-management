import { AuthorizationDetailMcpTool, MCPToolAuthorizationDetailRequest } from "#cds-models/sap/scai/grants";
import GrantsManagementService, {
  Grants,
  Grant,
  AuthorizationDetails,
} from "#cds-models/sap/scai/grants/GrantsManagementService";
import { RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import cds from "@sap/cds";
import { MCPRequest } from "@types";

export default async function (req: cds.Request<MCPRequest>, next: Function) {
  const { grant_id, host } = await req.data.meta;


  const grantService = await cds.connect.to(GrantsManagementService);
  const grant = (await grantService.read(Grants, grant_id)) as Grant;


  req.data = {
    ...req.data,
    grant
  };


  await registerToGrantChanges(req.data);
  enableDisabledTools(req.data.tools, grant);

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
        const grant = await grantService.read(Grants, grant_id) as Grant;

        if (enableDisabledTools(tools, grant)) {
          server.sendToolListChanged();
        }
      }
    }
  );
}

function enableDisabledTools(
  tools: Record<string, RegisteredTool>,
  grant: Grant
) {
  const authorizationDetails = mcpDetails(grant);
  const toolsToEnable = Object.entries(tools)
    .filter(([_, tool]) => !tool.enabled)
    .filter(([name, _]) => authorizationDetails.tools?.[name]);

  const toolsToDisable = Object.entries(tools)
    .filter(([_, tool]) => tool.enabled)
    .filter(([name, _]) => !authorizationDetails.tools?.[name]);

  console.log(`[enableDisabledTools] toolsToEnable: ${toolsToEnable.length}, toolsToDisable: ${toolsToDisable.length}`);
  toolsToEnable.forEach(([_, t]) => t.enable());
  toolsToDisable.forEach(([_, t]) => t.disable());
  return toolsToEnable.length || toolsToDisable.length;
}

function mcpDetails(
  grant: Grant,
  host?: string
): AuthorizationDetailMcpTool {
  return (grant.authorization_details || [])

    //&& detail.server === host
    .filter((detail) => detail.type === "mcp")
    .reduce(
      (acc, detail) => {
        acc.tools = {
          ...acc.tools,
          ...(detail.tools || {}),
        };
        return acc;
      },
      { type: "mcp", server: host, tools: {} } as AuthorizationDetailMcpTool
    );
}
