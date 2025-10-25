import cds from '@sap/cds'

const { GET, POST, expect, axios } = cds.test (import.meta.dirname+'/..')
axios.defaults.auth = { username: 'alice', password: '' }

describe('OData APIs', () => {

  it('serves sap.scai.grants.GrantsManagementService.AuthorizationDetail', async () => {
    const { data } = await GET `/grants-management/sap.scai.grants.GrantsManagementService.AuthorizationDetail ${{ params: { $select: 'ID,type' } }}`
    expect(data.value).to.containSubset([
      {"ID":"80808388-cf9c-48e6-9be8-9412eeb40a15","type":"type-8080838"},
    ])
  })

})
