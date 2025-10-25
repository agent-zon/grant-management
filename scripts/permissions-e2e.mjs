import { spawn } from 'node:child_process';
import axios from 'axios';

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await axios.get(url, { timeout: 1000 });
      if (res.status === 200) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Server did not become healthy in time');
}

async function run() {
  const port = process.env.PORT || '4100';
  const proc = spawn('npx', ['cds-tsx', 'serve', '--port', port], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, BACKFILL_PERMISSIONS: 'false' },
  });

  const baseURL = `http://localhost:${port}`;
  axios.defaults.baseURL = baseURL;
  axios.defaults.auth = { username: 'alice', password: '' };

  try {
    await waitForServer(`${baseURL}/-/cds/healthz`, 30000);

    // PAR
    const parRes = await axios.post('/oauth-server/par', {
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
    const pageRes = await axios.post(
      '/oauth-server/authorize',
      { request_uri: requestUri, client_id: 'test-client-basic' },
      { headers: { Accept: 'text/html' } }
    );
    if (pageRes.status !== 200) throw new Error('Authorize page failed');

    // Get grant id
    const reqRes = await axios.get(`/oauth-server/AuthorizationRequests(${requestId})`);
    const grantId = reqRes.data.grant_id;

    // Consent
    const consentRes = await axios.put(
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
    if (consentRes.status !== 301) throw new Error('Consent failed');

    // Token
    const tokenRes = await axios.post('/oauth-server/token', {
      grant_type: 'authorization_code',
      client_id: 'test-client-basic',
      code: requestId,
      code_verifier: 'test-challenge-basic',
      redirect_uri: 'https://client.example.com/callback',
    });
    if (!tokenRes.data?.grant_id) throw new Error('Token exchange failed');

    // Permissions
    const perms = await axios.get(
      `/grants-management/Permissions?$filter=grant_id eq '${grantId}'`
    );
    const p = perms.data;
    const checks = [
      p.some((r) => r.attribute === 'type' && r.value === 'mcp'),
      p.some((r) => r.attribute === 'tool:metrics' && r.value === 'true'),
      p.some((r) => r.attribute === 'tool:logs' && r.value === 'true'),
      p.some((r) => r.attribute === 'tool:dashboard' && r.value === 'true'),
      p.some((r) => r.attribute === 'location' && r.value === 'https://mcp.devops.example.com/analytics'),
    ];
    if (checks.some((ok) => !ok)) throw new Error('Flattened permissions missing expected rows');

    console.log('✅ E2E permissions flattening verified');
  } finally {
    proc.kill('SIGINT');
  }
}

run().catch((e) => {
  console.error('❌ E2E failed:', e?.message || e);
  process.exit(1);
});
