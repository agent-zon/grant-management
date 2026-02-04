import { Request } from 'express';
import { ulid } from 'ulid';
import type { SapScaiGrantsAuthorizationServiceGrants } from '../client/types.gen.js';
import { getDecodedToken, getGrantIdFromToken } from '../utils/token-utils.js';
import { GrantManagementClient } from '../client/grant-client.js';
import { APP_ROUTER_BASE } from '../constants/urls.js';

// Initialize the grant management client
const grantClient = new GrantManagementClient();

/**
 * Handle grant-related tool calls locally without proxying to upstream server
 */
export async function handleGrantCall(method: string, params: any, req: Request): Promise<any> {
  if (method === 'tools/call' && params.name === 'grant:query') {
    return handleGrantQuery(req);
  }

  if (method === 'tools/call' && params.name === 'grant:request') {
    return handleGrantRequest(params, req);
  }

  if (method === 'prompts/get' && params.name === 'grant') {
    return handleGrantPrompt(params);
  }

  return null;
}

/**
 * Query current grant permissions and authorization details
 */
async function handleGrantQuery(req: Request): Promise<any> {
  const tokenData = getDecodedToken(req);
  const grant_id = getGrantIdFromToken(tokenData);
    
  try {
    const grant = await grantClient.getGrant(String(grant_id), tokenData?.jwt || '');
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              grant_id,
              authorization_details: grant?.authorization_details,
              actor: grant?.scope,
              subject: grant?.subject,
              iat: grant?.createdAt,
            },
            (key, value) => (value != null ? value : undefined)
          ),
        },
      ],
    };
  } catch (error: any) {
    console.error('[Grant Handler] Failed to fetch grant:', {
      grant_id,
      error: error.message,
    });
    throw new Error(`Failed to fetch grant ${grant_id}: ${error.message}`);
  }
}

/**
 * Request authorization for specific tools
 */
async function handleGrantRequest(params: any, req: Request): Promise<any> {
  const { tools } = params || {};
  
  if (!tools) {
    throw new Error('tools parameter is required for grant:request');
  }
  
  // Determine origin from request headers
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const origin = `${protocol}://${host}`;
  
  // Extract user information
  const agent = req.headers['user-agent'] || 'agent';
  const tokenData = getDecodedToken(req);
  const grant_id = getGrantIdFromToken(tokenData);

  // Convert tools object to the expected format
  const toolsObject = typeof tools === 'object' && !Array.isArray(tools)
    ? tools
    : Array.isArray(tools)
    ? tools.reduce((acc: any, toolName: string) => {
        acc[toolName] = null;
        return acc;
      }, {})
    : {};

  // Create pushed authorization request (PAR)
  let parResult;
  try {
    parResult = await grantClient.createAuthorizationRequest(
      {
        response_type: 'code',
        subject_token: tokenData?.jwt,
        client_id: tokenData?.payload?.azp || tokenData?.payload?.client_id,
        scope: 'openid profile email',
        redirect_uri: 'urn:scai:grant:callback',
        grant_management_action: grant_id ? 'merge' : 'create',
        grant_id: grant_id || undefined,
        requested_actor: agent,
        state: ulid(),
        authorization_details: JSON.stringify([
          {
            type: 'mcp',
            server: origin,
            tools: toolsObject,
          },
        ]),
      },
      tokenData?.jwt || ''
    );
  } catch (error: any) {
    console.error('[Grant Handler] PAR request failed:', {
      error: error.message,
    });
    throw new Error(`Failed to create authorization request: ${error.message}`);
  }
  
  if (!parResult || !parResult.request_uri) {
    console.error('[Grant Handler] PAR response missing request_uri:', { parResult });
    throw new Error('Authorization server did not return a request URI');
  }
  
  const { request_uri, expires_in } = parResult;

  const authUrl = `${APP_ROUTER_BASE}/oauth-server/authorize_dialog?request_uri=${encodeURIComponent(request_uri!)}`;
  
  return {
    content: [
      { type: 'text', text: authUrl },
      {
        type: 'text',
        text: 'Show the URL above to the user so they can approve the tool request',
      },
    ],
  };
}

/**
 * Format authorization prompt for the user
 */
async function handleGrantPrompt(params: any): Promise<any> {
  const { authorization_uri, tool, format = 'plain' } = params || {};
  
  return {
    description: 'prompt user to authorize tool request',
    messages: [
      {
        role: 'assistant',
        content: {
          type: 'text',
          text: `The tool "${tool}" needs your permission. 
Please open the link below to review and approve the access request:
${authorization_uri} 
After you approve, the tool will become available.`,
        },
      },
    ],
  };
}

/**
 * Check if a method call is a grant-related operation
 */
export function isGrantCall(method: string, params: any): boolean {
  return (
    (method === 'tools/call' && (params?.name === 'grant:query' || params?.name === 'grant:request')) ||
    (method === 'prompts/get' && params?.name === 'grant')
  );
}
