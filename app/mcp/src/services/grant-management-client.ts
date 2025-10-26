import fetch from "node-fetch";
import { config } from "../config";

/**
 * HTTP client for Grant Management API
 * Queries grants and authorization details
 */
export class GrantManagementClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || config.grantManagementUrl;
  }

  /**
   * Get grant by ID with authorization details
   */
  async getGrant(grantId: string): Promise<any> {
    console.log(`[GrantMgmtClient] Fetching grant: ${grantId}`);

    const url = `${this.baseUrl}/Grants/${grantId}?$expand=authorization_details`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[GrantMgmtClient] Grant not found: ${grantId}`);
        return null;
      }
      const errorText = await response.text();
      console.error(
        "[GrantMgmtClient] Failed to get grant:",
        response.status,
        errorText
      );
      throw new Error(`Failed to get grant: ${response.statusText}`);
    }

    const grant = (await response.json()) as any;
    console.log(`[GrantMgmtClient] Grant fetched:`, {
      id: grant.id,
      status: grant.status,
      authorization_details_count: grant.authorization_details?.length || 0,
    });

    return grant;
  }

  /**
   * List grants (optional, for future use)
   */
  async listGrants(filters?: Record<string, any>): Promise<any[]> {
    console.log("[GrantMgmtClient] Listing grants");

    const params = new URLSearchParams({
      $expand: "authorization_details",
      ...filters,
    });

    const url = `${this.baseUrl}/Grants?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[GrantMgmtClient] Failed to list grants:",
        response.status,
        errorText
      );
      throw new Error(`Failed to list grants: ${response.statusText}`);
    }

    const result = (await response.json()) as any;
    return result.value || [];
  }
}

// Export singleton instance
export const grantManagementClient = new GrantManagementClient();
