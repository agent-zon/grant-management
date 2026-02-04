import { Transform, TransformCallback } from 'stream';
import { Request } from 'express';
import { GRANT_TOOLS, GRANT_PROMPTS } from '../constants/grant-definitions.js';
import { getDecodedToken, getGrantIdFromToken } from '../utils/token-utils.js';
import { filterToolsByGrant, extractServerId } from '../utils/filter-tools.js';
import { GrantManagementClient } from '../client/grant-client.js';
import type { SapScaiGrantsAuthorizationServiceGrants } from '../client/types.gen.js';

/**
 * A custom Transform stream to inject grant tools and prompts into MCP responses.
 * 
 * This transformer:
 * - Processes Server-Sent Events (SSE) formatted responses
 * - Injects grant management tools into tools/list responses
 * - Filters tools based on grant authorization details
 * - Injects grant prompts into prompts/list responses
 * - Handles both SSE and plain JSON formats
 */
export class McpResponseTransformer extends Transform {
  private buffer: string = '';
  private req: Request;
  private grantData: SapScaiGrantsAuthorizationServiceGrants | null = null;
  private grantFetched: boolean = false;
  private grantClient: GrantManagementClient;

  constructor(req: Request) {
    super();
    this.req = req;
    this.grantClient = new GrantManagementClient();
  }

  _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback) {
    // Accumulate chunks into buffer
    this.buffer += chunk.toString();

    // Process complete SSE messages (delimited by double newlines)
    const messages = this.buffer.split('\n\n');
    
    // Keep the last incomplete message in the buffer
    this.buffer = messages.pop() || '';

    // Process all messages asynchronously
    const promises = messages.map(async (message) => {
      if (!message.trim()) {
        this.push('\n\n');
        return;
      }

      try {
        const transformedMessage = await this.transformMessage(message);
        this.push(transformedMessage);
      } catch (err) {
        console.error('[MCP Response Transformer] Error transforming message:', err);
        this.push(message + '\n\n');
      }
    });

    // Wait for all async operations to complete before calling callback
    Promise.all(promises).then(() => {
      callback();
    }).catch(err => {
      console.error('[MCP Response Transformer] Error in transform:', err);
      callback(err);
    });
  }

  _flush(callback: TransformCallback) {
    // Process any remaining buffered data
    if (this.buffer.trim()) {
      this.transformMessage(this.buffer).then(transformedMessage => {
        callback(null, transformedMessage);
      }).catch(err => {
        console.error('[MCP Response Transformer] Error flushing buffer:', err);
        callback(null, this.buffer + '\n\n');
      });
    } else {
      callback();
    }
  }

  /**
   * Fetch grant data if not already fetched
   */
  private async fetchGrantData(): Promise<void> {
    if (this.grantFetched) {
      return;
    }

    this.grantFetched = true;

    try {
      const tokenData = getDecodedToken(this.req);
      const grant_id = getGrantIdFromToken(tokenData);

      if (!grant_id) {
        console.log('[MCP Response Transformer] No grant ID found in token', tokenData);
        this.grantData = null;
        return;
      }
      
      const grant = await this.grantClient.getGrant(String(grant_id), tokenData?.jwt as string);

      this.grantData = grant || null;
      console.log('[MCP Response Transformer] Grant data fetched:', {
        grant_id,
        hasGrant: !!grant,
        authDetailsCount: grant?.authorization_details?.length || 0
      });
    } catch (error) {
      console.error('[MCP Response Transformer] Failed to fetch grant data:', error);
      this.grantData = null;
    }
  }

  /**
   * Transform a single message by injecting grant tools and prompts
   */
  private async transformMessage(message: string): Promise<string> {
    try {
      // Try SSE format first: "data: {...}\n"
      const dataMatch = message.match(/^data:\s*(.+)$/m);
      
      if (dataMatch) {
        const jsonData = dataMatch[1];
        const parsed = JSON.parse(jsonData);
        const injected = await this.injectGrantData(parsed);
        return `data: ${JSON.stringify(injected)}\n\n`;
      }
      
      // Try plain JSON format
      const parsed = JSON.parse(message);
      const injected = await this.injectGrantData(parsed);
      return JSON.stringify(injected) + '\n\n';
      
    } catch (e) {
      // If parsing fails, pass through unchanged
      return message + '\n\n';
    }
  }

  /**
   * Inject grant tools and prompts into the parsed response
   */
  private async injectGrantData(parsed: any): Promise<any> { 
     // Inject and filter tools in tools/list responses
    if (parsed.result && Array.isArray(parsed.result.tools)) {
      // Fetch grant data if needed
      await this.fetchGrantData();

      // Combine upstream tools with grant tools first
      const allTools = [...GRANT_TOOLS, ...parsed.result.tools];

      // Extract server ID from request
      const host = this.req.headers['x-forwarded-host'] || this.req.headers.host;
      const protocol = this.req.headers['x-forwarded-proto'] || this.req.protocol;
      const serverId = extractServerId(
        Array.isArray(host) ? host[0] : host,
        Array.isArray(protocol) ? protocol[0] : protocol
      );

      // Apply filtering based on grant
      const { tools: filteredTools } = filterToolsByGrant(
        allTools,
        this.grantData,
        serverId
      );

      parsed.result.tools = filteredTools;
    }
    
    // Inject prompts into prompts/list responses
    if (parsed.result && Array.isArray(parsed.result.prompts)) {
      parsed.result.prompts = [...GRANT_PROMPTS, ...parsed.result.prompts];
    }
    
    return parsed;
  }
}
