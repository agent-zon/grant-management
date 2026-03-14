/**
 * Playwright E2E tests for policies-service.
 * Covers: agents list, edit, rules, save, refresh.
 *
 * Prerequisites:
 * - App router + CAP running (e.g. npm run serve, or hybrid:cds)
 * - For IAS: export TEST_PASSWORD=yourpassword
 *
 * Run:
 *   npm run test:e2e:policies
 *   TEST_URL=http://localhost:5000 TEST_PASSWORD=xxx npm run test:e2e:policies
 */
import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/e2e/.auth/user.json' });

const BASE = process.env.TEST_URL || 'http://localhost:4004';
const policiesBase = BASE.replace(/\/$/, '') + '/policies/AgentPolicies';

test.describe('Policies Service', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${policiesBase}/view`, { waitUntil: 'networkidle', timeout: 15000 });
  });

  test('shows agents list view', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('AI Agent Policies');
    await expect(page.locator('#agents-nav')).toBeVisible();
  });

  test('sidebar has agent filter', async ({ page }) => {
    const filter = page.locator('input[placeholder*="Filter"], input[type="search"]');
    await expect(filter).toBeVisible();
  });

  test('clicking agent loads edit panel', async ({ page }) => {
    const agentBtn = page.locator('#agents-nav button').first();
    const count = await agentBtn.count();
    if (count === 0) {
      test.skip();
      return;
    }
    await agentBtn.click();
    await expect(page.locator('#policy-panel').getByText('Policy Editor')).toBeVisible({ timeout: 8000 });
  });

  test('edit panel shows rules section', async ({ page }) => {
    const agentBtn = page.locator('#agents-nav button').first();
    if ((await agentBtn.count()) === 0) {
      test.skip();
      return;
    }
    await agentBtn.click();
    await page.waitForSelector('#policy-panel h2, #policy-panel .font-mono', { timeout: 5000 });
    await expect(page.locator('text=Access Policy Rules')).toBeVisible();
  });

  test('edit panel has save button', async ({ page }) => {
    const agentBtn = page.locator('#agents-nav button').first();
    if ((await agentBtn.count()) === 0) {
      test.skip();
      return;
    }
    await agentBtn.click();
    await page.waitForSelector('#policy-panel', { timeout: 5000 });
    await expect(page.locator('button:has-text("Save Policies")')).toBeVisible();
  });

  test('add rule shows new rule in list', async ({ page }) => {
    const agentBtn = page.locator('#agents-nav button').first();
    if ((await agentBtn.count()) === 0) {
      test.skip();
      return;
    }
    await agentBtn.click();
    await expect(page.locator('#policy-panel').getByText('Policy Editor')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#rules-section')).toBeVisible({ timeout: 5000 });

    const targetInput = page.locator('input[name="target"]');
    await targetInput.fill('mcp|e2e-test-server|E2E Test Server');

    await page.locator('button:has-text("+ Add Rule")').click();
    await expect(page.locator('#rules-section').getByText('E2E Test Server')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#rules-section').getByText('Allow')).toBeVisible();
  });

  test('save rule shows success toast', async ({ page }) => {
    const agentBtn = page.locator('#agents-nav button').first();
    if ((await agentBtn.count()) === 0) {
      test.skip();
      return;
    }
    await agentBtn.click();
    await expect(page.locator('#policy-panel').getByText('Policy Editor')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#rules-section')).toBeVisible({ timeout: 5000 });

    const targetInput = page.locator('input[name="target"]');
    await targetInput.fill('mcp|e2e-save-test|E2E Save Test');

    await page.locator('button:has-text("+ Add Rule")').click();
    await expect(page.locator('#rules-section').getByText('E2E Save Test')).toBeVisible({ timeout: 5000 });

    await page.locator('button:has-text("Save Policies")').click();
    await expect(page.locator('#save-toast')).toContainText('Committed to Git', { timeout: 10000 });
  });

  test('remove rule removes from list', async ({ page }) => {
    const agentBtn = page.locator('#agents-nav button').first();
    if ((await agentBtn.count()) === 0) {
      test.skip();
      return;
    }
    await agentBtn.click();
    await expect(page.locator('#policy-panel').getByText('Policy Editor')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#rules-section')).toBeVisible({ timeout: 5000 });

    const targetInput = page.locator('input[name="target"]');
    await targetInput.fill('mcp|e2e-remove-test|E2E Remove Test');

    await page.locator('button:has-text("+ Add Rule")').click();
    await expect(page.locator('#rules-section').getByText('E2E Remove Test')).toBeVisible({ timeout: 5000 });

    const ruleRow = page.locator('#rules-section div.group:has-text("E2E Remove Test")');
    await ruleRow.hover();
    await ruleRow.locator('button[title="Remove rule"]').click();

    await expect(page.locator('#rules-section').getByText('E2E Remove Test')).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('Policies direct URL', () => {
  test('view URL loads', async ({ page }) => {
    await page.goto(`${policiesBase}/view`, { waitUntil: 'networkidle', timeout: 15000 });
    await expect(page.locator('h1')).toContainText('AI Agent Policies');
  });

  test('edit redirect works for agent', async ({ page }) => {
    await page.goto(`${policiesBase}/A532408/edit`, { waitUntil: 'networkidle', timeout: 15000 });
    await expect(page).toHaveURL(/versions.*edit/);
    await expect(page.locator('#policy-panel >> text=Policy Editor')).toBeVisible();
  });
});
