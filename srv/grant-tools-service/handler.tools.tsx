import cds from "@sap/cds";
import { MCPRequest } from "@types";
import GrantToolsService from "./grant-tools-service";
import { Tools } from "#cds-models/sap/scai/grants/discovery";

/**
 * Handler to load available tools from database and make them available for grant tool schema
 */
export default async function (
  this: GrantToolsService,
  req: cds.Request<MCPRequest>,
  next: Function
) {
  console.log("[tools handler] 🔍 Request:", req, "\n");
  try {
    // Load available tools from database using discovery.Tools
    const agentId = req.user?.authInfo?.token?.payload["azp"] as string | undefined;

    // Try by agent (FK can be agent_id or agent_ID depending on CDS/SQLite)
    const tools = await this.run(cds.ql.SELECT.from(Tools).where({ agent_id: agentId }));
    console.log("[tools handler] 🔍 Tools result:", tools, "\n");

    // Build tools registry from database
    const toolsRegistry: Record<string, any> = {};
    for (const tool of tools as any[]) {
      try {
        const schema = JSON.parse(tool.schema || "{}");
        toolsRegistry[tool.names] = {
          name: tool.names,
          schema,
          enabled: tool.enabled,
        };
      } catch (error) {
        console.error(`Failed to parse schema for tool ${tool.names}:`, error);
      }
    }

    // Store tools in request data for use by grant tool
    req.data = {
      ...req.data,
      tools: toolsRegistry,
    };
  } catch (error) {
    // If database read fails, continue with empty tools registry
    console.warn("Failed to load available tools from database:", error);
    req.data = {
      ...req.data,
      tools: {},
    };
  }

  return await next();
}
