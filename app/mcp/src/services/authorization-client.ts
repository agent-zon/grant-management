import fetch from "node-fetch";
import { config } from "../config";
import type { ConsentRequestPayload } from "../types";

/**
 * HTTP client for Authorization API
 * Communicates with the OAuth 2.0 Authorization Server
 */
export class AuthorizationClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || config.authServerUrl;
  }

  /**
   * Create Pushed Authorization Request (PAR)
   */
  async createPAR(
    request: ConsentRequestPayload
  ): Promise<{ request_uri: string; expires_in: number }> {
    console.log("[AuthClient] Creating PAR:", {
      client_id: request.client_id,
      grant_management_action: request.grant_management_action,
      grant_id: request.grant_id,
    });

    const response = await fetch(`${this.baseUrl}/par`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AuthClient] PAR failed:", response.status, errorText);
      throw new Error(`PAR failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("[AuthClient] PAR succeeded:", result);
    return result as { request_uri: string; expires_in: number };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeToken(code: string, redirectUri: string): Promise<any> {
    console.log("[AuthClient] Exchanging authorization code");

    const response = await fetch(`${this.baseUrl}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: config.clientId,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[AuthClient] Token exchange failed:",
        response.status,
        errorText
      );
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const result = (await response.json()) as any;
    console.log(
      "[AuthClient] Token exchange succeeded, grant_id:",
      result.grant_id
    );
    return result;
  }

  /**
   * Get authorization URL for user consent
   */
  getAuthorizationUrl(request_uri: string, sessionId: string): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      request_uri,
      session_id: sessionId,
    });

    return `${this.baseUrl}/authorize?${params.toString()}`;
  }
}

// Export singleton instance
export const authorizationClient = new AuthorizationClient();
