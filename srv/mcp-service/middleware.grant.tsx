import { EventEmitter } from "node:events";
import { createMiddleware } from "hono/factory";
import cds from "@sap/cds";
import { inspect } from "node:util";
import type { SessionMeta } from "./middleware.meta";

import GrantsManagementService, {
  AuthorizationDetails,
  AuthorizationDetail,
} from "#cds-models/sap/scai/grants/GrantsManagementService";

// ---------------------------------------------------------------------------
// Grant authorization details — MCP tool sync
//
// Startup: one CDS `after` on AuthorizationDetails → refetch → emit on a
// per-scope channel (grantId + meta.host). MCP handlers subscribe with
// `grant.watchAuthorizationDetails` (wraps EventEmitter).
//
// Context:
//   c.set("authorization_details", …)
//   c.set("grant.refresh", async () => details)
//   c.set("grant.watchAuthorizationDetails", (fn) => unsubscribe)
// ---------------------------------------------------------------------------
 
 
type GrantDetailsHandler = (details: Record<string, unknown>) => void;

 



 
 


let _emitter: EventEmitter | null = null;
async function getEmitter() {
  if (!_emitter) _emitter = await grantEvents();
  return _emitter;
}

export default createMiddleware(async (c, next) => {
  const emitter = await getEmitter();
  const meta = c.get("meta") as SessionMeta | undefined;
  const grantId = meta?.grant_id || "";

  const grantService = await cds.connect.to(GrantsManagementService, {
    credentials: { jwt: c.get("token").access_token },
  });

  const authorizationDetails = mcpDetails(
    await grantService.run(
      cds.ql.SELECT.from(
        "sap.scai.grants.GrantsManagementService.AuthorizationDetails",
      ).where({ consent_grant_id: grantId }),
    ),
    meta?.host,
  ) as Record<string, unknown>;

  console.log(
    `[grant] [${c.req.path}] Authorization details for grant ${grantId || "(none)"}:`,
    inspect(authorizationDetails, { colors: true, depth: 2 }),
  );

  c.set("authorization_details", authorizationDetails);

  c.set("grant.refresh", async () => {
    if (!grantId) return {};
    const rows = await grantService.run(
      cds.ql.SELECT.from(
        "sap.scai.grants.GrantsManagementService.AuthorizationDetails",
      ).where({ consent_grant_id: grantId }),
    );
    const details = mcpDetails(
      rows as AuthorizationDetails,
      meta?.host,
    ) as Record<string, unknown>;
    c.set("authorization_details", details);
    return details;
  });

  c.set("grant.watch", (handler: GrantDetailsHandler) => {
    if (!grantId) return () => {};
    const listener = (details: Record<string, unknown>) => {
      try {
        handler(details);
      } catch (e: any) {
        console.error("[grant-sync] listener error:", e?.message, e?.stack);
      }
    };
    emitter.on(grantId, listener);
    return () => emitter.off(grantId, listener);
  });

  await next();
});


function mcpDetails(
  authorization_details: AuthorizationDetails,
  serverHost?: string,
) {
  console.log(
    `[mcpDetails] authorization_details: ${inspect(authorization_details, { colors: true, depth: 2 })}`,
  );
  return (authorization_details || [])
    .filter((detail) => detail.type === "mcp")
    .filter(
      (detail) =>
        !serverHost || !detail.server || detail.server === serverHost,
    )
    .reduce(
      (acc, detail) => {
        return {
          ...acc,
          ...(detail.tools || {}),
        };
      },
      {} as AuthorizationDetail & AuthorizationDetail["tools"],
    );
}


async function grantEvents(){
  const grantService = await cds.connect.to(GrantsManagementService); 
  const emmiter = new EventEmitter();
  grantService.after(
    ["CREATE", "UPDATE"],
    AuthorizationDetails,
    async (data) => {
      if(data?.consent_grant_id){
        emmiter.emit(data?.consent_grant_id, mcpDetails( await grantService.run(
          cds.ql.SELECT.from(
            "sap.scai.grants.GrantsManagementService.AuthorizationDetails",
          ).where({ consent_grant_id: data?.consent_grant_id }),
        )));
      }
    }
  );
  return emmiter; 
}