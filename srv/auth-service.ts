const cds = require("@sap/cds");

class AuthService extends cds.ApplicationService {
  me(req) {
    const user = cds.context?.user;
    return {
      user: user?.id,
      scopes: user?.scopes,
      roles: user?.roles,
      is: {
        anonymous: user?.is?.("anonymous"),
        authenticated: user?.is?.("authenticated"),
        admin: user?.is?.("admin"),
      },
      request: {
        method: req?.method,
        url: req?.url,
      },
    };
  }
}

module.exports = AuthService;
