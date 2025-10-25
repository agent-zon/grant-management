// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Grant Management API', () => {
  const authHeaders = {
    'Authorization': 'Bearer demo-token'
  };

  test('health endpoint returns healthy status', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.version).toBe('2.0.0-ssr');
  });

  test('grants API returns empty array initially', async ({ request }) => {
    const response = await request.get('/api/grants', { headers: authHeaders });
    expect(response.ok()).toBeTruthy();
    
    const grants = await response.json();
    expect(Array.isArray(grants)).toBeTruthy();
  });

  test('can create a new grant', async ({ request }) => {
    const grantData = {
      user_id: 'test-user',
      scope: 'tools:read tools:write',
      session_id: 'test-session-123',
      workload_id: 'test-workload-456'
    };

    const response = await request.post('/api/grants', {
      headers: authHeaders,
      data: grantData
    });
    
    expect(response.ok()).toBeTruthy();
    const grant = await response.json();
    
    expect(grant.id).toBeDefined();
    expect(grant.user_id).toBe(grantData.user_id);
    expect(grant.scope).toBe(grantData.scope);
    expect(grant.session_id).toBe(grantData.session_id);
    expect(grant.workload_id).toBe(grantData.workload_id);
    expect(grant.status).toBe('active');
  });

  test('can retrieve created grant', async ({ request }) => {
    // First create a grant
    const grantData = {
      user_id: 'test-user-2',
      scope: 'data:export',
      session_id: 'test-session-456'
    };

    const createResponse = await request.post('/api/grants', {
      headers: authHeaders,
      data: grantData
    });
    
    const createdGrant = await createResponse.json();
    
    // Then retrieve it
    const getResponse = await request.get(`/api/grants/${createdGrant.id}`, {
      headers: authHeaders
    });
    
    expect(getResponse.ok()).toBeTruthy();
    const retrievedGrant = await getResponse.json();
    
    expect(retrievedGrant.id).toBe(createdGrant.id);
    expect(retrievedGrant.scope).toBe(grantData.scope);
  });

  test('can revoke a grant', async ({ request }) => {
    // First create a grant
    const grantData = {
      user_id: 'test-user-3',
      scope: 'system:admin',
      session_id: 'test-session-789'
    };

    const createResponse = await request.post('/api/grants', {
      headers: authHeaders,
      data: grantData
    });
    
    const createdGrant = await createResponse.json();
    
    // Then revoke it
    const deleteResponse = await request.delete(`/api/grants/${createdGrant.id}`, {
      headers: authHeaders
    });
    
    expect(deleteResponse.status()).toBe(204);
    
    // Verify it's revoked
    const getResponse = await request.get(`/api/grants/${createdGrant.id}`, {
      headers: authHeaders
    });
    
    const revokedGrant = await getResponse.json();
    expect(revokedGrant.status).toBe('revoked');
  });

  test('can filter grants by session', async ({ request }) => {
    const sessionId = 'test-session-filter-123';
    
    // Create grants with specific session
    await request.post('/api/grants', {
      headers: authHeaders,
      data: {
        user_id: 'test-user-filter-1',
        scope: 'tools:read',
        session_id: sessionId
      }
    });

    await request.post('/api/grants', {
      headers: authHeaders,
      data: {
        user_id: 'test-user-filter-2',
        scope: 'tools:write',
        session_id: 'different-session'
      }
    });

    // Filter by session
    const response = await request.get(`/api/grants?session_id=${sessionId}`, {
      headers: authHeaders
    });
    
    const grants = await response.json();
    expect(grants.length).toBeGreaterThan(0);
    grants.forEach(grant => {
      expect(grant.session_id).toBe(sessionId);
    });
  });

  test('requires authentication', async ({ request }) => {
    const response = await request.get('/api/grants');
    expect(response.status()).toBe(401);
    
    const error = await response.json();
    expect(error.error).toBe('unauthorized');
  });

  test('returns 404 for non-existent grant', async ({ request }) => {
    const response = await request.get('/api/grants/non-existent-id', {
      headers: authHeaders
    });
    
    expect(response.status()).toBe(404);
    const error = await response.json();
    expect(error.error).toBe('not_found');
  });
});

test.describe('Grant Management UI', () => {
  test('grants page loads successfully', async ({ page }) => {
    await page.goto('/grants');
    
    await expect(page.locator('h1')).toContainText('Grant Management Dashboard');
    await expect(page.locator('text=Live Data from SQLite')).toBeVisible();
    await expect(page.locator('text=View API Documentation')).toBeVisible();
  });

  test('shows grants statistics', async ({ page }) => {
    await page.goto('/grants');
    
    // Check that statistics are displayed
    await expect(page.locator('h3:has-text("Total Grants")')).toBeVisible();
    await expect(page.locator('h3:has-text("Active Grants")')).toBeVisible();
    await expect(page.locator('h3:has-text("Revoked Grants")')).toBeVisible();
  });

  test('API documentation link works', async ({ page }) => {
    await page.goto('/grants');
    
    const docLink = page.locator('a[href="/api-docs"]').first();
    await expect(docLink).toBeVisible();
    
    await docLink.click();
    await expect(page).toHaveURL('/api-docs/');
  });
});
