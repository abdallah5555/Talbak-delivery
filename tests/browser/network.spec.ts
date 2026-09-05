import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

for (const failure of ['abort', '500', '403']) {
  test(`catalog ${failure} shows retry and recovers`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let hits = 0, failing = true;
    await page.route('https://**/*', async route => {
      if (new URL(route.request().url()).pathname === '/rest/v1/stores') {
        hits++;
        if (failing) {
          if (failure === 'abort') return route.abort('failed');
          return route.fulfill({ status: Number(failure), json: { message: 'Injected failure' } });
        }
        return route.fulfill({ json: [] });
      }
      return route.fulfill({ json: [] });
    });
    await page.goto('/?customer=1');
    // postgrest-js retries failed GETs with 1s + 2s + 4s backoff.
    await expect(page.getByRole('heading', { name: /تعذر تحميل المتاجر/ })).toBeVisible({ timeout: 15_000 });
    expect(hits).toBeGreaterThan(0);
    const previousHits = hits;
    failing = false;
    await page.getByRole('button', { name: 'إعادة المحاولة', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'الخدمة متوقفة مؤقتًا' })).toBeVisible();
    expect(hits).toBeGreaterThan(previousHits);
    await expect(page.getByRole('heading', { name: /تعذر تحميل المتاجر/ })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('empty catalog is an explicit state, not a false-success brand match', async ({ page }) => {
  let hits = 0;
  await page.route('https://**/*', route => {
    if (new URL(route.request().url()).pathname === '/rest/v1/stores') hits++;
    return route.fulfill({ json: [] });
  });
  await page.goto('/?customer=1');
  await expect(page.getByRole('heading', { name: 'الخدمة متوقفة مؤقتًا' })).toBeVisible();
  expect(hits).toBeGreaterThan(0);
  await expect(page.locator('.store')).toHaveCount(0);
});
