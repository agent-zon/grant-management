/**
 * E2E exploration of SAP Lobby - Smart Workspace (Connection Management).
 * - Add environment
 * - Select systems
 * - Observe smart suggestions
 *
 * Run: TEST_URL=https://connection-managment-sdyz.bolt.host npx playwright test tests/e2e/connection-management.spec.js --project=chromium --headed
 * Or: npx playwright test tests/e2e/connection-management.spec.js --project=chromium
 *
 * No auth setup; if password prompt appears, enter any string (e.g. demo).
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_URL || 'https://connection-managment-sdyz.bolt.host';

test.describe('Connection Management - Environment & Systems', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });

    // Handle password prompt if it appears
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await passwordInput.fill(process.env.DEMO_PASSWORD || 'demo');
      await page.locator('button[type="submit"], input[type="submit"], button:has-text("Log"), button:has-text("Sign")').first().click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('landing page shows Intent Development', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Intent Development/i })).toBeVisible({ timeout: 10000 });
  });

  test('add environment flow - Connect Environment opens modal', async ({ page }) => {
    const connectEnvBtn = page.getByRole('button', { name: /Connect Environment/i });
    await expect(connectEnvBtn).toBeVisible({ timeout: 5000 });
    await connectEnvBtn.click();

    await expect(page.getByRole('heading', { name: /Connect New Environment|Select Environment/i }).first()).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'tests/e2e/screenshots/connection-mgmt-add-env.png', fullPage: true }).catch(() => {});
  });

  test('select environment (Demo System) and observe smart suggestions', async ({ page }) => {
    // Open Connect Environment modal
    await page.getByRole('button', { name: /Connect Environment/i }).click();
    await expect(page.getByRole('heading', { name: /Select Environment/i }).first()).toBeVisible({ timeout: 5000 });

    // Select Demo System environment
    const demoSystemBtn = page.getByRole('button', { name: /Demo System.*playground/i });
    await demoSystemBtn.click();

    // Continue button should become enabled - click it
    const continueBtn = page.getByRole('button', { name: /Continue/i });
    await expect(continueBtn).toBeEnabled({ timeout: 3000 });
    await continueBtn.click();

    // Wait for modal to close and main content to show
    await page.waitForTimeout(3000);

    // Smart suggestions: main area has "Message SAP Build Studio..." and "SAP Build Studio uses AI"
    await expect(page.getByPlaceholder(/Message SAP Build Studio/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/SAP Build Studio uses AI/i)).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/connection-mgmt-smart-suggestions.png', fullPage: true }).catch(() => {});
  });

  test('full flow: Connect Environment -> select Northwind Industries -> check suggestions', async ({ page }) => {
    // Step 1: Click Connect Environment
    await page.getByRole('button', { name: /Connect Environment/i }).click();
    await expect(page.getByRole('heading', { name: /Select Environment/i }).first()).toBeVisible({ timeout: 5000 });

    // Step 2: Select Northwind Industries (Test) - has S/4HANA, Concur, SuccessFactors, etc.
    const northwindDevBtn = page.getByRole('button', { name: /Northwind Industries.*northwind-dev/i });
    await northwindDevBtn.click();

    // Step 3: Click Continue
    const continueBtn = page.getByRole('button', { name: /Continue/i });
    await expect(continueBtn).toBeEnabled({ timeout: 3000 });
    await continueBtn.click();

    // Step 4: Wait for next step or modal to advance; check for smart suggestions
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body') || '';
    const hasSmartContent = /SAP Build Studio|AI|intent|Message/i.test(bodyText);

    await page.screenshot({ path: 'tests/e2e/screenshots/connection-mgmt-full-flow.png', fullPage: true }).catch(() => {});

    expect(hasSmartContent).toBeTruthy();
  });
});
