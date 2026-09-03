import { test, expect } from '@playwright/test';

test.describe('public Talbak browser smoke', () => {
  test('homepage renders without a fatal browser error', async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('pageerror', error => browserErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });

    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('body')).toContainText(/طلبك|رقم الموبايل|أهلاً/);
    await page.waitForTimeout(1000);
    expect(browserErrors, browserErrors.join(' | ')).toEqual([]);
  });

  test('customer entry route renders a deliberate service state or catalog', async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('pageerror', error => browserErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });

    const response = await page.goto('/?customer=1');
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('body')).toContainText(/طلبك|الخدمة متوقفة مؤقتًا|مفيش متاجر|المتاجر/);
    await page.waitForTimeout(1000);
    expect(browserErrors, browserErrors.join(' | ')).toEqual([]);
  });

  test('login entry route exposes the mobile login form', async ({ page }) => {
    const response = await page.goto('/?login=1');
    expect(response?.ok()).toBeTruthy();
    await expect(page.getByLabel('رقم الموبايل')).toBeVisible();
    await expect(page.getByLabel('كلمة المرور')).toBeVisible();
  });
});
