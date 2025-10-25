import cds from '@sap/cds'

const { GET, POST, expect, axios } = cds.test (import.meta.dirname+'/..')
axios.defaults.auth = { username: 'alice', password: '' }

describe('OData APIs', () => {

   

  it('executes me', async () => {
    const { data } = await POST `/auth/me ${
      {}
    }`
    // TODO finish this test
    // expect(data.value).to...
  })
})
