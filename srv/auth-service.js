import cds from "@sap/cds";

class UserService extends cds.ApplicationService {
    async me(req) {
         console.log("cds.context.user", cds.context?.user);
        
        // Get user from CDS context (this is the authenticated user)
        const user = cds.context?.user;


        return {
            correlationId: user.authInfo?.config?.correlationId,
            jwt: user.authInfo?.config?.jwt,
            sid: user.authInfo?.config?.sid,
            skipValidation: user.authInfo?.config?.skipValidation,
            tokenDecodeCache: user.authInfo?.config?.tokenDecodeCache,
            user: user?.id,
            claims: user?.attr,
            scopes: user?.scopes,
            roles: user?.roles,
            authInfo: user?.authInfo,
            is: {
                anonymous: user?.is('anonymous'),
                authenticated: user?.is('authenticated'),
                anyRole: user?.is('any-role'),
                admin: user?.is('admin'),
                identityZoneAdmin: user?.is('IdentityZoneAdmin')
            },
            // Redact sensitive information from the request headers
            request: {
                method: req?.method,
                url: req?.url,
                headers: {
                    authorization: req?.headers?.authorization ? 'Bearer [REDACTED]' : null,
                    'content-type': req?.headers?.['content-type'],
                    'user-agent': req?.headers?.['user-agent']
                }
            }
        };
    }
}

export default UserService;