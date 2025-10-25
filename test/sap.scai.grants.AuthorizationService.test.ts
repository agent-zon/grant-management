import cds from '@sap/cds'

const { GET, POST, expect, axios } = cds.test (import.meta.dirname+'/..')
axios.defaults.auth = { username: 'alice', password: '' }

describe('OData APIs', () => {

  it('serves sap.scai.grants.AuthorizationService.AuthorizationRequests', async () => {
    const { data } = await GET `/oauth-server/sap.scai.grants.AuthorizationService.AuthorizationRequests ${{ params: { $select: 'ID,client_id' } }}`
    expect(data.value).to.containSubset([
      {"ID":"26625600-d3a6-4948-9503-28466a3c6444","client_id":"client_id-26625600"},
    ])
  })

  it('executes authorize', async () => {
    const { data } = await POST `/oauth-server/authorize ${
      {"request_uri":"request_uri-31501860","client_id":"client_id-31501860"}
    }`
    // TODO finish this test
    // expect(data.value).to...
  })
  it('executes par', async () => {
    const { data } = await POST `/oauth-server/par ${
      {"response_type":"response_type-23780808","client_id":"client_id-23780808","redirect_uri":"redirect_uri-23780808","scope":"scope-23780808","state":"state-23780808","code_challenge":"code_challenge-23780808","code_challenge_method":"code_challenge_method-23780808","grant_management_action":"grant_management_action-23780808","grant_id":"grant_id-23780808","authorization_details":"authorization_details-23780808","requested_actor":"requested_actor-23780808","subject_token_type":"subject_token_type-23780808","subject_token":"subject_token-23780808","subject":"subject-23780808"}
    }`
    // TODO finish this test
    // expect(data.value).to...
  })
  it('executes token', async () => {
    const { data } = await POST `/oauth-server/token ${
      {"grant_type":"grant_type-20071455","client_id":"client_id-20071455","code":"code-20071455","code_verifier":"code_verifier-20071455","redirect_uri":"redirect_uri-20071455"}
    }`
    // TODO finish this test
    // expect(data.value).to...
  })
  it('executes metadata', async () => {
    const { data } = await POST `/oauth-server/metadata ${
      {}
    }`
    // TODO finish this test
    // expect(data.value).to...
  })
})
