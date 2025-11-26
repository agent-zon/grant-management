import cds from "@sap/cds";
import {
  IdentityService,
  IdentityServiceToken,
  SecurityContext,
} from "@sap/xssec";

class AuthService extends cds.ApplicationService {
  public me(req) {
    console.log("cds.context.user", cds.context?.user);

    // Get user from CDS context (this is the authenticated user)
    const user = req?.user;

    return {
      correlationId: user?.authInfo?.config?.correlationId,
      jwt: user?.authInfo?.config?.jwt,
      skipValidation: user?.authInfo?.config?.skipValidation,
      user: user?.id,
      claims: user?.attr,
      roles: user?.roles,
      authInfo: user?.authInfo,
      token: user?.authInfo?.token,
      tokenInfo: user?.authInfo?.getTokenInfo(),
      payload: user?.authInfo?.token.payload,
      consumedApis: user?.authInfo?.token.consumedApis,
      is: {
        anonymous: user?.is("anonymous"),
        authenticated: user?.is("authenticated"),
        anyRole: user?.is("any-role"),
        admin: user?.is("admin"),
        identityZoneAdmin: user?.is("IdentityZoneAdmin"),
      },
      // Redact sensitive information from the request headers
      request: {
        method: req?.method,
        url: req?.url,
        headers: {
          authorization: req?.headers?.authorization
            ? "Bearer [REDACTED]"
            : null,
          "content-type": req?.headers?.["content-type"],
          "user-agent": req?.headers?.["user-agent"],
        },
      },
    };
  }

  public token(req) {
    return cds.context?.user?.authInfo?.config?.jwt;
  }
}

export default AuthService;
