// API client for AMS policy service
import type { AgentPolicies } from "~/types/policies";

const BASE_URL = process.env.POLICIES_API_URL || "http://localhost:4004";

export class PoliciesApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = "PoliciesApiError";
  }
}

/**
 * Get all agent policies from the CAP service
 */
export async function getAllAgents(): Promise<AgentPolicies[]> {
  try {
    const response = await fetch(`${BASE_URL}/admin/agents`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new PoliciesApiError(
        `Failed to fetch agents: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    if (error instanceof PoliciesApiError) {
      throw error;
    }
    throw new PoliciesApiError(
      `Network error while fetching agents: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get a specific agent's policies
 */
export async function getAgentPolicies(agentId: string): Promise<AgentPolicies> {
  try {
    const response = await fetch(`${BASE_URL}/admin/agents/${agentId}/main/policy`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new PoliciesApiError(
          `Agent '${agentId}' not found`,
          404
        );
      }
      throw new PoliciesApiError(
        `Failed to fetch agent policies: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof PoliciesApiError) {
      throw error;
    }
    throw new PoliciesApiError(
      `Network error while fetching agent policies: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get agent manifest YAML from Git repository
 */
export async function getAgentManifest(agentId: string): Promise<string> {
  try {
    const response = await fetch(`${BASE_URL}/getAgentManifest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agentId }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new PoliciesApiError(
          `Agent manifest for '${agentId}' not found`,
          404
        );
      }
      throw new PoliciesApiError(
        `Failed to fetch agent manifest: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    return data.value || "";
  } catch (error) {
    if (error instanceof PoliciesApiError) {
      throw error;
    }
    throw new PoliciesApiError(
      `Network error while fetching agent manifest: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Update agent policies
 */
export async function updateAgentPolicies(
  agentId: string,
  policies: string
): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/AgentPolicies`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agentId,
        policies,
      }),
    });

    if (!response.ok) {
      throw new PoliciesApiError(
        `Failed to update agent policies: ${response.statusText}`,
        response.status
      );
    }
  } catch (error) {
    if (error instanceof PoliciesApiError) {
      throw error;
    }
    throw new PoliciesApiError(
      `Network error while updating agent policies: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
