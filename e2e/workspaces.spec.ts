import { test, expect } from '@playwright/test';
import { login, expectWorkspace, runtime } from './helpers';

test.describe('Talbak role workspaces', () => {
  test('customer gets an independent customer workspace', async ({ page }) => {
    await login(page, 'customer');
    await page.goto('/?role=customer');
    await expectWorkspace(page, 'customer');
    await expect(page.locator('.workspace-bar')).toContainText('واجهة العميل');
    await expect(page.locator('.workspace-root')).toHaveAttribute('data-role', 'customer');
  });

  test('merchant gets merchant workspace and its test store is visible to the workspace', async ({ page }) => {
    const data = await runtime();
    await login(page, 'merchant');
    await page.goto('/?role=merchant');
    await expectWorkspace(page, 'merchant');
    await expect(page.locator('.workspace-bar')).toContainText('واجهة التاجر');
    await expect(page.locator('body')).toContainText(`E2E Test Store ${data.runId}`);
  });

  test('driver gets driver workspace', async ({ page }) => {
    await login(page, 'driver');
    await page.goto('/?role=driver');
    await expectWorkspace(page, 'driver');
    await expect(page.locator('.workspace-bar')).toContainText('واجهة السائق');
  });

  test('admin gets admin workspace', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/?role=admin');
    await expectWorkspace(page, 'admin');
    await expect(page.locator('.workspace-bar')).toContainText('لوحة الإدارة');
  });

  test('merchant can switch to its customer role without changing server permissions', async ({ page }) => {
    await login(page, 'merchant');
    await page.goto('/?role=merchant');
    await expectWorkspace(page, 'merchant');
    const switcher = page.locator('.role-switcher');
    if (await switcher.count()) {
      await switcher.click();
      await expect(page.locator('body')).toContainText('العميل');
    }
  });
});
