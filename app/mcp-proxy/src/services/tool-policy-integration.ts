// Tool Policy Integration - Group related tools for consent requests

import type { ToolPolicyGroup, McpTool } from "../types";

/**
 * Predefined tool policy groups for common tool patterns
 * In the future, this can be replaced with API calls to a policy service
 */
const DEFAULT_TOOL_GROUPS: ToolPolicyGroup[] = [
  {
    name: "file-read",
    tools: [
      "ReadFile",
      "ListFiles",
      "GetFileInfo",
      "SearchFiles",
      "read_file",
      "list_files",
    ],
    description: "Read access to files and directories",
    riskLevel: "low",
  },
  {
    name: "file-write",
    tools: [
      "CreateFile",
      "UpdateFile",
      "WriteFile",
      "write_file",
      "create_file",
      "edit_file",
    ],
    description: "Write access to create and modify files",
    riskLevel: "medium",
  },
  {
    name: "file-delete",
    tools: ["DeleteFile", "RemoveFile", "delete_file", "remove_file"],
    description: "Delete access to remove files",
    riskLevel: "high",
  },
  {
    name: "filesystem-full",
    tools: [
      "ReadFile",
      "WriteFile",
      "CreateFile",
      "DeleteFile",
      "ListFiles",
      "MoveFile",
      "CopyFile",
    ],
    description: "Full filesystem access (read, write, delete)",
    riskLevel: "high",
  },
  {
    name: "database-read",
    tools: [
      "QueryDatabase",
      "ListTables",
      "GetTableInfo",
      "query_db",
      "list_tables",
    ],
    description: "Read access to database resources",
    riskLevel: "medium",
  },
  {
    name: "database-write",
    tools: [
      "InsertRecord",
      "UpdateRecord",
      "ExecuteSQL",
      "insert_record",
      "update_record",
      "execute_sql",
    ],
    description: "Write access to database resources",
    riskLevel: "high",
  },
  {
    name: "api-access",
    tools: [
      "HttpRequest",
      "ApiCall",
      "WebhookTrigger",
      "http_request",
      "api_call",
    ],
    description: "Make HTTP requests to external APIs",
    riskLevel: "medium",
  },
  {
    name: "system-admin",
    tools: [
      "ConfigureSystem",
      "ManageUsers",
      "ModifySettings",
      "configure_system",
      "manage_users",
    ],
    description: "System administration capabilities",
    riskLevel: "high",
  },
  {
    name: "data-export",
    tools: [
      "ExportData",
      "GenerateReport",
      "DownloadFile",
      "export_data",
      "generate_report",
    ],
    description: "Export and download data",
    riskLevel: "medium",
  },
  {
    name: "code-execution",
    tools: [
      "ExecuteCode",
      "RunScript",
      "CompileCode",
      "execute_code",
      "run_script",
      "compile_code",
    ],
    description: "Execute code or scripts",
    riskLevel: "high",
  },
];

/**
 * Tool Policy Manager
 * Handles grouping of related tools for consent requests
 */
export class ToolPolicyManager {
  private toolGroups: Map<string, ToolPolicyGroup>;
  private toolToGroupMap: Map<string, string>;

  constructor(customGroups?: ToolPolicyGroup[]) {
    this.toolGroups = new Map();
    this.toolToGroupMap = new Map();

    // Load default groups
    this.loadGroups(DEFAULT_TOOL_GROUPS);

    // Load custom groups if provided
    if (customGroups) {
      this.loadGroups(customGroups);
    }
  }

  /**
   * Load tool groups into the manager
   */
  private loadGroups(groups: ToolPolicyGroup[]): void {
    for (const group of groups) {
      this.toolGroups.set(group.name, group);

      // Build reverse mapping
      for (const tool of group.tools) {
        this.toolToGroupMap.set(tool, group.name);
      }
    }
  }

  /**
   * Get related tools for a given tool based on policy groups
   * Returns all tools in the same group
   */
  getRelatedTools(toolName: string): string[] {
    const groupName = this.toolToGroupMap.get(toolName);

    if (!groupName) {
      // Tool not in any group, return just itself
      return [toolName];
    }

    const group = this.toolGroups.get(groupName);
    return group ? group.tools : [toolName];
  }

  /**
   * Get the policy group for a tool
   */
  getToolGroup(toolName: string): ToolPolicyGroup | undefined {
    const groupName = this.toolToGroupMap.get(toolName);
    return groupName ? this.toolGroups.get(groupName) : undefined;
  }

