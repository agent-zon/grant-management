import cds from "@sap/cds";
import { IncomingMessage } from "node:http";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isJSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";
import { tapTransport } from "mcp-proxy";
import { alwaysProvider, useOrFetchDestination } from "@sap-cloud-sdk/connectivity";
import { Destination } from "#cds-models/sap/scai/debug";

/**
 * MCP transport proxy (server transport <-> destination-backed client transport).
 *
 * This follows the same destination header/url approach as:
 * examples/mcp-server/app/client/index.ts (create transport with destination.url + auth headers)
 */
export default async function proxy(req: cds.Request<Destination>, next: Function) {

  
  req.data.server = await createProxyServer(req);
  return next();
}

async function createProxyServer(request: cds.Request<Destination>) {
  // Minimal tap callback (no OTLP/logger requested).
  const tap = (_event: unknown) => { };

  const transportToServer = tapTransport(
    await createTransportFromDestination(request),
    tap
  );



  return {
    connect: async (transport: StreamableHTTPServerTransport) => {
      const transportToClient = tapTransport(transport as unknown as Transport, tap);

      bindTransport({
        transportToClient,
        transportToServer,
      });

      await transportToServer.start();
    },
    close: async () => {
      await transportToServer.close();
    },
  };
}

async function createTransportFromDestination(
  request: cds.Request<Destination> 
): Promise<Transport> {
  
  const destination = await useOrFetchDestination({
    destinationName: request.data.name!,
    jwt: request.user?.authInfo?.token?.jwt || undefined,
    selectionStrategy: alwaysProvider,
  });

  if (!destination?.url) {
    throw new Error(`Destination "${request.data.name}" has no url`);
  }

  const authFromTokens =
    destination.authTokens
      ?.filter((t) => (t as any).http_header)
      .reduce((headers, token: any) => {
        headers[token.http_header.key] = token.http_header.value;
        return headers;
      }, {} as Record<string, string>) || {};

  const destinationHeaders =
    destination.headers
      ? Object.fromEntries(
        Object.entries(destination.headers).map(([k, v]) => [k, String(v)])
      )
      : {};

  // Forward all inbound headers except content-length, then add destination headers.
  // Destination-derived auth headers should win over inbound ones.
  const forwardedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(request.headers)) {
    if (!key) continue;
    if (key.toLowerCase() === "content-length") continue;
    if (typeof value === "undefined") continue;
    forwardedHeaders[key] = Array.isArray(value) ? value.join(", ") : String(value);
  }

  const headers: Record<string, string> = {
    ...forwardedHeaders,
    ...destinationHeaders,
    ...authFromTokens,
  };

  const sessionId = request.headers["mcp-session-id"]
    ? String(request.headers["mcp-session-id"])
    : undefined;
  const lastEventId = request.headers["last-event-id"]
    ? String(request.headers["last-event-id"])
    : undefined;
  if (lastEventId) headers["last-event-id"] = lastEventId;

  return new StreamableHTTPClientTransport(
    new URL(`${destination.url.replace(/\/$/, "")}/mcp/streaming`),
    {
      sessionId,
      requestInit: { headers },
    }
  );
}

function bindTransport({
  transportToClient,
  transportToServer,
}: {
  transportToClient: Transport;
  transportToServer: Transport;
}) {
  let transportToClientClosed = false;
  let transportToServerClosed = false;

  transportToClient.onmessage = async (message: any) => {
    if (!message || typeof message !== "object" || !("method" in message)) return;

    await transportToServer.send(message).catch(async (error: Error) => {
      // If it was a request and client is still open, send JSON-RPC error back.
      if (isJSONRPCRequest(message) && !transportToClientClosed) {
        const errorResponse = {
          jsonrpc: "2.0" as const,
          id: message.id,
          error: {
            code: -32001,
            message: error.message,
            data: { name: error.name, stack: error.stack },
          },
        };
        await transportToClient.send(errorResponse).catch(() => { });
      }
    });
  };

  transportToServer.onmessage = (message: any) => {
    transportToClient.send(message).catch(() => { });
  };

  transportToClient.onclose = () => {
    if (transportToServerClosed) return;
    transportToClientClosed = true;
    transportToServer.close().catch(() => { });
  };

  transportToServer.onclose = () => {
    if (transportToClientClosed) return;
    transportToServerClosed = true;
    transportToClient.close().catch(() => { });
  };

  transportToClient.onerror = () => { };
  transportToServer.onerror = () => { };
}
