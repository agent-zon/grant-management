import cds from "@sap/cds";
import { ulid } from "ulid";
import type { AuthorizationService } from "./authorization-service.tsx";
import {IdentityService, createSecurityContext, constants } from "@sap/xssec"

import {
  AuthorizationDetails,
  AuthorizationRequest,
  AuthorizationRequests, Grants,
} from "#cds-models/sap/scai/grants/AuthorizationService";

export default async function token(
  this: AuthorizationService,
  req: cds.Request<{ grant_type: string; code: string;   refresh_token:string; }>
) {
   const { grant_type, code ,refresh_token} = req.data;
   if(cds.requires.auth.credentials){
     const authService = new IdentityService(cds.requires.auth.credentials);
     authService.getTokenUrl("")

   }

  if (grant_type === "user_token") {
    console.log("user_token request", req.data ,
        "jwt", req.user?.authInfo?.token.jwt?.slice(0,10) ,
        "header",req.http?.req?.headers.authorization?.replace("Bearer ","")?.slice(0,10)
    );
    const token = req.user?.authInfo?.token.jwt|| refresh_token;
    const response ={
      access_token: token,
      refresh_token: token,
      token_type: "Bearer",
      expires_in:  3600


    }
    console.log("response", response)
    return response;
  }
  const {grant_id} = await this.read(AuthorizationRequests,code) as AuthorizationRequest;
  if (!grant_id) {
    console.log("invalid code - request not found")
    return req.error(400, "invalid_grant");
  } 
  
  // Fetch authorization details from DB by consent foreign key
  const authorization_details = await cds.run(
    cds.ql.SELECT.from(AuthorizationDetails).where({ consent_grant_id: grant_id })
  );

  console.log("token response", {
    
    grant_id,
    authorization_details,
    
  });

  return {
    access_token: req.user?.authInfo?.token?.jwt,
    token_type: "Bearer",
    expires_in: 3600, 
    grant_id,
    authorization_details,
  };
}


