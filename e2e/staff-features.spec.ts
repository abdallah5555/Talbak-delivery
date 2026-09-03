import { test, expect } from '@playwright/test';
import { login, expectWorkspace } from './helpers';

test.describe('role-specific operational features', () => {
  test('merchant workspace exposes inventory and store operations', async ({ page }) => {
    await login(page, 'merchant');
    await page.goto('/?role=merchant');
    await expectWorkspace(page, 'merchant');
    await expect(page.locator('body')).toContainText(/مخزون|المخزون|المنيو|الطلبات/);
  });

  test('driver workspace exposes availability and delivery operations', async ({ page }) => {
    await page.context().grantPermissions(['geolocation']);
    await page.context().setGeolocation({ latitude: 30.0444, longitude: 31.2357 });
    await login(page, 'driver');
    await page.goto('/?role=driver');
    await expectWorkspace(page, 'driver');
    await expect(page.locator('body')).toContainText(/أوفلاين|أونلاين|طلباتي/);
  });

  test('admin workspace exposes operational management areas', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/?role=admin');
    await expectWorkspace(page, 'admin');
    await expect(page.locator('body')).toContainText(/المستخدمون|المتاجر|الطلبات|طلبات الانضمام/);
  });
});
