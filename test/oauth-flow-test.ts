import cds from '@sap/cds'

const {GET, POST, expect, axios} = cds.test(import.meta.dirname + '/..')
axios.defaults.auth = {username: 'alice', password: ''}

describe('full authorization oauth flow', () => {

    it('push-request', async () => {
        const {data: {request_uri}} = await POST`/oauth-server/par ${
            {
                "response_type": "code",
                "client_id": "client_id-123456",
                "redirect_uri": "https://client.example.com/callback",
                "scope": "openid profile",
                "state": "xyz",
                "code_challenge": "challenge",
                "code_challenge_method": "S256",
                "authorization_details": JSON.stringify([
                    {
                        "type": "urn:ietf:params:oauth:grant-type:uma-ticket",
                        "locations": ["https://resource.example.com/"],
                        "actions": ["read", "write"]
                    }
                ])
            }
        }`

        expect(request_uri).to.be.a('string')

        it('authorize', async () => {
            const {data: {authorization_code}} = await POST`/oauth-server/authorize ${
                {
                    "request_uri": request_uri,
                    "client_id": "client_id-123456"
                }
            }`
            
            expect(authorization_code).to.be.a('string')
            
            
            it('token', async () => {
                const {data: {access_token, id_token}} = await POST`/oauth-server/token ${
                    {
                        "grant_type": "authorization_code",
                        "client_id": "client_id-123456",
                        "code": authorization_code,
                        "code_verifier": "challenge",
                        "redirect_uri": "https://client.example.com/callback"
                    }
                }`
                
                expect(access_token).to.be.a('string')
                expect(id_token).to.be.a('string')
            })
        })
        
        


    })
})