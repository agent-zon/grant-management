// @ts-check
import { test, expect } from '@playwright/test';
import axiosLib from 'axios';

test.describe('Permissions flattening - multiple grants', () => {
  test('create two grants and verify independent Permissions rows', async ({}, testInfo) => {
    const baseURL = testInfo.project.use.baseURL || 'http://localhost:4004';
    const axios = axiosLib.create({ baseURL, auth: { username: 'alice', password: '' } });

    // Grant A
    const parA = await axios.post('/oauth-server/par', {
      response_type: 'code',
      client_id: 'client-a',
      redirect_uri: 'https://client.example.com/callback',
      scope: 'openid analytics_read',
      state: 'state-a',
      code_challenge: 'challenge-a',
      code_challenge_method: 'S256',
      authorization_details: JSON.stringify([
        {
          type: 'mcp',
          server: 'analytics-mcp',
          transport: 'sse',
          tools: { metrics: { essential: true } },
          actions: ['read'],
          locations: ['analytics'],
        },
      ]),
    });
    const requestIdA = parA.data.request_uri.split(':').pop();
    await axios.post(
      '/oauth-server/authorize',
      { request_uri: parA.data.request_uri, client_id: 'client-a' },
      { headers: { Accept: 'text/html' } }
    );
    const reqA = await axios.get(`/oauth-server/AuthorizationRequests(${requestIdA})`);
    const grantA = reqA.data.grant_id;
    await axios.put(
      `/oauth-server/AuthorizationRequests/${requestIdA}/consent`,
      {
        subject: 'alice',
        scope: 'openid analytics_read',
        request_ID: requestIdA,
        grant_id: grantA,
        client_id: 'client-a',
      },
      { maxRedirects: 0, headers: { Accept: 'text/html' } }
    );
    await axios.post('/oauth-server/token', {
      grant_type: 'authorization_code',
      client_id: 'client-a',
      code: requestIdA,
      code_verifier: 'challenge-a',
      redirect_uri: 'https://client.example.com/callback',
    });

    // Grant B
    const parB = await axios.post('/oauth-server/par', {
      response_type: 'code',
      client_id: 'client-b',
      redirect_uri: 'https://client.example.com/callback',
      scope: 'openid workspace.fs',
      state: 'state-b',
      code_challenge: 'challenge-b',
      code_challenge_method: 'S256',
      authorization_details: JSON.stringify([
        { type: 'fs', roots: ['/home/workspace/logs'], permissions: { read: { essential: true }, write: null } },
      ]),
    });
    const requestIdB = parB.data.request_uri.split(':').pop();
    await axios.post(
      '/oauth-server/authorize',
      { request_uri: parB.data.request_uri, client_id: 'client-b' },
      { headers: { Accept: 'text/html' } }
    );
    const reqB = await axios.get(`/oauth-server/AuthorizationRequests(${requestIdB})`);
    const grantB = reqB.data.grant_id;
    await axios.put(
      `/oauth-server/AuthorizationRequests/${requestIdB}/consent`,
      {
        subject: 'alice',
        scope: 'openid workspace.fs',
        request_ID: requestIdB,
        grant_id: grantB,
        client_id: 'client-b',
      },
      { maxRedirects: 0, headers: { Accept: 'text/html' } }
    );
    await axios.post('/oauth-server/token', {
      grant_type: 'authorization_code',
      client_id: 'client-b',
      code: requestIdB,
      code_verifier: 'challenge-b',
      redirect_uri: 'https://client.example.com/callback',
    });

    // Verify Permissions per grant
    const resA = await axios.get(`/grants-management/Permissions?$filter=grant_id eq '${grantA}'`);
    const resB = await axios.get(`/grants-management/Permissions?$filter=grant_id eq '${grantB}'`);
    const permsA = resA.data?.value ?? resA.data;
    const permsB = resB.data?.value ?? resB.data;

    expect(permsA.some((p) => p.attribute === 'tool:metrics' && p.value === 'true')).toBeTruthy();
    expect(permsB.some((p) => p.attribute === 'permission:read' && p.value === 'true')).toBeTruthy();
    expect(permsA.some((p) => p.attribute === 'root' && p.value === '/home/workspace/logs')).toBeFalsy();
    expect(permsB.some((p) => p.attribute === 'tool:metrics' && p.value === 'true')).toBeFalsy();
  });
});

// @ts-nocheck
import cds from "@sap/cds";
import { test, expect } from "@playwright/test";

