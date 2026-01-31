import cds from "@sap/cds";
import { MCPRequest } from "@types";
import { GrantToolsService } from "./grant-tools-service";
import { Tools } from "#cds-models/sap/scai/grants/GrantToolsService";
import { RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";

export default async function (this: GrantToolsService, req: cds.Request<MCPRequest>, next: Function) {
  const { agent } = await req.data.meta;
  const tools = await cds.run(cds.ql.SELECT
    .from(Tools)
    .where({
      agent_id: agent
    }));

  req.data = {
    ...req.data,
    tools: tools.reduce((acc, tool) => {
      acc[tool.name] = tool;
      return acc;
    }, {} as Record<string, RegisteredTool>),
  };
  return await next();
}
