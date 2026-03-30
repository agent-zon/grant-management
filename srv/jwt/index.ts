import { SignJWT, exportJWK, calculateJwkThumbprint, generateKeyPair } from "jose";
import type { JWK } from "jose";

// Key material MUST live on globalThis — not module-level variables.
// Reason: server.js loads this via `await import('./jwt/index.js')` (dynamic ESM import)
// while CDS handlers load it via tsx-transpiled imports. These resolve to separate
// module instances with separate module-scoped variables. globalThis is the only
// shared namespace that guarantees both code paths see the same key pair.
const KEYS = globalThis as typeof globalThis & {
  __consent_privateKey?: CryptoKey;
  __consent_publicJwk?: JWK;
  __consent_kid?: string;
};

async function ensureKeyPair() {
  if (KEYS.__consent_privateKey && KEYS.__consent_publicJwk && KEYS.__consent_kid) return;
  const { privateKey: priv, publicKey: pub } = await generateKeyPair("ES256");
  KEYS.__consent_privateKey = priv;
  KEYS.__consent_publicJwk = await exportJWK(pub);
  KEYS.__consent_publicJwk.alg = "ES256";
  KEYS.__consent_publicJwk.use = "sig";
  KEYS.__consent_kid = await calculateJwkThumbprint(KEYS.__consent_publicJwk);
  KEYS.__consent_publicJwk.kid = KEYS.__consent_kid;
  console.log("[JWT] Key pair initialized, kid:", KEYS.__consent_kid);
}

export interface ConsentJWTClaims {
  sub: string;
  sub_uuid?: string;
  user_uuid?: string;
  grant_id: string;
  actor: string;
  system?: string;
  scopes?: string[];
  provider_url?: string;
  event?: string;
}

export async function signConsentJWT(claims: ConsentJWTClaims): Promise<string> {
  await ensureKeyPair();
  const payload: Record<string, unknown> = {
    grant_id: claims.grant_id,
    actor: claims.actor,
  };
  if (claims.system) payload.system = claims.system;
  if (claims.scopes) payload.scopes = claims.scopes;
  if (claims.provider_url) payload.provider_url = claims.provider_url;
  if (claims.sub_uuid) payload.sub_uuid = claims.sub_uuid;
  if (claims.user_uuid) payload.user_uuid = claims.user_uuid;
  if (claims.event) payload.event = claims.event;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "ES256", kid: KEYS.__consent_kid! })
    .setSubject(claims.sub)
    .setIssuer("grant-management")
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(KEYS.__consent_privateKey!);
}

export async function getJWKS(): Promise<{ keys: JWK[] }> {
  await ensureKeyPair();
  return { keys: [KEYS.__consent_publicJwk!] };
}
