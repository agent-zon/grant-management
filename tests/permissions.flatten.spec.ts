// @ts-check
import { test, expect } from '@playwright/test';
import axiosLib from 'axios';

test.describe('Permissions flattening - single grant flow', () => {
  test('PAR → Authorize → Consent → Token and verify Permissions', async ({}, testInfo) => {
    const baseURL = testInfo.project.use.baseURL || 'http://localhost:4004';
    const axios = axiosLib.create({ baseURL, auth: { username: 'alice', password: '' } });

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

    expect(parRes.data).toHaveProperty('request_uri');
    expect(parRes.data.request_uri).toMatch(/^urn:ietf:params:oauth:request_uri:/);
    const requestUri = parRes.data.request_uri;
    const requestId = requestUri.split(':').pop();

    // Authorize (consent page)
    const authPage = await axios.post(
      '/oauth-server/authorize',
      { request_uri: requestUri, client_id: 'test-client-basic' },
      { headers: { Accept: 'text/html' } }
    );
    expect(authPage.status).toBe(200);
    expect(typeof authPage.data).toBe('string');
    expect(authPage.data).toMatch(/Rich Authorization Request/);

    // Get grant id
    const reqResp = await axios.get(`/oauth-server/AuthorizationRequests(${requestId})`);
    const grantId = reqResp.data.grant_id;

    // Consent
    const consentResponse = await axios.put(
      `/oauth-server/AuthorizationRequests/${requestId}/consent`,
      {
        subject: 'alice',
        scope: 'openid devops',
        request_ID: requestId,
        grant_id: grantId,
        client_id: 'test-client-basic',
      },
      { maxRedirects: 0, headers: { Accept: 'text/html' } }
    );
    expect([301, 201]).toContain(consentResponse.status);

    // Token
    const tokenRes = await axios.post('/oauth-server/token', {
      grant_type: 'authorization_code',
      client_id: 'test-client-basic',
      code: requestId,
      code_verifier: 'test-challenge-basic',
      redirect_uri: 'https://client.example.com/callback',
    });
    expect(tokenRes.data).toHaveProperty('access_token');
    expect(tokenRes.data).toHaveProperty('grant_id');
    expect(tokenRes.data).toMatchObject({ token_type: 'Bearer', scope: 'openid devops' });

    // Verify Permissions flattening
    const permsRes = await axios.get(
      `/grants-management/Permissions?$filter=grant_id eq '${grantId}'`
    );
    const perms = permsRes.data?.value ?? permsRes.data;
    expect(Array.isArray(perms)).toBeTruthy();
    expect(perms.some((p) => p.attribute === 'type' && p.value === 'mcp')).toBeTruthy();
    expect(perms.some((p) => p.attribute === 'tool:metrics' && p.value === 'true')).toBeTruthy();
    expect(perms.some((p) => p.attribute === 'tool:logs' && p.value === 'true')).toBeTruthy();
    expect(perms.some((p) => p.attribute === 'tool:dashboard' && p.value === 'true')).toBeTruthy();
    expect(
      perms.some(
        (p) => p.attribute === 'location' && p.value === 'https://mcp.devops.example.com/analytics'
      )
    ).toBeTruthy();
  });
});
