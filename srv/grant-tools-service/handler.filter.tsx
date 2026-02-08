import { Consents } from "#cds-models/sap/scai/grants/AuthorizationService";
import GrantsManagementService, {
  Grants,
  Grant,
  AuthorizationDetails,
} from "#cds-models/sap/scai/grants/GrantsManagementService";
import { RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import cds from "@sap/cds";
import { MCPRequest } from "@types";
import { inspect } from "util";


//A proxy tool that forwards each tool in the agent's MCP destination to the remote server, With grant management filtering.
export default async function (req: cds.Request<MCPRequest>, next: Function) {
  const { grant_id, host } = await req.data.meta;

  console.log(`[handler.mcp] Registered runtime proxy tools for agent: ${req.data.agent}
    ${Object.keys(req.data.tools || {}).join(", ")}`);



  console.log(`[handler.grant] grant_id: ${grant_id}, host: ${host}`);
  const grantService = await cds.connect.to(GrantsManagementService);
  const authorizationDetails = mcpDetails(await grantService.run(
    cds.ql.SELECT.from(AuthorizationDetails).where({
      consent_grant_id: grant_id,
    })))


  await registerToGrantChanges({ ...req.data, tools: req.data.tools });
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

  // Listen on the AuthorizationService — that's the service actually creating Consents.
  // DB-level listeners don't fire because CDS deep inserts only emit events at the service layer.
  const authService = await cds.connect.to("sap.scai.grants.AuthorizationService");

  authService.after(
    [`CREATE`, `UPDATE`],
    Consents,
    async (data: any) => {
      const records = Array.isArray(data) ? data : [data];
      for (const record of records) {
        if (record?.grant_id === grant_id) {
          console.log(`[registerToGrantChanges] Consent changed for grant ${grant_id}, re-checking tools`);
          const details = mcpDetails(await grantService.run(
            cds.ql.SELECT.from(AuthorizationDetails).where({
              consent_grant_id: grant_id,
            })
          ));

          if (enableDisabledTools(tools, details)) {
            server.sendToolListChanged();
          }
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

  toolsToEnable.forEach(([_, t]) => t.enable());
  toolsToDisable.forEach(([_, t]) => t.disable());

  console.log(`[Enable/Disable Tools]
    \nauthorizationDetails: ${inspect(authorizationDetails, { colors: true, depth: 2 })}
    \ntoolsToEnable: ${toolsToEnable.length}, 
    \ntoolsToDisable: ${toolsToDisable.length}`);

  return toolsToEnable.length || toolsToDisable.length;
}

function mcpDetails(authorization_details: AuthorizationDetails): Record<string, ToolAuthorization> {
  console.log(`[mcpDetails] authorization_details: ${inspect(authorization_details, { colors: true, depth: 2 })}`);
  return (authorization_details || [])
    .filter((detail) => detail.type === "mcp")
    .reduce(
      (acc, detail) => {
        return {
          ...acc,
          ...detail.tools || {},
        }
      },
      {} as Record<string, unknown>
    )
}

type ToolAuthorization = unknown //false | true | undefined;
