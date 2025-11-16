import cds from "@sap/cds";
import type { AuthorizationService } from "./authorization-service.tsx";
import { IdentityService } from "@sap/xssec";
import fetch from "node-fetch";
import {
  AuthorizationDetails,
  AuthorizationRequest,
  AuthorizationRequests,
} from "#cds-models/sap/scai/grants/AuthorizationService";
import { Agent } from "https";
import { InvalidTokenError, jwtDecode } from "jwt-decode";
import { ulid } from "ulid";

export default async function token(
  this: AuthorizationService,
  req: cds.Request<{
    grant_type: string;
    code?: string;
    refresh_token?: string;
    subject_token?: string;
  }>
) {
  const { grant_type, code, refresh_token, subject_token } = req.data;

  const { access_token, ...tokens } = await getTokens();
  if (!access_token) {
    return tokens;
  }
  const { sid: grant_id } = jwtDecode<{ sid: string }>(access_token);

  // Fetch authorization details from DB by consent foreign key
  const authorization_details = await cds.run(
    cds.ql.SELECT.from(AuthorizationDetails).where({
      consent_grant_id: grant_id,
    })
  );

  console.log("[token] response", {
    access_token: access_token?.slice(0, 5),
    grant_id: grant_id,
    authorization_details,
    ...tokens,
  });

  return {
    access_token,
    ...tokens,
    token_type: "Bearer",
    expires_in: 3600,
    grant_id: grant_id,
    authorization_details,
  };

  type IdentityServiceJwtResponse =
    ReturnType<IdentityService["fetchJwtBearerToken"]> extends Promise<infer T>
      ? T
      : never;
  type TokenResponse = Partial<IdentityServiceJwtResponse> &
    Pick<IdentityServiceJwtResponse, "access_token" | "expires_in"> & {
      grant_id?: string | null;
    };

  async function getTokens(): Promise<TokenResponse> {
    console.log(
      "[token] request",
      req.data,
      "jwt",
      req.user?.authInfo?.token.jwt?.slice(0, 5),
      "sid",
      req.user?.authInfo?.token?.payload["sid"],
      "jti",
      req.user?.authInfo?.token?.payload["jti"]
    );

    //no ias service -return mock data
    if (!cds.requires.auth.credentials) {
      const request =
        code && (cds.read(AuthorizationRequests, code) as AuthorizationRequest);
      if (!request) {
        console.log("missing request for code", grant_type, code);
        throw Error("invalid_grant");
      }
      return {
        expires_in: 3600,
        refresh_token: ulid(),
        access_token: req.user?.authInfo?.token?.jwt || `mk_${ulid()}`,
        token_type: "urn:ietf:params:oauth:token-type:jwt",
        grant_id: request.grant_id!,
      };
    }

    const authService = new IdentityService(cds.requires.auth.credentials);

    if (refresh_token != null) {
      const tokenUr = await authService.getTokenUrl("refresh_token");

      const { access_token, ...tokens } = (await fetch(tokenUr.href, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token,
        }),
        agent: new Agent({
          key: authService.credentials.key,
          cert: authService.credentials.certificate,
        }),
      }).then((e) => e.json())) as TokenResponse;
      const { sid: grant_id } = jwtDecode<{ sid: string }>(access_token);

      return {
        ...tokens,
        access_token,
        grant_id,
      };
    }
    //"urn:ietf:params:oauth:grant-type:token-exchange"
    if (
      grant_type === "urn:ietf:params:oauth:grant-type:token-exchange" &&
      cds.requires.auth.credentials
    ) {
      const tokenUr = await authService.getTokenUrl(
        "urn:ietf:params:oauth:grant-type:token-exchange"
      );

      const { access_token, ...tokens } = (await fetch(tokenUr.href, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
          subject_token: subject_token || req.user?.authInfo?.token.jwt || "",
          subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
          client_id: authService.credentials.clientid!,
        }),
        agent: new Agent({
          key: authService.credentials.key,
          cert: authService.credentials.certificate,
        }),
      }).then((e) => e.json())) as TokenResponse;

      const { sid: grant_id } =
        (access_token && jwtDecode<{ sid: string }>(access_token)) || {};

      return {
        ...tokens,
        access_token,
        grant_id,
      };
    }

    if (grant_type === "user_token") {
      console.log(
        "user_token request",
        req.data,
        "jwt",
        req.user?.authInfo?.token.jwt?.slice(0, 10),
        "header",
        req.http?.req?.headers.authorization
          ?.replace("Bearer ", "")
          ?.slice(0, 10)
      );

      //grant type: jwt bearer
      if (req.user?.authInfo?.token.jwt && cds.requires.auth.credentials) {
        const authService = new IdentityService(cds.requires.auth.credentials);
        // const tokenUrl = await authService.getTokenUrl("urn:ietf:params:oauth:grant-type:token-exchange")
        const { access_token, ...tokens } =
          await authService.fetchJwtBearerToken(
            req.user.authInfo?.getAppToken()
          );

        const { sid: grant_id } =
          (access_token && jwtDecode<{ sid: string }>(access_token)) || {};

        return {
          ...tokens,
          access_token,
          grant_id,
        };
      }
    }
    //todo: use ias code
    if (grant_type == "authorization_code") {
      const request = cds.read(
        AuthorizationRequests,
        code
      ) as AuthorizationRequest;
      if (request.subject_token) {
        const tokenUr = await authService.getTokenUrl(
          "urn:ietf:params:oauth:grant-type:token-exchange"
        );

        const { access_token, ...tokens } = (await fetch(tokenUr.href, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
            subject_token: request.subject_token,
            subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
            client_id: authService.credentials.clientid!,
          }),
          agent: new Agent({
            key: authService.credentials.key,
            cert: authService.credentials.certificate,
          }),
        }).then((e) => e.json())) as TokenResponse;
        const { sid } =
          (access_token && jwtDecode<{ sid: string }>(access_token)) || {};

        return {
          ...tokens,
          access_token,
          grant_id: request?.grant_id || sid,
        };
      }
      return {
        access_token: req.user?.authInfo?.token?.jwt || `mk_${ulid()}`,
        expires_in:
          (req.user?.authInfo?.token.expirationDate?.getUTCDate() ||
            new Date(Date.now() + 36000).getUTCDate()) -
          new Date(Date.now()).getUTCDate(),
        grant_id: request?.grant_id,
      };
    }

    console.log("no grant type return current session");
    return {
      access_token: req.user?.authInfo?.token?.jwt || `mk_${ulid()}`,
      expires_in:
        (req.user?.authInfo?.token.expirationDate?.getUTCDate() ||
          new Date(Date.now() + 36000).getUTCDate()) -
        new Date(Date.now()).getUTCDate(),
      grant_id: req.user?.authInfo?.token?.payload["sid"],
    };
  }
}
