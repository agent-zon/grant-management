import cds from "@sap/cds";
import { SignJWT, importPKCS8, importX509, exportJWK, calculateJwkThumbprint } from "jose";
import type { JWK } from "jose";
import crypto from "crypto";

// Key material loaded from IAS service binding (X.509 certificate).
// All pods mount the same binding → same key → JWTs verify on any pod.
let privateKey: CryptoKey | null = null;
let publicJwk: JWK | null = null;
let kid: string | null = null;

async function ensureKeys() {
  if (privateKey && publicJwk && kid) return;

  const credentials = cds.requires?.auth?.credentials;
  if (!credentials?.key || !credentials?.certificate) {
    throw new Error("IAS credentials not available — bind an Identity service instance");
  }

  // IAS provides PKCS#1 (BEGIN RSA PRIVATE KEY). Convert to PKCS#8 for jose.
  let keyPem = credentials.key as string;
  if (keyPem.includes("BEGIN RSA PRIVATE KEY")) {
    const keyObj = crypto.createPrivateKey(keyPem);
    keyPem = keyObj.export({ type: "pkcs8", format: "pem" }) as string;
  }

  privateKey = await importPKCS8(keyPem, "RS256");
  const publicKey = await importX509(credentials.certificate, "RS256");
  publicJwk = await exportJWK(publicKey);
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";
  kid = await calculateJwkThumbprint(publicJwk);
  publicJwk.kid = kid;
  console.log("[JWT] Key loaded from IAS binding, kid:", kid);
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
  await ensureKeys();
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
    .setProtectedHeader({ alg: "RS256", kid: kid! })
    .setSubject(claims.sub)
    .setIssuer("grant-management")
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(privateKey!);
}

export async function getJWKS(): Promise<{ keys: JWK[] }> {
  await ensureKeys();
  return { keys: [publicJwk!] };
}
