// Grant Management API Client
import type {
  SapScaiGrantsAuthorizationServiceGrants,
  SapScaiGrantsAuthorizationServiceReturnSapScaiGrantsAuthorizationServicePar
} from './types.gen.js';
import { GRANT_MANAGEMENT_SRV, OAUTH_SERVER_SRV } from '../constants/urls.js';

interface PARParams {
  client_id?: string;
  redirect_uri?: string;
  scope?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  grant_management_action?: string;
  grant_id?: string;
  authorization_details?: string | object;
  requested_actor?: string;
  response_type?: string;
  subject_token_type?: string;
  subject_token?: string;
}

export class GrantManagementClient {
  private baseUrl: string;
  private oauthServerUrl: string;

  constructor() {
    this.baseUrl = GRANT_MANAGEMENT_SRV;
    this.oauthServerUrl = OAUTH_SERVER_SRV;
  }

  /**
   * Get grant by ID with authorization details
   */
  async getGrant(grantId: string, authToken: string): Promise<SapScaiGrantsAuthorizationServiceGrants | null> {
    try {
      const url = `${this.baseUrl}/Grants('${grantId}')?$expand=authorization_details`;
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      console.log('\n=== GET GRANT API CALL ===');
      console.log('[Grant Client] Method: GET');
      console.log('[Grant Client] URL:', url);
      console.log('[Grant Client] Grant ID:', grantId);
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      console.log('[Grant Client] Response status:', response.status, response.statusText);

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[Grant Client] Grant ${grantId} not found - might be first use`);
          return null;
        }
        if (response.status === 401) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & { status?: number; type?: string };
          error.status = 401;
          error.type = 'UNAUTHORIZED';
          throw error;
        }
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }

      const responseText = await response.text();
      
      let data: any;
      try {
        data = JSON.parse(responseText);
        console.log('[Grant Client] Successfully parsed JSON response');
        
        // Log the grant details
        if (data) {
          console.log('[Grant Client] Grant details:');
          console.log('  - Grant ID:', data.id || 'N/A');
          console.log('  - Subject:', data.subject || 'N/A');
          console.log('  - Status:', data.status || 'N/A');
          
          if (data.authorization_details && Array.isArray(data.authorization_details)) {
            console.log(`  - Authorization details count: ${data.authorization_details.length}`);
            
            data.authorization_details.forEach((detail: any, index: number) => {
              console.log(`  - Authorization Detail #${index + 1}:`);
              console.log(`    - Type: ${detail.type || 'N/A'}`);
              console.log(`    - Server: ${detail.server || 'N/A'}`);
              
              if (detail.tools && typeof detail.tools === 'object') {
                const enabledTools = Object.entries(detail.tools)
                  .filter(([, enabled]) => enabled)
                  .map(([tool]) => tool);
                console.log(`    - Enabled Tools: [${enabledTools.join(', ')}]`);
              }
            });
          }
        }
      } catch (parseError) {
        console.log('[Grant Client] Failed to parse as JSON, response appears to be HTML');
        throw new Error(`Expected JSON but got HTML. Response starts with: ${responseText?.substring(0, 100)}`);
      }
      
      return data.d || data;
    } catch (error) {
      const err = error as Error & { status?: number; type?: string };
      console.error(`[Grant Client] Failed to get grant ${grantId}:`, err.message);
      // Re-throw 401 errors so they can be handled upstream
      if (err.status === 401 || err.type === 'UNAUTHORIZED') {
        throw error;
      }
      return null;
    }
  }

  /**
   * Create Pushed Authorization Request (PAR)
   */
  async createAuthorizationRequest(
    params: PARParams,
    authToken: string
  ): Promise<SapScaiGrantsAuthorizationServiceReturnSapScaiGrantsAuthorizationServicePar> {
    try {
      const url = `${this.oauthServerUrl}/oauth-server/par`;
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      const body = JSON.stringify(params);
      
      console.log('\n=== PAR AUTHORIZATION REQUEST API CALL ===');
      console.log('[Grant Client] Method: POST');
      console.log('[Grant Client] URL:', url);
      console.log('[Grant Client] Body:', body);
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body
      });

      console.log('[Grant Client] PAR Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('[Grant Client] PAR Error response body:', errorText?.substring(0, 500));
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('[Grant Client] PAR Response body:', responseText);
      
      let data: any;
      try {
        data = JSON.parse(responseText);
        console.log('[Grant Client] PAR Successfully parsed JSON response');
      } catch (parseError) {
        console.log('[Grant Client] PAR Failed to parse as JSON');
        throw new Error(`Expected JSON but got: ${responseText?.substring(0, 100)}`);
      }
      
      const result = data.d || data;
      console.log('[Grant Client] PAR Final result:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      const err = error as Error;
      console.error('[Grant Client] Failed to create authorization request:', err.message);
      throw error;
    }
  }
}
