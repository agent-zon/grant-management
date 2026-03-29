import { createMiddleware } from "hono/factory";

export interface SessionMeta {
  host: string;
  agent: string;
  grant_id: string;
  destination: string;
  session_id?: string;
}

export default createMiddleware(async (c, next) => {
  const host =
    (c.req.header("x-forwarded-proto") || "https") +
    "://" +
    (c.req.header("x-forwarded-host") || c.req.header("host") || "localhost");

  // JWT payload is set by the auth middleware (hono/jwk → c.get("jwtPayload"))
  const jwtPayload: Record<string, any> = c.get("jwtPayload") || {};
  const user: Record<string, any> | null = c.get("user") || null;

  // destination comes from the URL param set by the root router, or x-destination header
  const destination =
    c.req.param("destination") || c.req.header("x-destination") || "unknown";

  const meta: SessionMeta = {
    host,
    destination,
    agent:
      c.req.header("x-actor-id") ||
      c.req.header("x-destination") ||
      user?.actor ||
      jwtPayload.actor ||
      user?.azp ||
      jwtPayload.azp ||
      "anonymous",
    grant_id:
      c.req.header("x-grant-id") ||
      user?.grant_id ||
      jwtPayload.grant_id ||
      jwtPayload.sid ||
      jwtPayload.jti ||
      "",
    session_id: c.req.header("mcp-session-id"),
  };

  c.set("meta", meta);

  return await next();
});

export type MetaEnv = {
  Variables: {
    meta: SessionMeta;
  };
}