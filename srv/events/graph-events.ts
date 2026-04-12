import cds from "@sap/cds";

export interface GraphChangeEvent {
  grant_id: string;
  actor: string;
  event: string;
}

interface Connection {
  selectedActor: string;
  relevantActors: Set<string>;
  send: (data: GraphChangeEvent) => void;
}

// Must use globalThis — server.js and CDS handler files resolve to separate
// module instances even with static imports (different transpilation paths).
const G = globalThis as typeof globalThis & { __graphConnections?: Set<Connection> };
if (!G.__graphConnections) G.__graphConnections = new Set();
const connections = G.__graphConnections;

export function emitGraphChange(data: GraphChangeEvent) {
  console.log(`[SSE] Emitting graph-change: ${data.event} for actor=${data.actor}, ${connections.size} connections`);
  for (const conn of connections) {
    // Wildcard subscribers get everything (portal WS hub)
    if (conn.relevantActors.has("*") || conn.relevantActors.has(data.actor)) {
      conn.send(data);
    }
  }
}

export function addConnection(conn: Connection): () => void {
  connections.add(conn);
  return () => connections.delete(conn);
}

/**
 * Compute which actors are relevant when viewing `selectedActor`.
 * Includes the actor itself + any agents it delegates to via agent_invocation.
 */
export async function computeRelevantActors(selectedActor: string): Promise<Set<string>> {
  const db = cds.db;
  const { Grants, AuthorizationDetails } = db.entities("sap.scai.grants");

  const actors = new Set<string>([selectedActor]);

  const grants = await db.run(
    SELECT.from(Grants).where({ actor: selectedActor }).columns("id")
  );
  const grantIds = grants.map((g: any) => g.id).filter(Boolean);
  if (grantIds.length === 0) return actors;

  const delegations = await db.run(
    SELECT.from(AuthorizationDetails)
      .where({ consent_grant_id: { in: grantIds }, type: "agent_invocation" })
      .columns("identifier", "locations")
  );

  for (const d of delegations) {
    const target = (d as any).identifier || ((d as any).locations && (d as any).locations[0]);
    if (target) actors.add(target);
  }

  return actors;
}
