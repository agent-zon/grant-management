import { AuthorizationDetailMcpTool } from "#cds-models/sap/scai/grants";
import GrantsManagementService, {
  Grant,
  Grants,
  AuthorizationDetails,
} from "#cds-models/sap/scai/grants/GrantsManagementService";
import cds from "@sap/cds";
import { MCPRequest } from "@types";

export default async function (req: cds.Request<MCPRequest>, next: Function) {
  const { grant_id, host } = await req.data.meta;

  let grant: Grant | undefined;
  let authorizationDetailsList: Array<{ type?: string; server?: string; tools?: Record<string, unknown> }> = [];
  if (grant_id) {
    try {
      const grantService = await cds.connect.to(GrantsManagementService);
      grant = (await grantService.read(Grants, grant_id)) as Grant;
      // Load authorization_details by grant_id (same as handler.edit: consent_grant_id on projection)
      authorizationDetailsList = (await grantService.run(
        cds.ql.SELECT.from(AuthorizationDetails).where({
          consent_grant_id: grant_id,
        })
      )) as Array<{ type?: string; server?: string; tools?: Record<string, unknown> }>;
    } catch {
      grant = undefined;
    }
  }
  req.data = {
    ...req.data,
    grant,
    authorizationDetails: mcpDetailsFromList(authorizationDetailsList, host),
  };
  return await next();
}

function mcpDetailsFromList(
  list: Array<{ type?: string; server?: string; tools?: Record<string, unknown> }>,
  host?: string
): AuthorizationDetailMcpTool {
  return (list || [])
    .filter((detail) => detail.type === "mcp" && detail.server === host)
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
