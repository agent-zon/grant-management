import getOctokit from "./git-handler/git-handler";

const GIT = { owner: "AIAM", repo: "policies" };

export type ToolDecision = "allow" | "deny" | "ask";

export type PolicyDecisions = {
  serverDecision?: ToolDecision;
  tools: Record<string, ToolDecision>;
};

async function fetchPoliciesJson(agentId: string, ref = "main"): Promise<string | null> {
  try {
    const octokit = await getOctokit();
    const { data } = await octokit.rest.repos.getContent({
      ...GIT,
      path: `${agentId}/policies.json`,
      ref,
    });
    return Buffer.from((data as any).content, "base64").toString("utf-8");
  } catch {
    return null;
  }
}

/**
 * Resolve ODRL policies for an agent and return tool-level access decisions
 * for a specific MCP server and its tools.
 *
 * The target encoding used by the policy editor is:
 *   MCP server: "mcp|<serverId>|<serverName>"
 *   Tool:       "tool|<serverId>|<toolName>|<toolLabel>"
 *
 * Resolution priority: tool-level rule > server-level rule > default (no decision)
 */
export async function resolveAgentPolicy(
  agentId: string,
  serverId: string,
  toolNames: string[] = [],
  ref = "main"
): Promise<PolicyDecisions> {
  const raw = await fetchPoliciesJson(agentId, ref);
  const rules = odrlToRules(raw);
  return evaluateRules(rules, serverId, toolNames);
}

export function evaluateRules(
  rules: PolicyRule[],
  serverId: string,
  toolNames: string[] = []
): PolicyDecisions {
  const result: PolicyDecisions = { tools: {} };

  // Server-level rules: target contains the serverId and targetType is "mcp"
  const serverRule = rules.find(
    (r) => r.targetType === "mcp" && targetMatchesServer(r.target, serverId)
  );
  if (serverRule) {
    result.serverDecision = serverRule.actionType;
  }

  // Tool-level rules override the server-level decision
  for (const toolName of toolNames) {
    const toolRule = rules.find(
      (r) =>
        r.targetType === "tool" &&
        targetMatchesTool(r.target, serverId, toolName)
    );
    if (toolRule) {
      result.tools[toolName] = toolRule.actionType;
    } else if (result.serverDecision) {
      result.tools[toolName] = result.serverDecision;
    }
  }

  return result;
}

/**
 * Check if an encoded target string matches a server ID.
 * Target format: "mcp|<serverId>|<serverName>"
 */
function targetMatchesServer(target: string, serverId: string): boolean {
  const parts = target.split("|");
  if (parts[0] !== "mcp") return false;
  return parts[1] === serverId;
}

/**
 * Check if an encoded target string matches a specific tool on a server.
 * Target format: "tool|<serverId>|<toolName>|<toolLabel>"
 * The id portion is "<serverId>|<toolName>".
 */
function targetMatchesTool(
  target: string,
  serverId: string,
  toolName: string
): boolean {
  const parts = target.split("|");
  if (parts[0] !== "tool") return false;
  return parts[1] === serverId && parts[2] === toolName;
}