  /**
   * Group multiple tools by their policy groups
   * Returns a map of group names to tool lists
   */
  groupTools(toolNames: string[]): Map<string, string[]> {
    const grouped = new Map<string, string[]>();
    const ungrouped: string[] = [];

    for (const tool of toolNames) {
      const groupName = this.toolToGroupMap.get(tool);

      if (groupName) {
        if (!grouped.has(groupName)) {
          grouped.set(groupName, []);
        }
        grouped.get(groupName)!.push(tool);
      } else {
        ungrouped.push(tool);
      }
    }

    // Add ungrouped tools under a special key
    if (ungrouped.length > 0) {
      grouped.set("__ungrouped__", ungrouped);
    }

    return grouped;
  }

  /**
   * Suggest additional tools to request based on the requested tool
   * This provides a better UX by requesting all tools in a group at once
   */
  suggestToolsForConsent(requestedTools: string[]): {
    requested: string[];
    suggested: string[];
    all: string[];
  } {
    const allTools = new Set<string>(requestedTools);
    const suggested = new Set<string>();

    for (const tool of requestedTools) {
      const relatedTools = this.getRelatedTools(tool);

      for (const related of relatedTools) {
        if (!requestedTools.includes(related)) {
          suggested.add(related);
        }
        allTools.add(related);
      }
    }

    return {
      requested: requestedTools,
      suggested: Array.from(suggested),
      all: Array.from(allTools),
    };
  }

  /**
   * Get risk level for a set of tools
   * Returns the highest risk level among the tools
   */
  getRiskLevel(toolNames: string[]): "low" | "medium" | "high" {
    let maxRisk: "low" | "medium" | "high" = "low";
    const riskLevels = { low: 1, medium: 2, high: 3 };

    for (const tool of toolNames) {
      const group = this.getToolGroup(tool);
      if (group?.riskLevel) {
        if (riskLevels[group.riskLevel] > riskLevels[maxRisk]) {
          maxRisk = group.riskLevel;
        }
      }
    }

    return maxRisk;
  }

  /**
   * Filter MCP tools based on authorization details
   * Used to limit the tools exposed to agents based on their grants
   */
  filterToolsByAuthorization(
    availableTools: McpTool[],
    authorizedToolNames: string[]
  ): McpTool[] {
    const authorizedSet = new Set(authorizedToolNames);
    return availableTools.filter((tool) => authorizedSet.has(tool.name));
  }

  /**
   * Create authorization detail object for a set of tools
   */
  createAuthorizationDetail(
    toolNames: string[],
    serverUrl?: string,
    transport: string = "sse"
  ): {
    type: "mcp";
    server?: string;
    transport: string;
    tools: Record<string, { essential: boolean }>;
    riskLevel: "low" | "medium" | "high";
    category: string;
    description: string;
  } {
    const riskLevel = this.getRiskLevel(toolNames);
    const toolsObject: Record<string, { essential: boolean }> = {};

    // Mark all tools as essential for now
    // Could be enhanced to differentiate based on policy
    for (const tool of toolNames) {
      toolsObject[tool] = { essential: true };
    }

    return {
      type: "mcp",
      server: serverUrl,
      transport,
      tools: toolsObject,
      riskLevel,
      category: "mcp-integration",
      description: `Access to ${toolNames.length} MCP tool(s): ${toolNames.slice(0, 3).join(", ")}${toolNames.length > 3 ? "..." : ""}`,
    };
  }

  /**
   * Get all available policy groups
   */
  getAllGroups(): ToolPolicyGroup[] {
    return Array.from(this.toolGroups.values());
  }

  /**
   * Check if a tool is in a specific group
   */
  isToolInGroup(toolName: string, groupName: string): boolean {
    const group = this.toolGroups.get(groupName);
    return group ? group.tools.includes(toolName) : false;
  }
}

// Export singleton instance
export const toolPolicyManager = new ToolPolicyManager();

/**
 * Helper function to group tools by policy for consent requests
 */
export function groupToolsByPolicy(toolName: string): string[] {
  return toolPolicyManager.getRelatedTools(toolName);
}

/**
 * Helper function to get suggested tools for consent
 */
export function suggestToolsForConsent(requestedTools: string[]): string[] {
  const result = toolPolicyManager.suggestToolsForConsent(requestedTools);
  return result.all;
}
