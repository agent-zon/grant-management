import { AuthorizationDetailMcpTool, AuthorizationDetailMcpTools, MCPToolAuthorizationDetailRequest } from "#cds-models/sap/scai/grants";
import GrantsManagementService, {
  Grants,
  Grant,
  AuthorizationDetails,
} from "#cds-models/sap/scai/grants/GrantsManagementService";
import { RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import cds from "@sap/cds";
import { MCPRequest } from "@types";
import { inspect } from "util";

export default async function (req: cds.Request<MCPRequest>, next: Function) {
  const { grant_id, host } = await req.data.meta;

  console.log(`[handler.grant] grant_id: ${grant_id}, host: ${host}`);
  const grantService = await cds.connect.to(GrantsManagementService);
  const authorizationDetails = mcpDetails(await grantService.run(
    cds.ql.SELECT.from(AuthorizationDetails).where({
      consent_grant_id: grant_id,
    })))


  await registerToGrantChanges(req.data);
  enableDisabledTools(req.data.tools, authorizationDetails);

  return await next();
}

async function registerToGrantChanges({
  meta,
  tools,
  server,
}: MCPRequest) {
  const { grant_id } = meta;
  const grantService = await cds.connect.to(GrantsManagementService);
  grantService.after(
    `UPDATE`,
    AuthorizationDetails,
    async (authorizationDetails) => {
      console.log(`[registerToGrantChanges] AuthorizationDetails updated: ${authorizationDetails?.ID}`);

      if (
        authorizationDetails?.consent_grant_id === grant_id &&
        authorizationDetails?.type === "mcp"
      ) {
        console.log(`[registerToGrantChanges] Updating tools for grant ${grant_id}`);
        const authorizationDetails = mcpDetails(await grantService.run(
          cds.ql.SELECT.from(AuthorizationDetails).where({
            consent_grant_id: grant_id,
          })
        ));

        if (enableDisabledTools(tools, authorizationDetails)) {
          server.sendToolListChanged();
        }
      }
    }
  );
}

function enableDisabledTools(
  tools: Record<string, RegisteredTool>,
  authorizationDetails: Record<string, ToolAuthorization>
) {
  const toolsToEnable = Object.entries(tools)
    .filter(([_, tool]) => !tool.enabled)
    .filter(([name, _]) => authorizationDetails[name]);


  const toolsToDisable = Object.entries(tools)
    .filter(([_, tool]) => tool.enabled)
    .filter(([name, _]) => !authorizationDetails[name]);

  console.log(`[enableDisabledTools]
    \nauthorizationDetails: ${inspect(authorizationDetails, { colors: true, depth: 2 })}
    \ntoolsToEnable: ${toolsToEnable.length}, toolsToDisable: ${toolsToDisable.length}`);
  toolsToEnable.forEach(([_, t]) => t.enable());
  toolsToDisable.forEach(([_, t]) => t.disable());
  return toolsToEnable.length || toolsToDisable.length;
}

function mcpDetails(authorization_details: AuthorizationDetails): Record<string, ToolAuthorization> {
  console.log(`[mcpDetails] authorization_details: ${inspect(authorization_details, { colors: true, depth: 2 })}`);
  return (authorization_details || [])
    .filter((detail) => detail.type === "mcp")
    .reduce(
      (acc, detail) => {
        return {
          ...acc.tools || {},
          ...detail.tools || {},
        }
      },
      {} as Record<string, unknown>
    )
}

type ToolAuthorization = unknown //false | true | undefined;
