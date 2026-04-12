import cds from "@sap/cds";
import { createClient, type RedisClientType } from "redis";

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

const REDIS_URL = process.env.REDIS_URL || "redis://mcp-aggregator-redis:6379";
const CHANNEL = "graph-events";

// Local SSE connections (per-pod — each pod has its own SSE clients)
const localConnections = new Set<Connection>();

let publisher: RedisClientType | null = null;
let subscriber: RedisClientType | null = null;
let redisReady = false;
let redisInitializing = false;

async function ensureRedis() {
  if (redisReady || redisInitializing) return;
  redisInitializing = true;

  try {
    publisher = createClient({ url: REDIS_URL }) as RedisClientType;
    publisher.on("error", (e: Error) => console.warn("[Redis] pub error:", e.message));
    await publisher.connect();

    subscriber = publisher.duplicate() as RedisClientType;
    subscriber.on("error", (e: Error) => console.warn("[Redis] sub error:", e.message));
    await subscriber.connect();

    await subscriber.subscribe(CHANNEL, (message: string) => {
      try {
        const data = JSON.parse(message) as GraphChangeEvent;
        broadcastToLocal(data);
      } catch {}
    });

    redisReady = true;
    console.log(`[Redis] Connected to ${REDIS_URL}, subscribed to ${CHANNEL}`);
  } catch (e: any) {
    console.warn(`[Redis] Connection failed: ${e.message}. Falling back to in-memory only.`);
    publisher = null;
    subscriber = null;
    redisInitializing = false;
  }
}

function broadcastToLocal(data: GraphChangeEvent) {
  for (const conn of localConnections) {
    if (conn.relevantActors.has("*") || conn.relevantActors.has(data.actor)) {
      conn.send(data);
    }
  }
}

export async function emitGraphChange(data: GraphChangeEvent) {
  console.log(`[SSE] Emitting graph-change: ${data.event} for actor=${data.actor}`);

  if (redisReady && publisher) {
    // Publish to Redis — all pods (including this one) will receive via subscriber
    await publisher.publish(CHANNEL, JSON.stringify(data));
  } else {
    // Fallback: in-memory only (single pod)
    broadcastToLocal(data);
  }
}

export function addConnection(conn: Connection): () => void {
  ensureRedis(); // fire-and-forget
  localConnections.add(conn);
  return () => localConnections.delete(conn);
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
