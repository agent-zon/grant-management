/**
 * Destination-backed MCP transport helper for GrantToolsService.
 * 
 * This module provides helpers to:
 * - Resolve SAP destinations with proper selection strategy
 * - Create StreamableHTTPClientTransport for remote MCP servers
 * - Build merged headers (forward + destination + auth tokens)
 * 
 * Reference: handler.proxy.tsx
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  useOrFetchDestination,
  alwaysProvider,
  alwaysSubscriber,
  subscriberFirst,
  type DestinationSelectionStrategy,
  Destination,
  HttpDestination,
} from "@sap-cloud-sdk/connectivity";
import { IncomingMessage } from "node:http";

/**
 * MCP configuration for an agent (from CDS model).
 */
export interface McpConfig {
  kind: string;
  name: string;
  strategy: "alwaysProvider" | "alwaysSubscriber" | "subscriberFirst";
}



/**
 * Build merged headers for destination transport.
 * Order (destination wins):
 * 1. Forward inbound headers (exclude content-length)
 * 2. Destination headers
 * 3. Destination authTokens http_header
 */
export function buildMergedHeaders(
  inboundHeaders: Record<string, string | string[] | undefined>,
  destination: HttpDestination
): Record<string, string> {
  // Forward inbound headers (exclude content-length)
  const forwardedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(inboundHeaders)) {
    if (!key) continue;
    if (key.toLowerCase() === "content-length") continue;
    if (typeof value === "undefined") continue;
    forwardedHeaders[key] = Array.isArray(value) ? value.join(", ") : String(value);
  }

  // Destination headers
  const destinationHeaders: Record<string, string> = destination.headers
    ? Object.fromEntries(
      Object.entries(destination.headers).map(([k, v]) => [k, String(v)])
    )
    : {};

  // Auth tokens http_header
  const authFromTokens: Record<string, string> =
    destination.authTokens
      ?.filter((t) => t.http_header)
      .reduce((headers, token) => {
        if (token.http_header) {
          headers[token.http_header.key] = token.http_header.value;
        }
        return headers;
      }, {} as Record<string, string>) || {};

  // Merge: destination wins
  return {
    ...forwardedHeaders,
    ...destinationHeaders,
    ...authFromTokens,
  };
}

/**
 * Create a StreamableHTTPClientTransport for a destination-backed MCP server.
 */
export async function createDestinationTransport(destination: Destination,): Promise<Transport> {
  const {
    destinationName,
    strategy,
    jwt,
    inboundHeaders = {},
    sessionId,
    lastEventId,
  } = options;

  // Resolve destination


  console.log("🚀 Destination:", destination);
  if (!destination?.url) {
    throw new Error(`Destination "${destinationName}" has no url`);
  }

  // Build merged headers
  const headers = buildMergedHeaders(inboundHeaders, {
    headers: destination.headers,
    authTokens: destination.authTokens as Array<{
      http_header?: { key: string; value: string };
      [key: string]: unknown;
    }> | undefined,
  });

  // Add session headers if present
  if (lastEventId) {
    headers["last-event-id"] = lastEventId;
  }

  // Create transport
  const mcpUrl = new URL(destination.url);
  console.log("🚀 MCP URL:", mcpUrl);
  console.log("🚀 Headers:", headers);
  return new StreamableHTTPClientTransport(mcpUrl, {
    sessionId,
    requestInit: { headers },
  });
}


/**
 * Create an MCP Client connected to a destination-backed MCP server.
 */
export async function createDestinationClient(options: {
  destinationName: string;
  strategy: string;
  jwt?: string;
  inboundHeaders?: Record<string, string | string[] | undefined>;
  sessionId?: string;
}): Promise<Client> {
  const transport = await createDestinationTransport(options);

  const client = new Client({
    name: "grant-tools-destination-client",
    version: "1.0.0",
  });

  await client.connect(transport);
  return client;
}
