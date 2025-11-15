import cds from "@sap/cds";
import type {AuthorizationService} from "./authorization-service.tsx";
import {IdentityService} from "@sap/xssec"
import fetch from "node-fetch"
import {
    AuthorizationDetails,
    AuthorizationRequest,
    AuthorizationRequests,
} from "#cds-models/sap/scai/grants/AuthorizationService";
import {Agent} from "https";
import {jwtDecode} from "jwt-decode";
import {ulid} from "ulid";

export default async function token(
    this: AuthorizationService,
    req: cds.Request<{ grant_type: string; code?: string; refresh_token?: string; subject_token?:string}>
) {
    const {grant_type, code, refresh_token, subject_token} = req.data;
    
    const {access_token, ...tokens} = await getTokens()
    if(!access_token) {
        return tokens
    }
    const {sid: grant_id} = jwtDecode<{sid:string}>(access_token)
         
    // Fetch authorization details from DB by consent foreign key
    const authorization_details = await cds.run(
        cds.ql.SELECT.from(AuthorizationDetails).where({consent_grant_id: grant_id})
    );

    console.log("[token] response", {
        access_token:access_token?.slice(0,5),
        grant_id: grant_id,
        authorization_details,
        ...tokens
        

    });

    return {
        access_token,
        ...tokens,
        token_type: "Bearer",
        expires_in: 3600,
        grant_id:grant_id,
        authorization_details,
    };
    
    
    type IdentityServiceJwtResponse = ReturnType<IdentityService["fetchJwtBearerToken"]> extends Promise<infer T>? T: never
    type TokenResponse = Partial<IdentityServiceJwtResponse>  & Pick<IdentityServiceJwtResponse, "access_token" | "expires_in">
    async function getTokens(): Promise<TokenResponse> {

        console.log("[token] request", req.data,
            "jwt", req.user?.authInfo?.token.jwt?.slice(0, 5),
            "sid", req.user?.authInfo?.token?.payload["sid"],
            "jti", req.user?.authInfo?.token?.payload["jti"]
        );
        
        //no ias service -return mock data
        if(!cds.requires.auth.credentials){
            return  {
                expires_in: 3600,
                refresh_token: ulid(),
                access_token: req.user?.authInfo?.token?.jwt ||  `mk_${ulid()}`,
                token_type: "urn:ietf:params:oauth:token-type:jwt"
            }
        }
        
        const authService = new IdentityService(cds.requires.auth.credentials);

        if (refresh_token != null ) {

            const tokenUr = await authService.getTokenUrl("refresh_token");
 
            const tokenResponse= await fetch(tokenUr.href,{
                method: "POST",
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: new URLSearchParams({
                    grant_type: "refresh_token",
                    refresh_token
                }),
                agent: new Agent({
                    key:  authService.credentials.key,
                    cert: authService.credentials.certificate,
                })
            })
            return await tokenResponse.json() as TokenResponse;

        }
        //"urn:ietf:params:oauth:grant-type:token-exchange"
        if(grant_type === "urn:ietf:params:oauth:grant-type:token-exchange" && cds.requires.auth.credentials){

            const tokenUr = await authService.getTokenUrl("urn:ietf:params:oauth:grant-type:token-exchange");

            const tokenResponse= await fetch(tokenUr.href,{
                method: "POST",
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: new URLSearchParams({
                    grant_type:"urn:ietf:params:oauth:grant-type:token-exchange",
                    subject_token: subject_token ||req.user?.authInfo?.token.jwt || "",
                    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
                    client_id:authService.credentials.clientid!
                }),
                agent: new Agent({
                    key:  authService.credentials.key,
                    cert: authService.credentials.certificate,
                })
            })
            return  await tokenResponse.json() as TokenResponse
        }
        
        if (grant_type === "user_token") {
            console.log("user_token request", req.data,
                "jwt", req.user?.authInfo?.token.jwt?.slice(0, 10),
                "header", req.http?.req?.headers.authorization?.replace("Bearer ", "")?.slice(0, 10)
            );


            //grant type: jwt bearer 
            if (req.user?.authInfo?.token.jwt && cds.requires.auth.credentials) {
                const authService = new IdentityService(cds.requires.auth.credentials);
                // const tokenUrl = await authService.getTokenUrl("urn:ietf:params:oauth:grant-type:token-exchange")
                return await authService.fetchJwtBearerToken(req.user.authInfo?.getAppToken());
            }
 
        }
        //todo: use ias code
        return {
            access_token: req.user?.authInfo?.token?.jwt ||  `mk_${ulid()}`,
            expires_in:(req.user?.authInfo?.token.expirationDate?.getUTCDate() || new Date(Date.now() + 36000).getUTCDate() ) - new Date(Date.now()).getUTCDate()  
        }
         

    }
    
    
    

}



