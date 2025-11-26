import { AuthorizationDetailMcpTool } from "#cds-models/sap/scai/grants";
import GrantsManagementService, {
  Grant,
  Grants,
} from "#cds-models/sap/scai/grants/GrantsManagementService";
import cds from "@sap/cds";
import { MCPRequest } from "@types";

export default async function (req: cds.Request<MCPRequest>, next: Function) {
  const grant_id =
    req.user?.authInfo?.token?.payload["sid"] ||
    req.user?.authInfo?.token.payload.jti;
  const grantService = await cds.connect.to(GrantsManagementService);
  const host = req.headers["x-forwarded-host"] || req.http?.req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || req.http?.req.protocol;
  const origin = `${protocol}://${host}`;

  const grant = (await grantService.read(Grants, grant_id)) as Grant;
  req.data = {
    ...req.data,
    grant_id,
    grant,
    origin,
    serverId: origin,
    authorizationDetails: mcpDetails(grant, origin),
  };
  return await next();
}

//workaround, should be done in grant server
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