const projectRoot = new URL("..", import.meta.url).pathname;

async function submitConsent(PUT: any, { request_ID, ...data }: any) {
  return await PUT(
    `/oauth-server/AuthorizationRequests/${request_ID}/consent`,
    data,
    {
      maxRedirects: 0,
      headers: { Accept: "text/html" },
      validateStatus: (status: number) => status === 301 || status === 201,
    }
  );
}

async function getGrantIdFromRequest(axios: any, requestId: string): Promise<string> {
  const response = await axios.get(`/oauth-server/AuthorizationRequests(${requestId})`);
  return response.data.grant_id;
}

test.describe("Permissions flattening - multiple grants", () => {
  test("create two grants and verify independent Permissions rows", async () => {
    const { PUT, GET, POST, axios } = cds.test(projectRoot);
    axios.defaults.auth = { username: "alice", password: "" };

    // Grant A
    const { data: parA } = await POST`/oauth-server/par ${{
      response_type: "code",
      client_id: "client-a",
      redirect_uri: "https://client.example.com/callback",
      scope: "openid analytics_read",
      state: "state-a",
      code_challenge: "challenge-a",
      code_challenge_method: "S256",
      authorization_details: JSON.stringify([
        {
          type: "mcp",
          server: "analytics-mcp",
          transport: "sse",
          tools: { metrics: { essential: true } },
          actions: ["read"],
          locations: ["analytics"],
        },
      ]),
    }}`;
    const requestIdA = parA.request_uri.split(":").pop()!;
    await submitConsent(PUT, {
      subject: "alice",
      scope: "openid analytics_read",
      request_ID: requestIdA,
      authorization_details: [
        {
          server: "analytics-mcp",
          tools: { metrics: true },
          type: "mcp",
          transport: "sse",
          locations: ["https://mcp.example.com/analytics"],
        },
      ],
      grant_id: await getGrantIdFromRequest(axios, requestIdA),
      client_id: "client-a",
    });
    const codeA = requestIdA;
    const { data: tokenA } = await POST`/oauth-server/token ${{
      grant_type: "authorization_code",
      client_id: "client-a",
      code: codeA,
      code_verifier: "challenge-a",
      redirect_uri: "https://client.example.com/callback",
    }}`;

    // Grant B
    const { data: parB } = await POST`/oauth-server/par ${{
      response_type: "code",
      client_id: "client-b",
      redirect_uri: "https://client.example.com/callback",
      scope: "openid workspace.fs",
      state: "state-b",
      code_challenge: "challenge-b",
      code_challenge_method: "S256",
      authorization_details: JSON.stringify([
        {
          type: "fs",
          roots: ["/home/workspace/logs"],
          permissions: { read: { essential: true }, write: null },
        },
      ]),
    }}`;
    const requestIdB = parB.request_uri.split(":").pop()!;
    await submitConsent(PUT, {
      subject: "alice",
      scope: "openid workspace.fs",
      request_ID: requestIdB,
      authorization_details: [
        {
          type: "fs",
          roots: ["/home/workspace/logs"],
          permissions_read: true,
          permissions_write: false,
        },
      ],
      grant_id: await getGrantIdFromRequest(axios, requestIdB),
      client_id: "client-b",
    });
    const codeB = requestIdB;
    const { data: tokenB } = await POST`/oauth-server/token ${{
      grant_type: "authorization_code",
      client_id: "client-b",
      code: codeB,
      code_verifier: "challenge-b",
      redirect_uri: "https://client.example.com/callback",
    }}`;

    // Verify independent permissions
    const { data: permsA } = await GET(
      `/grants-management/Permissions?$filter=grant_id eq '${tokenA.grant_id}'`
    );
    const { data: permsB } = await GET(
      `/grants-management/Permissions?$filter=grant_id eq '${tokenB.grant_id}'`
    );

    expect(permsA.some((p: any) => p.attribute === "tool:metrics" && p.value === "true")).toBeTruthy();
    expect(permsB.some((p: any) => p.attribute === "permission:read" && p.value === "true")).toBeTruthy();

    // Ensure no unintended cross-contamination between grants
    expect(
      permsA.some((p: any) => p.attribute === "root" && p.value === "/home/workspace/logs")
    ).toBeFalsy();
    expect(
      permsB.some((p: any) => p.attribute === "tool:metrics" && p.value === "true")
    ).toBeFalsy();
  });
});