/*
addClientAuthentication(request, options = {})
{
    this.validateCredentials("fetch token", "clientid");
    request.body.append("client_id", this.credentials.clientid);

    if (this.credentials.clientsecret) {
        request.body.append("client_secret", this.credentials.clientsecret);
    } else if (this.credentials.key && this.credentials.certificate) {
        request.agent = new Agent({
            key: this.credentials.key,
            cert: this.credentials.certificate,
        });
    } else {
        throw new InvalidCredentialsError("Service credentials contain neither a client secret nor certificate based authentication information.");
    }
}

"access_token": "eyJraWQiOiI3NW0zUnZuNGNiNm4wMlBXcGFsdFF4QzdjM1kiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJkaW5hLnZpbnRlckBzYXAuY29tIiwiYXBwX3RpZCI6Ijk1ZTQ4ZWJmLWY1ZTUtNGMwNC1hMzE3LTZmMGE2MTMwNTRmNiIsImlzcyI6Imh0dHBzOi8vYWZjZHBjeWFmLmFjY291bnRzNDAwLm9uZGVtYW5kLmNvbSIsImdpdmVuX25hbWUiOiJEaW5hIiwic2lkIjoiUy1TUC0zMDgwNGQzOC0wZTFlLTRhYWMtOTUzMS1lOTZmMzk2M2ZjMzIiLCJpYXNfaXNzIjoiaHR0cHM6Ly9hZmNkcGN5YWYuYWNjb3VudHM0MDAub25kZW1hbmQuY29tIiwiYXVkIjpbImU0ZGJmMDJiLTNiMmUtNDMzYi1hZTlhLWFmMWU2NTY1MDdlYiIsIjA3NzlhOGM1LTg5NjItNDEyYi05OGI0LTExNzQyMzI2YjhiZCIsIjkwM2M0MzBlLTU3NzEtNDVmZC1iMDA0LTBkMTBjYmE4ZGM0MCJdLCJzY2ltX2lkIjoiZTBhNDQ2OWItMzBhNS00MjRhLWE1YmEtYTZiZTUzZmY4ZjEyIiwidXNlcl91dWlkIjoiZTBhNDQ2OWItMzBhNS00MjRhLWE1YmEtYTZiZTUzZmY4ZjEyIiwiYXpwIjoiMDc3OWE4YzUtODk2Mi00MTJiLTk4YjQtMTE3NDIzMjZiOGJkIiwiY25mIjp7Ing1dCNTMjU2IjoiZjN6NFhvT0puSHZDYmZMMGZEQ1FJX2Z3QURiNHZpNVBQZER0Z281YUVjYyJ9LCJleHAiOjE3NjMxNzcyOTMsImlhdCI6MTc2MzE3MzY5MywiZmFtaWx5X25hbWUiOiJWaW50ZXIiLCJqdGkiOiIzZDk0OTVlMy1kOWYxLTRiYTEtYWYxMi00NzVlMDlmOTFlYzMiLCJlbWFpbCI6ImRpbmEudmludGVyQHNhcC5jb20ifQ.k-3ArZSOK9BlmBgwV6rG1NXwDcum2n-Y7h-m4wU9-jvSZdaHpE3s1wJj0MX_qQWEacq6-iCuuB7B45orOWn23KynQOxjCT77avqzfNGvsVg3a9FEflMzJsJrvuXaBK1V7bP4uLBtpreGvXmKz0Ude4grWslK6njVSxNzWymP4UOzTTtQAFLhdclzteneMqLwya5v9GlDGfhPduCKoXtkZ4xDt7n7ZXLgbfT3W4_Z6un4BHQUbfKcf6PHMwkuc5szkyAkzlOXyPc2RLHiTYX8zh3T03vOeqNdpnzEpemi9g6Q27WBgU2F9dQUniHZTQaTXuCaYyBFYnE_bk-UHaanbhYycG7fxyXT8JvmHnSgqJ5YUKOZowYEevHc3Sunh0WZpNOpyUjbk0Nizg4vr41rIeha3ShgouBh5V2AYBbFZe9APGsnFrS4-97PqBeFr3I_6hphUIMAoD-MkLoRtelIk0HwFyxovNI3BwHrR_T8zqxYVJ2weezcO5jJiIdes4rZSBco-LLQsKz2AO9ovIj8hvniWV0TARb7LFB8F_3cOHDKQ_X7D44JcPpyTa862lJXtZpGlr8l-dzzMdiCPnFVHPr1x2A6Lz5jMtekGcMnqKyvhdpCRM9g5RCwVsRHOPbi6FA2shIoDMmx3Uth-AzhrQGC9qoKwg5JsCyZXI7D9Ik",
    "refresh_token": "89325bbbb5dcef8e34c19b651ecabc57",
    "scope": "openid",
    "id_token": "eyJraWQiOiI3NW0zUnZuNGNiNm4wMlBXcGFsdFF4QzdjM1kiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJkaW5hLnZpbnRlckBzYXAuY29tIiwiYXBwX3RpZCI6Ijk1ZTQ4ZWJmLWY1ZTUtNGMwNC1hMzE3LTZmMGE2MTMwNTRmNiIsImlzcyI6Imh0dHBzOi8vYWZjZHBjeWFmLmFjY291bnRzNDAwLm9uZGVtYW5kLmNvbSIsImdpdmVuX25hbWUiOiJEaW5hIiwic2lkIjoiUy1TUC0zMDgwNGQzOC0wZTFlLTRhYWMtOTUzMS1lOTZmMzk2M2ZjMzIiLCJpYXNfaXNzIjoiaHR0cHM6Ly9hZmNkcGN5YWYuYWNjb3VudHM0MDAub25kZW1hbmQuY29tIiwiYXVkIjpbImU0ZGJmMDJiLTNiMmUtNDMzYi1hZTlhLWFmMWU2NTY1MDdlYiIsIjA3NzlhOGM1LTg5NjItNDEyYi05OGI0LTExNzQyMzI2YjhiZCIsIjkwM2M0MzBlLTU3NzEtNDVmZC1iMDA0LTBkMTBjYmE4ZGM0MCJdLCJzY2ltX2lkIjoiZTBhNDQ2OWItMzBhNS00MjRhLWE1YmEtYTZiZTUzZmY4ZjEyIiwidXNlcl91dWlkIjoiZTBhNDQ2OWItMzBhNS00MjRhLWE1YmEtYTZiZTUzZmY4ZjEyIiwiYXpwIjoiMDc3OWE4YzUtODk2Mi00MTJiLTk4YjQtMTE3NDIzMjZiOGJkIiwiY25mIjp7Ing1dCNTMjU2IjoiZjN6NFhvT0puSHZDYmZMMGZEQ1FJX2Z3QURiNHZpNVBQZER0Z281YUVjYyJ9LCJleHAiOjE3NjMxNzcyOTMsImlhdCI6MTc2MzE3MzY5MywiZmFtaWx5X25hbWUiOiJWaW50ZXIiLCJqdGkiOiIzZDk0OTVlMy1kOWYxLTRiYTEtYWYxMi00NzVlMDlmOTFlYzMiLCJlbWFpbCI6ImRpbmEudmludGVyQHNhcC5jb20ifQ.k-3ArZSOK9BlmBgwV6rG1NXwDcum2n-Y7h-m4wU9-jvSZdaHpE3s1wJj0MX_qQWEacq6-iCuuB7B45orOWn23KynQOxjCT77avqzfNGvsVg3a9FEflMzJsJrvuXaBK1V7bP4uLBtpreGvXmKz0Ude4grWslK6njVSxNzWymP4UOzTTtQAFLhdclzteneMqLwya5v9GlDGfhPduCKoXtkZ4xDt7n7ZXLgbfT3W4_Z6un4BHQUbfKcf6PHMwkuc5szkyAkzlOXyPc2RLHiTYX8zh3T03vOeqNdpnzEpemi9g6Q27WBgU2F9dQUniHZTQaTXuCaYyBFYnE_bk-UHaanbhYycG7fxyXT8JvmHnSgqJ5YUKOZowYEevHc3Sunh0WZpNOpyUjbk0Nizg4vr41rIeha3ShgouBh5V2AYBbFZe9APGsnFrS4-97PqBeFr3I_6hphUIMAoD-MkLoRtelIk0HwFyxovNI3BwHrR_T8zqxYVJ2weezcO5jJiIdes4rZSBco-LLQsKz2AO9ovIj8hvniWV0TARb7LFB8F_3cOHDKQ_X7D44JcPpyTa862lJXtZpGlr8l-dzzMdiCPnFVHPr1x2A6Lz5jMtekGcMnqKyvhdpCRM9g5RCwVsRHOPbi6FA2shIoDMmx3Uth-AzhrQGC9qoKwg5JsCyZXI7D9Ik",
    "token_type": "Bearer",
    "expires_in": 3600

* */
