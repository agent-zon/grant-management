/**
 * Playwright auth setup for policies-service E2E tests.
 * Performs IAS login with agently.io@gmail.com and saves storage state.
 *
 * Set TEST_PASSWORD env var for the password (e.g. export TEST_PASSWORD=yourpassword)
 * Run: TEST_PASSWORD=xxx npx playwright test --project=chromium
 */
import fs from 'fs';
import path from 'path';
import { test as setup } from '@playwright/test';

const AUTH_FILE = 'tests/e2e/.auth/user.json';
const TEST_USER = process.env.TEST_USER || 'agently.io@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

setup('authenticate', async ({ page }) => {
  const baseURL = process.env.TEST_URL || 'http://localhost:4004';
  const policiesUrl = `${baseURL.replace(/\/$/, '')}/admin/agents/view`;

  await page.goto(policiesUrl, { waitUntil: 'networkidle', timeout: 30000 });

  // Check if we hit IAS login (common SAP IAS selectors)
  const loginSelectors = [
    'input[name="j_username"]',
    'input[name="username"]',
    'input[name="email"]',
    'input[type="email"]',
    '#username',
    '#j_username',
  ];
  const passwordSelectors = [
    'input[name="j_password"]',
    'input[name="password"]',
    'input[type="password"]',
    '#password',
    '#j_password',
  ];

  let needsLogin = false;
  for (const sel of loginSelectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) {
        needsLogin = true;
        break;
      }
    } catch {
      // selector not found, try next
    }
  }

  if (needsLogin && TEST_PASSWORD) {
    const usernameInput = page.locator(
      'input[name="j_username"], input[name="username"], input[name="email"], input[type="email"], #username, #j_username'
    ).first();
    const passwordInput = page.locator(
      'input[name="j_password"], input[name="password"], input[type="password"], #password, #j_password'
    ).first();

    await usernameInput.fill(TEST_USER);
    await passwordInput.fill(TEST_PASSWORD);

    const submitBtn = page.locator(
      'button[type="submit"], input[type="submit"], button:has-text("Log On"), button:has-text("Sign in"), button:has-text("Login")'
    ).first();
    await submitBtn.click();

    // Wait for redirect back to app (AI Agent Policies header or policy panel)
    await page.waitForURL(/\/policies\/|localhost|stage\.kyma/, { timeout: 15000 }).catch(() => {});
    await page.waitForSelector('h1:has-text("AI Agent Policies"), #policy-panel, #agents-nav', { timeout: 10000 }).catch(() => {});
  } else if (needsLogin && !TEST_PASSWORD) {
    throw new Error('TEST_PASSWORD env var is required for IAS login. Set it: export TEST_PASSWORD=yourpassword');
  }

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
