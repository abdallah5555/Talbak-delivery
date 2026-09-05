import { test, expect } from '@playwright/test';
import { login, assertNoFatalBrowserErrors } from './helpers';

test.describe('UI resilience and failure containment', () => {
  test('customer survives a Supabase network failure without a white screen', async ({ page }) => {
    await login(page, 'customer');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await expect(page.locator('.workspace-root')).toHaveAttribute('data-role', 'customer');

    let aborted = false;
    await page.route('**/rest/v1/**', async route => {
      if (!aborted) {
        aborted = true;
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });

    const orders = page.getByRole('button', { name: /طلباتي/ }).first();
    await orders.click();
    await expect(page.locator('main.page')).toBeVisible();
    await page.waitForTimeout(1_000);
    await assertNoFatalBrowserErrors(page);
    expect(errors).toEqual([]);
  });

  test('customer entry still renders when service catalog is empty or unavailable', async ({ page }) => {
    await page.goto('/?customer=1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/طلبك|الخدمة متوقفة مؤقتًا|مفيش متاجر|المتاجر/);
  });

  test('service worker and manifest are reachable', async ({ page, request }) => {
    const manifest = await request.get('/manifest.json');
    expect(manifest.ok()).toBeTruthy();
    const json = await manifest.json();
    expect(json.name || json.short_name).toBeTruthy();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    if ('serviceWorker' in await page.evaluate(() => navigator)) {
      await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null || navigator.serviceWorker.getRegistrations().then(r => r.length > 0))).toBeTruthy();
    }
  });
});
