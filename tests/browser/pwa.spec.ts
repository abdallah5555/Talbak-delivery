import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'allow' });

test('production shell boots offline and caches only public assets', async ({ page, context, request }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('https://**/*', route => route.fulfill({ json: [] }));
  const manifestResponse = await request.get('/manifest.json');
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/');
  expect(manifest.name).toBeTruthy();
  expect(manifest.icons.length).toBeGreaterThan(0);
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  await page.goto('/?login=1');
  await expect(page.getByLabel('رقم الموبايل')).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  // The first navigation may precede worker control; reload once to warm compiled assets.
  await page.reload();
  await expect(page.getByLabel('رقم الموبايل')).toBeVisible();
  await expect.poll(() => page.evaluate(async () => {
    const cache = await caches.open('talbak-shell-v4');
    return (await cache.keys()).some(r => /\/assets\/.*\.js$/.test(new URL(r.url).pathname));
  })).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel('رقم الموبايل')).toBeVisible();
  const cachePaths = await page.evaluate(async () => {
    const cache = await caches.open('talbak-shell-v4');
    return (await cache.keys()).map(r => new URL(r.url).pathname);
  });
  expect(cachePaths.every(p => p === '/' || p === '/manifest.json' || p === '/logo.svg' || p.startsWith('/assets/'))).toBe(true);
  expect(errors).toEqual([]);
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByRole('button', { name: 'دخول ←', exact: true })).toBeVisible();
});
