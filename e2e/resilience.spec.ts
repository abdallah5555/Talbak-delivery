import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('authenticated network recovery', () => {
  test.use({ serviceWorkers: 'block' });
  test('catalog failure is observed and retry restores customer workspace', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await login(page, 'customer');
    let aborted = 0;
    await page.route('**/rest/v1/stores?**', async route => { aborted++; await route.abort('failed'); });
    await page.reload();
    await expect(page.getByRole('heading', { name: /تعذر تحميل المتاجر/ })).toBeVisible();
    expect(aborted).toBeGreaterThan(0);
    await page.unroute('**/rest/v1/stores?**');
    await page.getByRole('button', { name: 'إعادة المحاولة', exact: true }).click();
    await expect(page.locator('main.page')).toBeVisible();
    await expect(page.locator('.store').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});
// Public empty-catalog, HTTP failure, and offline PWA tests are in tests/browser.
// They run without global setup via npm run test:isolated.
