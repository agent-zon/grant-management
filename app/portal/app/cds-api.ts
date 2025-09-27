import type { ConsentGrant } from "./grants.db";

type CdsGrant = {
  grant_id: string;
  client_id?: string;
  act?: string;
  sub?: string;
  sid?: string;
  status?: string;
  created_at?: string;
  modified_at?: string;
  expires_at?: string;
  authorization_details?: Array<{
    ID?: string;
    type?: string;
    actions?: string;
    locations?: string;
    toolName?: string;
    toolDescription?: string;
    riskLevel?: "low" | "medium" | "high";
    category?: "file-system" | "data-access" | "system-admin" | "network" | "analytics" | string;
  }>;
  scope?: Array<{
    ID?: string;
    scope?: string;
    resources?: string;
  }>;
};

function toAbsolute(url: string, request: Request): string {
  const base = new URL(request.url);
  return new URL(url, base).toString();
}

function mapGrantFromCds(grant: CdsGrant): ConsentGrant {
  const primaryScope = grant.scope?.[0]?.scope || "unknown";
  const auth = grant.authorization_details || [];
  const category = (auth[0]?.category as ConsentGrant["category"]) || "data-access";
  const risk = (auth[0]?.riskLevel as ConsentGrant["riskLevel"]) || "low";
  const description = auth[0]?.toolDescription || `Access for scope ${primaryScope}`;
  const toolsIncluded: string[] = auth
    .map((a) => a.toolName)
    .filter((v): v is string => Boolean(v));

  return {
    id: grant.grant_id,
    scope: primaryScope,
    description,
    granted: grant.status === "active",
    grantedAt: grant.created_at,
    expiresAt: grant.expires_at,
    sessionId: grant.sid,
    usage: 0,
    lastUsed: undefined,
    toolsIncluded: toolsIncluded.length ? toolsIncluded : [],
    requester: undefined,
    requesterId: undefined,
    riskLevel: risk,
    category,
  };
}

export async function getGrants(request: Request): Promise<ConsentGrant[]> {
  const res = await fetch(toAbsolute("/api/grants", request));
  if (!res.ok) throw new Error(`Failed to load grants: ${res.status}`);
  const data = (await res.json()) as CdsGrant[];
  return data.map(mapGrantFromCds);
}

export async function getGrant(id: string, request: Request): Promise<ConsentGrant> {
  const res = await fetch(toAbsolute(`/api/grants/${encodeURIComponent(id)}`, request));
  if (res.status === 404) throw new Response("Not Found", { status: 404 });
  if (!res.ok) throw new Error(`Failed to load grant ${id}: ${res.status}`);
  const data = (await res.json()) as CdsGrant;
  return mapGrantFromCds(data);
}

export async function updateGrant(
  id: string,
  payload: Partial<{
    status: "active" | "inactive" | "revoked" | "expired";
    expiresAt?: string | null;
    sessionId?: string | null;
  }>,
  request: Request,
) {
  const body: Record<string, unknown> = {};
  if (payload.status !== undefined) body.status = payload.status;
  if (payload.expiresAt !== undefined) body.expires_at = payload.expiresAt;
  if (payload.sessionId !== undefined) body.sid = payload.sessionId;

  const res = await fetch(toAbsolute(`/api/grants/${encodeURIComponent(id)}`, request), {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to update grant ${id}: ${res.status}`);
  return res.json();
}

