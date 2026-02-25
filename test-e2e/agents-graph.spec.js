// @ts-check
import { test, expect } from '@playwright/test';

test.describe('AgentsGraphPage_pageLoad_rendersCorrectly', () => {

  test('AgentsGraphPage_navigateToAgents_showsPageWithHorizonTheme', async ({ page }) => {
    await page.goto('/agents');
    await expect(page.locator('.horizon-theme')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Agent Permissions');
  });

  test('AgentsGraphPage_pageLoad_showsAgentDropdown', async ({ page }) => {
    await page.goto('/agents');
    const dropdown = page.locator('select[name="actor"]');
    await expect(dropdown).toBeVisible();
    await expect(dropdown.locator('option').first()).toContainText('Select an agent');
  });

  test('AgentsGraphPage_noAgentSelected_showsEmptyState', async ({ page }) => {
    await page.goto('/agents');
    await expect(page.locator('text=Select an agent')).toBeVisible();
    await expect(page.locator('.react-flow')).not.toBeVisible();
  });

});

test.describe('AgentsGraphPage_agentSelection_showsGraph', () => {

  test('AgentsGraphPage_selectAgent_graphAppearsWithNodes', async ({ page }) => {
    await page.goto('/agents');
    const dropdown = page.locator('select[name="actor"]');

    const options = dropdown.locator('option');
    const optionCount = await options.count();
    if (optionCount > 1) {
      await dropdown.selectOption({ index: 1 });
      await expect(page.locator('.react-flow')).toBeVisible();
    }
  });

  test('AgentsGraphPage_selectAgent_agentNodeVisibleAtCenter', async ({ page }) => {
    await page.goto('/agents');
    const dropdown = page.locator('select[name="actor"]');
    const options = dropdown.locator('option');
    const optionCount = await options.count();
    if (optionCount > 1) {
      await dropdown.selectOption({ index: 1 });
      await expect(page.locator('[data-testid="agent-node"]')).toBeVisible();
    }
  });

  test('AgentsGraphPage_selectAgent_resourceNodesVisible', async ({ page }) => {
    await page.goto('/agents');
    const dropdown = page.locator('select[name="actor"]');
    const options = dropdown.locator('option');
    const optionCount = await options.count();
    if (optionCount > 1) {
      await dropdown.selectOption({ index: 1 });
      await expect(page.locator('.react-flow')).toBeVisible();
      const resourceNodes = page.locator('[data-testid="resource-node"]');
      await expect(resourceNodes.first()).toBeVisible();
    }
  });

  test('AgentsGraphPage_selectAgent_urlUpdatesWithActorParam', async ({ page }) => {
    await page.goto('/agents');
    const dropdown = page.locator('select[name="actor"]');
    const options = dropdown.locator('option');
    const optionCount = await options.count();
    if (optionCount > 1) {
      await dropdown.selectOption({ index: 1 });
      await expect(page).toHaveURL(/\?actor=/);
    }
  });

});

test.describe('AgentsGraphPage_resourceNodeTypes_showCorrectIcons', () => {

  test('ResourceNode_mcpType_showsMcpBadge', async ({ page }) => {
    await page.goto('/agents');
    const dropdown = page.locator('select[name="actor"]');
    const options = dropdown.locator('option');
    const optionCount = await options.count();
    if (optionCount > 1) {
      await dropdown.selectOption({ index: 1 });
      await expect(page.locator('.react-flow')).toBeVisible();
      const mcpBadges = page.locator('[data-testid="resource-node"] [data-type="mcp_server"]');
      if (await mcpBadges.count() > 0) {
        await expect(mcpBadges.first()).toContainText('MCP');
      }
    }
  });

  test('ResourceNode_eachType_showsTypeBadge', async ({ page }) => {
    await page.goto('/agents');
    const dropdown = page.locator('select[name="actor"]');
    const options = dropdown.locator('option');
    const optionCount = await options.count();
    if (optionCount > 1) {
      await dropdown.selectOption({ index: 1 });
      await expect(page.locator('.react-flow')).toBeVisible();
      const nodes = page.locator('[data-testid="resource-node"]');
      const count = await nodes.count();
      for (let i = 0; i < count; i++) {
        const badge = nodes.nth(i).locator('[data-testid="type-badge"]');
        await expect(badge).toBeVisible();
        const text = await badge.textContent();
        expect(['MCP', 'FS', 'DB', 'API']).toContain(text);
      }
    }
  });

});

test.describe('AgentsGraphPage_clickResourceNode_showsDetailPanel', () => {

  test('DetailPanel_clickResource_panelSlidesIn', async ({ page }) => {
    await page.goto('/agents');
    const dropdown = page.locator('select[name="actor"]');
    const options = dropdown.locator('option');
    const optionCount = await options.count();
    if (optionCount > 1) {
      await dropdown.selectOption({ index: 1 });
      await expect(page.locator('.react-flow')).toBeVisible();

      const resourceNode = page.locator('[data-testid="resource-node"]').first();
      await resourceNode.click();

      await expect(page.locator('[data-testid="detail-panel"]')).toBeVisible();
    }
  });

  test('DetailPanel_clickResource_showsAuthorizationDetails', async ({ page }) => {
    await page.goto('/agents');
    const dropdown = page.locator('select[name="actor"]');
    const options = dropdown.locator('option');
    const optionCount = await options.count();
    if (optionCount > 1) {
      await dropdown.selectOption({ index: 1 });
      await expect(page.locator('.react-flow')).toBeVisible();

      const resourceNode = page.locator('[data-testid="resource-node"]').first();
      await resourceNode.click();

      const panel = page.locator('[data-testid="detail-panel"]');
      await expect(panel).toBeVisible();
      await expect(panel.locator('[data-testid="auth-detail-card"]').first()).toBeVisible();
    }
  });

  test('DetailPanel_clickClose_panelDisappears', async ({ page }) => {
    await page.goto('/agents');
    const dropdown = page.locator('select[name="actor"]');
    const options = dropdown.locator('option');
    const optionCount = await options.count();
    if (optionCount > 1) {
      await dropdown.selectOption({ index: 1 });
      await expect(page.locator('.react-flow')).toBeVisible();

      const resourceNode = page.locator('[data-testid="resource-node"]').first();
      await resourceNode.click();
      await expect(page.locator('[data-testid="detail-panel"]')).toBeVisible();

      await page.locator('[data-testid="detail-panel-close"]').click();
      await expect(page.locator('[data-testid="detail-panel"]')).not.toBeVisible();
    }
  });

});

test.describe('AgentsGraphPage_graphControls_workCorrectly', () => {

  test('GraphControls_zoomButtons_areVisible', async ({ page }) => {
    await page.goto('/agents');
    const dropdown = page.locator('select[name="actor"]');
    const options = dropdown.locator('option');
    const optionCount = await options.count();
    if (optionCount > 1) {
      await dropdown.selectOption({ index: 1 });
      await expect(page.locator('.react-flow')).toBeVisible();
      await expect(page.locator('.react-flow__controls')).toBeVisible();
    }
  });

  test('GraphControls_minimap_isVisible', async ({ page }) => {
    await page.goto('/agents');
    const dropdown = page.locator('select[name="actor"]');
    const options = dropdown.locator('option');
    const optionCount = await options.count();
    if (optionCount > 1) {
      await dropdown.selectOption({ index: 1 });
      await expect(page.locator('.react-flow')).toBeVisible();
      await expect(page.locator('.react-flow__minimap')).toBeVisible();
    }
  });

});

test.describe('AgentsGraphPage_navigation_worksFromHomePage', () => {

  test('Navigation_homePage_hasAgentPermissionsLink', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('a[href="/agents"]')).toBeVisible();
  });

  test('Navigation_clickLink_navigatesToAgentsPage', async ({ page }) => {
    await page.goto('/');
    await page.locator('a[href="/agents"]').click();
    await expect(page).toHaveURL(/\/agents/);
    await expect(page.locator('h1')).toContainText('Agent Permissions');
  });

});
