import cds from "@sap/cds";

class AuthService extends cds.ApplicationService {
  public me(req: cds.Request) {
    console.log("cds.context.user", cds.context?.user);

    // Get user from CDS context (this is the authenticated user)
    const user = cds.context?.user;

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
    };
  }
}

export default AuthService;
