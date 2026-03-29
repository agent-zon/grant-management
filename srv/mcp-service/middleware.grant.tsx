import { createMiddleware } from "hono/factory";
import cds from "@sap/cds";
import { inspect } from "node:util";
import type { SessionMeta } from "./middleware.meta";
import GrantsManagementService, {AuthorizationDetails , AuthorizationDetail} from "#cds-models/sap/scai/grants/GrantsManagementService";
import { IdentityService } from "@sap/xssec";

// ---------------------------------------------------------------------------
// Middleware — fetches authorization details from CDS grant service
//
// Sets on the Hono context:
//   c.set("authorization_details", Record<string, unknown>)
//
// Expects the meta middleware to have run first (c.get("meta")).
// ---------------------------------------------------------------------------



export default createMiddleware(async (c, next) => {
  const meta = c.get("meta") as SessionMeta | undefined;
  const grantId = meta?.grant_id || "";

  const grantService = await cds.connect.to(
   GrantsManagementService,
   { credentials: { jwt:c.get("token").access_token  } }
  );

  
  // const authorizationDetails = mcpDetails(await grantService.run(
  //   cds.ql.SELECT.from(AuthorizationDetails).where({
  //     consent_grant_id: grantId,
  //   })))
  const authorizationDetails = await fetchMcpDetails(grantService, grantId);

  console.log(
    `[grant] [${c.req.path}] Authorization details for grant ${grantId || "(none)"}:`,
    inspect(authorizationDetails, { colors: true, depth: 2 }),
  );

  c.set("authorization_details", authorizationDetails);

  await next();
});

// ---------------------------------------------------------------------------
// fetchMcpDetails — exported for reuse by other modules
// ---------------------------------------------------------------------------

export async function fetchMcpDetails(
  grantService: any,
  grantId: string,
): Promise<Record<string, unknown>> {
  if (!grantId) return {};
  try {
    const rows = await grantService.run(
      cds.ql.SELECT.from(
        "sap.scai.grants.GrantsManagementService.AuthorizationDetails",
      ).where({ consent_grant_id: grantId }),
    );
    return (rows || [])
      .filter((d: any) => d.type === "mcp")
      .reduce(
        (acc: Record<string, unknown>, d: any) => ({
          ...acc,
          ...(d.tools || {}),
        }),
        {},
      );
  } catch (err: any) {
    console.error("[grant] Could not fetch authorization details:", err);
    return {};
  }
}

function mcpDetails(authorization_details: AuthorizationDetails){
  console.log(`[mcpDetails] authorization_details: ${inspect(authorization_details, { colors: true, depth: 2 })}`);
  return (authorization_details || [])
    .filter((detail) => detail.type === "mcp")
    .reduce(
      (acc, detail) => {
        return {
          ...acc,
          ...detail.tools || {},
        }
      },
      {} as AuthorizationDetail & AuthorizationDetail["tools"]
    )
}
