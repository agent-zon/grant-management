import { jwk } from "hono/jwk";
import { createMiddleware } from "hono/factory";
import { IdentityService } from "@sap/xssec";
import cds from "@sap/cds";

// ---------------------------------------------------------------------------
// Auth middleware — JWT verification with dynamic JWKS discovery
//
// Resolves the JWKS URI from (in order of preference):
//   1. The token's `jku` header claim (JWK Set URL — RFC 7515 §4.1.2)
//   2. The issuer's `.well-known/openid-configuration` discovery endpoint
//   3. The issuer's `.well-known/jwks.json` fallback
//
// Sets on the Hono context:
//   c.get("jwtPayload") — set automatically by Hono's jwk() middleware
//   c.set("user")       — normalized user object for downstream middleware
//
// Allows anonymous access (allow_anon: true) — callers should check
// c.get("jwtPayload") or c.get("user") to determine if authenticated.
// ---------------------------------------------------------------------------

// Cache discovered jwks_uri per issuer to avoid repeated fetches
const jwksUriCache = new Map<string, { uri: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Decode a JWT header without verification (just base64url → JSON).
 */
function decodeJwtHeader(token: string): Record<string, unknown> | null {
  try {
    const [headerB64] = token.split(".");
    if (!headerB64) return null;
    const json = Buffer.from(headerB64, "base64url").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Decode a JWT payload without verification (just base64url → JSON).
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Discover the JWKS URI for an issuer via OpenID Connect discovery.
 * Tries `/.well-known/openid-configuration` first, falls back to `/.well-known/jwks.json`.
 */
async function discoverJwksUri(issuer: string): Promise<string> {
  const cached = jwksUriCache.get(issuer);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.uri;
  }

  const baseUrl = issuer.replace(/\/+$/, "");

  // Try OpenID Connect discovery
  try {
    const discoveryUrl = `${baseUrl}/.well-known/openid-configuration`;
    console.log(`[auth] Discovering JWKS URI from: ${discoveryUrl}`);

    const res = await fetch(discoveryUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const config = (await res.json()) as Record<string, unknown>;
      if (typeof config.jwks_uri === "string") {
        console.log(`[auth] Discovered jwks_uri: ${config.jwks_uri}`);
        jwksUriCache.set(issuer, {
          uri: config.jwks_uri,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return config.jwks_uri;
      }
    }
  } catch (err: any) {
    console.warn(`[auth] OpenID discovery failed for ${issuer}:`, err.message);
  }

  // Fallback: assume /.well-known/jwks.json
  const fallback = `${baseUrl}/oauth2/certs`;
  console.log(`[auth] Falling back to: ${fallback}`);
  jwksUriCache.set(issuer, {
    uri: fallback,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return fallback;
}

/**
 * Extract the bearer token from the Authorization header.
 */
function extractBearerToken(c: any): string | null {
  const authHeader = c.req.header("authorization") || "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  return null;
}

/**
 * Resolve the JWKS URI dynamically from the incoming token:
 *   1. `jku` header claim (direct JWK Set URL)
 *   2. `iss` payload claim → OpenID discovery → jwks_uri
 *   3. `iss` payload claim → /.well-known/jwks.json fallback
 */
async function resolveJwksUri(c: any): Promise<string> {
  const token = extractBearerToken(c);

  if (token) {
    // 1. Try jku from JWT header
    const header = decodeJwtHeader(token);
    if (header && typeof header.jku === "string") {
      console.log(`[auth] Using jku from token header: ${header.jku}`);
      return header.jku;
    }

    // 2. Try iss from JWT payload → discovery
    const payload = decodeJwtPayload(token);
    if (payload && typeof payload.iss === "string") {
      return await discoverJwksUri(payload.iss);
    }
  }

  // 3. No token or no usable claims — return a dummy URI
  // jwk() with allow_anon: true will let the request through anyway
  console.log("[auth] No token or discoverable issuer — anonymous request");
  return "https://localhost/.well-known/jwks.json";
}

// ---------------------------------------------------------------------------
// The actual Hono JWK middleware — dynamic jwks_uri from the token itself
// ---------------------------------------------------------------------------

const jwtAuth = jwk({
  jwks_uri: resolveJwksUri,
  alg: ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "PS256", "EdDSA"],
  allow_anon: true,
});
async function getJwt() {
  //TBD grant jwt
  const ias= new IdentityService(cds.env.requires.auth.credentials!)
  return await ias.fetchClientCredentialsToken();
 }

// ---------------------------------------------------------------------------
// Composite middleware: jwk() verification + set c("user") for downstream
// ---------------------------------------------------------------------------

const authMiddleware = createMiddleware(async (c, next) => {
  // Run Hono's jwk() middleware first — sets c.get("jwtPayload") if valid
  await jwtAuth(c, async () => {});

  const payload = c.get("jwtPayload") as Record<string, unknown> | undefined;
  c.set("token", c.req.header("authorization")?.split(" ")[1] || await getJwt());

  if (payload) {
    // Build a normalized user object from standard JWT claims
    const user = {
      id:
        (payload.sub as string) ||
        (payload.user_uuid as string) ||
        (payload.email as string) ||
        "unknown",
      sub: payload.sub as string | undefined,
      email: payload.email as string | undefined,
      name:
        (payload.name as string) ||
        (payload.given_name as string) ||
        (payload.email as string),
      issuer: payload.iss as string | undefined,
      azp: payload.azp as string | undefined,
      scopes:
        typeof payload.scope === "string"
          ? (payload.scope as string).split(" ")
          : (payload.scopes as string[] | undefined),
      // Keep the full payload for anything else
      ...payload,
    };

    c.set("user", user);

    console.log(
      `[auth] Authenticated: ${user.id} (iss: ${user.issuer || "unknown"})`,
    );
  } else {
    c.set("user", null);
    console.log("[auth] Anonymous request (no valid JWT)");
  }

  await next();
});

export default authMiddleware;
