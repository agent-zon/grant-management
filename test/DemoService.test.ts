import cds from '@sap/cds'

const { GET, POST, expect, axios } = cds.test (import.meta.dirname+'/..')
axios.defaults.auth = { username: 'alice', password: '' }

describe('OData APIs', () => {

 
  it('executes request', async () => {
    const { data } = await POST `/demo/request ${
      {"config":"config-12289760"}
    }`
    // TODO finish this test
    // expect(data.value).to...
  })
  it('executes navbar', async () => {
    const { data } = await GET `/demo/navbar ${
      {"grant_id":"grant_id-5228160","event":"event-5228160"}
    }`
    // TODO finish this test
    // expect(data.value).to...
  })
  it('executes main', async () => {
    const { data } = await GET `/demo/main ${
      {}
    }`
    // TODO finish this test
    // expect(data.value).to...
  })
  it('executes index', async () => {
    const { data } = await GET `/demo/index ${
      {}
    }`
    // TODO finish this test
    // expect(data.value).to...
  })
  it('executes callback', async () => {
    const { data } = await POST `/demo/callback ${
      {"code":"code-6520826","code_verifier":"code_verifier-6520826","redirect_uri":"redirect_uri-6520826"}
    }`
    // TODO finish this test
    // expect(data.value).to...
  })

  it('executes elevate', async () => {
    const { data } = await POST `/demo/elevate ${
      {"grant_id":"grant_id-2163908"}
    }`
    // TODO finish this test
    // expect(data.value).to...
  })
  it('executes event_handlers', async () => {
    const { data } = await POST `/demo/event_handlers ${
      {}
    }`
    // TODO finish this test
    // expect(data.value).to...
  })
  it('executes send_event', async () => {
    const { data } = await POST `/demo/send_event ${
      {"type":"type-7146156","grant_id":"grant_id-7146156"}
    }`
    // TODO finish this test
    // expect(data.value).to...
  })
})
