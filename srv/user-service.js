const cds = require('@sap/cds')

class UserService extends cds.ApplicationService {
    async me(req) {
         console.log("cds.context.user", cds.context?.user);
        
        // Get user from CDS context (this is the authenticated user)
        const user = cds.context?.user;


        return {
            correlationId: user.authInfo?.config?.correlationId,
            jwt: user.authInfo?.config?.jwt,
            skipValidation: user.authInfo?.config?.skipValidation,
            tokenDecodeCache: user.authInfo?.config?.tokenDecodeCache,
            user: user?.id,
            claims: user?.attr,
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

module.exports = UserService