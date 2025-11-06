import fetch from "node-fetch";

/**
 * Get all available tools from downstream MCP server
 */
export async function getAllAvailableTools(
  mcpServerUrl: string
): Promise<any[]> {
  try {
    const toolsListRequest = {
      jsonrpc: "2.0",
      method: "tools/list",
      id: `req_${Date.now()}`,
      params: {},
    };

    const response = await fetch(mcpServerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(toolsListRequest),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch tools: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || "Failed to fetch tools");
    }

    return data.result?.tools || [];
  } catch (error) {
    console.error("[McpProxy] Error fetching available tools:", error);
    return [];
  }
}
