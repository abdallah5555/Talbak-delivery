import { test, expect } from '@playwright/test';

test.describe('public Talbak browser smoke', () => {
  test('homepage renders without a fatal browser error', async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('pageerror', error => browserErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/طلبك|رقم الموبايل|أهلاً/);
    await page.waitForTimeout(1000);
    expect(browserErrors, browserErrors.join(' | ')).toEqual([]);
  });

  test('first-time entry exposes the signup experience', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('جاهز تبدأ؟')).toBeVisible();
    await expect(page.getByText('ابدأ كعميل ←')).toBeVisible();
    await expect(page.getByLabel('الاسم بالكامل')).toBeVisible();
    await expect(page.getByLabel('رقم الموبايل')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'كلمة المرور إظهار' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'تأكيد كلمة المرور' })).toBeVisible();
    await expect(page.getByText('حساب واحد')).toHaveCount(0);
    await expect(page.getByText('بدون بريد إلكتروني')).toHaveCount(0);
    await expect(page.getByText('بدون SMS أو OTP')).toHaveCount(0);
  });

  test('customer entry route renders a deliberate service state or catalog', async ({ page }) => {
    const browserErrors: string[] = [];
    page.on('pageerror', error => browserErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });

    await page.goto('/?customer=1', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(/طلبك|الخدمة متوقفة مؤقتًا|مفيش متاجر|المتاجر/);
    await page.waitForTimeout(1000);
    expect(browserErrors, browserErrors.join(' | ')).toEqual([]);
  });

  test('login entry route exposes the mobile login form without technical copy', async ({ page }) => {
    await page.goto('/?login=1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('رقم الموبايل')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'كلمة المرور إظهار' })).toBeVisible();
    await expect(page.getByText('وحشتنا 👋')).toBeVisible();
    await expect(page.getByText('حساب واحد')).toHaveCount(0);
    await expect(page.getByText('بدون بريد إلكتروني')).toHaveCount(0);
    await expect(page.getByText('بدون SMS أو OTP')).toHaveCount(0);
  });
});
