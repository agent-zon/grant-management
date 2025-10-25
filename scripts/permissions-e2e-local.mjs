import axios from 'axios';

async function run() {
  const baseURL = process.env.BASE_URL || 'http://localhost:4004';
  const client = axios.create({ baseURL, auth: { username: 'alice', password: '' } });

  // PAR
  const parRes = await client.post('/oauth-server/par', {
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
  });
  if (!parRes.data?.request_uri) throw new Error('PAR failed');
  const requestUri = parRes.data.request_uri;
  const requestId = requestUri.split(':').pop();

  // Authorize page
  await client.post(
    '/oauth-server/authorize',
    { request_uri: requestUri, client_id: 'test-client-basic' },
    { headers: { Accept: 'text/html' } }
  );

  // Get grant id
  const reqRes = await client.get(`/oauth-server/AuthorizationRequests(${requestId})`);
  const grantId = reqRes.data.grant_id;

  // Consent
  const consentRes = await client.put(
    `/oauth-server/AuthorizationRequests/${requestId}/consent`,
    {
      subject: 'alice',
      scope: 'openid devops',
      request_ID: requestId,
      grant_id: grantId,
    },
    { maxRedirects: 0, headers: { Accept: 'text/html' }, validateStatus: (s) => s === 301 || s === 302 || s === 201 }
  );
  if (![301,302,201].includes(consentRes.status)) throw new Error('Consent failed');

  // Token
  const tokenRes = await client.post('/oauth-server/token', {
    grant_type: 'authorization_code',
    client_id: 'test-client-basic',
    code: requestId,
    code_verifier: 'test-challenge-basic',
    redirect_uri: 'https://client.example.com/callback',
  });
  if (!tokenRes.data?.grant_id) throw new Error('Token exchange failed');

  // Permissions
  const permsRes = await client.get(`/grants-management/Permissions?$filter=grant_id eq '${grantId}'`);
  const p = permsRes.data;
  const checks = [
    p.some((r) => r.attribute === 'type' && r.value === 'mcp'),
    p.some((r) => r.attribute === 'tool:metrics' && r.value === 'true'),
    p.some((r) => r.attribute === 'tool:logs' && r.value === 'true'),
    p.some((r) => r.attribute === 'tool:dashboard' && r.value === 'true'),
    p.some((r) => r.attribute === 'location' && r.value === 'https://mcp.devops.example.com/analytics'),
  ];
  if (checks.some((ok) => !ok)) throw new Error('Flattened permissions missing expected rows');

  console.log('✅ Local E2E permissions flattening verified for grant', grantId);
}

run().catch((e) => { console.error('❌ Local E2E failed:', e?.message || e); process.exit(1); });
