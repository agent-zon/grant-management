import cds from "@sap/cds";
import { MCPRequest } from "@types";
import { GrantToolsService } from "./grant-tools-service";
import { Tools } from "#cds-models/sap/scai/grants/GrantToolsService";

export default async function (this: GrantToolsService, req: cds.Request<MCPRequest>, next: Function) {
  const host = req.headers["x-forwarded-host"] || req.http?.req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || req.http?.req.protocol;


  req.data.meta = {
    host: `${protocol}://${host}`,
    //x-actor-id is the actor id from the request headers or the azp from the user auth info 
    agent:
      req.headers["x-actor-id"] ||
      // req.user?.authInfo?.token?.payload?.actor ||
      req.user?.authInfo?.token?.payload.azp ||
      req.user?.authInfo?.token?.clientId || "anonymous",
    grant_id:
      req.headers["x-grant-id"] ||
      req.user?.authInfo?.token?.payload.grant_id ||
      req.user?.authInfo?.token?.payload["sid"] ||
      req.user?.authInfo?.token?.payload.jti,
    ...(req.data.meta || {})
  }


  return await next();
}

