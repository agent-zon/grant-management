import { createMiddleware } from "hono/factory";
import {
  HttpDestination,
  isHttpDestination,
  subscriberFirst,
  useOrFetchDestination,
} from "@sap-cloud-sdk/connectivity";
import { z, ZodRawShape } from "zod";
import type { MetaEnv, SessionMeta } from "./middleware.meta";

// ---------------------------------------------------------------------------
// Middleware — resolves a BTP destination and builds merged headers
//
// Sets on the Hono context:
//   c.set("destination", HttpDestination | null) — the resolved destination
//   c.set("mergedHeaders", Record)               — headers to forward
//
// Expects the meta middleware to have run first (c.get("meta")).
// ---------------------------------------------------------------------------

export default createMiddleware<McpDestinationEnv & MetaEnv>(async (c, next) => {
  const meta = c.get("meta") as SessionMeta;
  const jwt = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");

  // ── Collect inbound headers ────────────────────────────────────────────
  const inboundHeaders: Record<string, string> = {};
  c.req.raw.headers.forEach((value: string, key: string) => {
    inboundHeaders[key.toLowerCase()] = value;
  });

  // ── Resolve destination ────────────────────────────────────────────────
  const destination = await useOrFetchDestination({
    destinationName: meta.destination,
    jwt,
    selectionStrategy: subscriberFirst,
  }) as HttpDestination;
  c.set("destination", destination);

  console.log(
    "[destination] Resolved:",
    "name:",
    destination?.name,
    "url:",
    destination?.url,
    "authTokens:",
    destination?.authTokens?.length ?? 0,
  );

  if (!isHttpDestination(destination)) {
    console.warn(
      `[destination] ${meta.destination} is not an HTTP destination — skipping`,
    );
     return await next();
  }

  // ── Build merged headers ───────────────────────────────────────────────
  const mergedHeaders = buildMergedHeaders(inboundHeaders, destination);
  const authToken = destination.authTokens?.[0]?.value;

  c.set("mergedHeaders", {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...mergedHeaders,
  });

  return await next();
});

export type McpDestinationEnv = {
  Variables: {
    destination: HttpDestination;
    "destination.headers": Record<string, string>;
  };
}
// ---------------------------------------------------------------------------
// buildMergedHeaders — exported for reuse
// ---------------------------------------------------------------------------

/**
 * Build merged headers for the destination transport.
 *
 * Priority (highest wins):
 * 1. Destination authTokens with `http_header`
 * 2. Destination-level headers
 * 3. Forwarded inbound headers (excluding hop-by-hop)
 */
export function buildMergedHeaders(
  inboundHeaders: Record<string, string | string[] | undefined>,
  destination: HttpDestination,
): Record<string, string> {
  const SKIP = new Set([
    "host",
    "content-length",
    "connection",
    "transfer-encoding",
  ]);

  // Forward inbound headers (skip hop-by-hop)
  const forwarded = Object.entries(inboundHeaders)
    .filter(([key]) => !SKIP.has(key.toLowerCase()))
    .reduce(
      (h, [k, v]) => {
        h[k] = Array.isArray(v) ? v.join(", ") : String(v ?? "");
        return h;
      },
      {} as Record<string, string>,
    );

  // Destination-configured headers
  const destHeaders: Record<string, string> = destination.headers
    ? Object.fromEntries(
        Object.entries(destination.headers).map(([k, v]) => [k, String(v)]),
      )
    : {};

  // Auth tokens that specify an http_header
  const authFromTokens: Record<string, string> =
    destination.authTokens
      ?.filter((t) => t.http_header)
      .reduce(
        (h, t) => {
          if (t.http_header) h[t.http_header.key] = t.http_header.value;
          return h;
        },
        {} as Record<string, string>,
      ) || {};

  return { ...forwarded, ...destHeaders, ...authFromTokens };
}

// ---------------------------------------------------------------------------
// toZod — exported for reuse by mcp.remote / mcp.grant
// ---------------------------------------------------------------------------

/** Convert a JSON Schema object → Zod shape (best-effort). */
export function toZod(schema?: {
  [x: string]: unknown;
  type: "object";
  properties?: Record<string, object>;
  required?: string[];
}): ZodRawShape | undefined {
  if (!schema) return undefined;
  try {
    // @ts-ignore – z.fromJSONSchema exists at runtime in Zod v4
    return z.fromJSONSchema(schema as any).shape;
  } catch {
    return undefined;
  }
}
