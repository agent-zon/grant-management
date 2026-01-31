import cds from "@sap/cds";
import { MCPRequest } from "@types";
import { GrantToolsService } from "./grant-tools-service";
import { Tools } from "#cds-models/sap/scai/grants/GrantToolsService";

export default async function (this: GrantToolsService, req: cds.Request<MCPRequest>, next: Function) {
  const tools = await cds.run(cds.ql.SELECT
    .from(Tools)
    .where({
      agent_id: req.user?.authInfo?.token?.payload.azp
    }));

  req.data = {
    ...req.data,
    tools: tools,
  };
  return await next();
}
