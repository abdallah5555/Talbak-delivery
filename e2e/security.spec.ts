import { test, expect } from '@playwright/test';
import { login, expectWorkspace } from './helpers';

const forbiddenRoleCases = [
  ['customer', 'admin', 'customer'],
  ['customer', 'merchant', 'customer'],
  ['customer', 'driver', 'customer'],
  ['merchant', 'admin', 'customer'],
  ['driver', 'admin', 'customer'],
] as const;

test.describe('role isolation and authorization at the UI boundary', () => {
  for (const [account, requested, expected] of forbiddenRoleCases) {
    test(`${account} cannot switch into ${requested} by URL`, async ({ page }) => {
      await login(page, account);
      await page.goto(`/?role=${requested}`);
      await expectWorkspace(page, expected);
      await expect(page.locator('.workspace-root')).toHaveAttribute('data-role', expected);
      if (requested !== expected) {
        await expect(page.locator('.workspace-root')).not.toHaveAttribute('data-role', requested);
      }
    });
  }

  test('admin can open the admin workspace explicitly', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/?role=admin');
    await expectWorkspace(page, 'admin');
    await expect(page.locator('body')).toContainText(/المستخدمون|طلبات الانضمام|سجل الإدارة/);
  });

  test('a logged-in customer cannot reach staff support as admin through query parameters', async ({ page }) => {
    await login(page, 'customer');
    await page.goto('/?support=1&role=admin');
    await expectWorkspace(page, 'customer');
  });
});
