/**
 * MCP Grant Tool Definitions
 * 
 * These tools are injected into the MCP protocol to enable
 * authorization and permission management flows.
 */

export const GRANT_TOOLS = [
  {
    name: "grant:query",
    description: "Show all granted permissions and authorization details for the current session",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "grant:request",
    description: "Request authorization for one or more tools. Returns an authorization URL for user approval.",
    inputSchema: {
      type: "object",
      properties: {
        tools: {
          type: "array",
          items: { type: "string" },
          description: "The list of tools that need user authorization",
        },
      },
      required: ["tools"],
    },
  },
] as const;

/**
 * MCP Grant Prompt Definitions
 * 
 * These prompts are injected into the MCP protocol to help format
 * authorization requests for users.
 */
export const GRANT_PROMPTS = [
  {
    name: "grant",
    description: "Format an authorization request prompt for the user",
    arguments: [
      {
        name: "authorization_uri",
        description: "The authorization URL returned from grant:request",
        required: true,
      },
      {
        name: "tool",
        description: "The name of the tool that needs permission",
        required: true,
      },
      {
        name: "format",
        description: "How the prompt should be formatted (html, markdown, plain)",
        required: false,
      },
    ],
  },
] as const;
