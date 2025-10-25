import cds from '@sap/cds';

async function main() {
  const { PUT, GET, POST, axios } = cds.test(new URL('..', import.meta.url).pathname);
  axios.defaults.auth = { username: 'alice', password: '' };

  // PAR
  const { data: par } = await POST`/oauth-server/par ${{
    response_type: 'code',
    client_id: 'test-client-basic',
    redirect_uri: 'https://client.example.com/callback',
    scope: 'openid devops',
    state: 'random-state-xyz',
    code_challenge: 'test-challenge-basic',
    code_challenge_method: 'S256',
    authorization_details: JSON.stringify([
      {
        type: 'mcp',
        server: 'devops-mcp-server',
        transport: 'sse',
        tools: {
          metrics: { essential: true },
          logs: { essential: false },
          dashboard: { essential: false },
        },
        actions: ['read', 'query'],
        locations: ['analytics'],
      },
    ]),
  }}`;

  if (!par?.request_uri) throw new Error('PAR failed');
  const requestUri = par.request_uri;
  const requestId = requestUri.split(':').pop();

  // Authorize Page
  const authPage = await axios.post(
    '/oauth-server/authorize',
    { request_uri: requestUri, client_id: 'test-client-basic' },
    { headers: { Accept: 'text/html' } }
  );
  if (authPage.status !== 200) throw new Error('Authorize page failed');

  // Consent
  const reqResp = await axios.get(`/oauth-server/AuthorizationRequests(${requestId})`);
  const grantId = reqResp.data.grant_id;

  const consentResp = await PUT(
    `/oauth-server/AuthorizationRequests/${requestId}/consent`,
    {
      subject: 'alice',
      scope: 'openid devops',
      request_ID: requestId,
      authorization_details: [
        {
          server: 'devops-mcp-server',
          tools: { metrics: true, logs: true, dashboard: true },
          type: 'mcp',
          transport: 'sse',
          locations: ['https://mcp.devops.example.com/analytics'],
        },
      ],
      grant_id: grantId,
      client_id: 'test-client-basic',
    },
    { maxRedirects: 0, headers: { Accept: 'text/html' }, validateStatus: (s) => s === 301 || s === 201 }
  );
  if (consentResp.status !== 301) throw new Error('Consent failed');

  // Token
  const { data: token } = await POST`/oauth-server/token ${{
    grant_type: 'authorization_code',
    client_id: 'test-client-basic',
    code: requestId,
    code_verifier: 'test-challenge-basic',
    redirect_uri: 'https://client.example.com/callback',
  }}`;
  if (!token?.grant_id) throw new Error('Token exchange failed');

  // Permissions Query
  const { data: perms } = await GET(`/grants-management/Permissions?$filter=grant_id eq '${grantId}'`);
  if (!Array.isArray(perms)) throw new Error('Permissions query failed');
  const checks = [
    perms.some((p) => p.attribute === 'type' && p.value === 'mcp'),
    perms.some((p) => p.attribute === 'tool:metrics' && p.value === 'true'),
    perms.some((p) => p.attribute === 'tool:logs' && p.value === 'true'),
    perms.some((p) => p.attribute === 'tool:dashboard' && p.value === 'true'),
    perms.some(
      (p) => p.attribute === 'location' && p.value === 'https://mcp.devops.example.com/analytics'
    ),
  ];
  if (checks.some((ok) => !ok)) throw new Error('Flattened permissions missing expected rows');

  console.log('✅ Permissions flattening verified for grant', grantId);
}

main().catch((e) => {
  console.error('❌ Check failed:', e?.message || e);
  process.exit(1);
});
