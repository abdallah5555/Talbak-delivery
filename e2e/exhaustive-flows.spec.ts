import { test, expect, type Page } from '@playwright/test';
import { login, runtime, assertNoFatalBrowserErrors } from './helpers';

async function visibleButton(page: Page, name: RegExp | string) {
  const locator = page.getByRole('button', { name });
  for (let i = 0; i < await locator.count(); i++) {
    if (await locator.nth(i).isVisible()) return locator.nth(i);
  }
  throw new Error(`No visible button: ${name}`);
}
async function toastContains(page: Page, pattern: RegExp) { await expect(page.locator('.toast')).toContainText(pattern, { timeout: 5_000 }); }
async function openCustomerStore(page: Page, storeName: string) {
  const all = page.getByRole('button', { name: /الكل/ }).first();
  if (await all.isVisible()) await all.click();
  const store = page.getByText(storeName, { exact: true });
  await expect(store).toBeVisible({ timeout: 12_000 });
  await store.click();
  await expect(page.locator('.store-modal')).toBeVisible();
}
async function closeStoreModal(page: Page) { await page.locator('.store-modal .x').click(); }
async function openTools(page: Page, label: RegExp) { await page.locator('.workspace-tools-trigger').filter({ hasText: label }).click(); }

 test.describe('customer exhaustive journeys', () => {
  test('navigation, categories, search, store modal and favorites work', async ({ page }) => {
    const data = await runtime(); await login(page, 'customer');
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await expect(page.locator('nav.nav button')).toHaveCount(5);
    for (const category of ['الكل','مطاعم', 'بقالة', 'مخبوزات', 'صيدلية', 'مشروبات', 'حلويات', 'عناية', 'خدمات']) {
      const chip = page.getByRole('button', { name: new RegExp(category) }).first(); await expect(chip).toBeVisible(); await chip.click(); await expect(page.locator('main.page')).toBeVisible();
    }
    await page.getByRole('button', { name: /الكل/ }).first().click();
    const search = page.getByPlaceholder('مطعم، أكلة، منتج…'); await search.fill(`E2E Test Store ${data.runId}`); await expect(page.getByText(`E2E Test Store ${data.runId}`, { exact: true })).toBeVisible({ timeout: 12_000 });
    await search.fill('not-a-real-store-query-xyz'); await expect(page.locator('.section').nth(1)).toContainText('0 مكان'); await search.fill('');
    const card = page.locator('.store').filter({ hasText: `E2E Test Store ${data.runId}` }).first(); const heart = card.locator('.heart'); if ((await heart.getAttribute('class'))?.includes('on')) await heart.click(); await heart.click(); await expect(heart).toHaveClass(/on/);
    await openCustomerStore(page, `E2E Test Store ${data.runId}`); await expect(page.getByText(`E2E Test Item ${data.runId}`, { exact: true })).toBeVisible(); await closeStoreModal(page); await assertNoFatalBrowserErrors(page); expect(errors).toEqual([]);
  });

  test('cart quantity boundaries, empty state and cross-store protection work', async ({ page }) => {
    const data = await runtime(); await login(page, 'customer'); await openCustomerStore(page, `E2E Test Store ${data.runId}`); const item = page.locator('.item').filter({ hasText: `E2E Test Item ${data.runId}` }); await item.getByRole('button').click(); await closeStoreModal(page); await page.locator('nav .cart').click();
    for (let i = 0; i < 35; i++) await page.locator('.counter button').last().click(); await expect(page.locator('.counter b')).toHaveText('30'); for (let i = 0; i < 30; i++) await page.locator('.counter button').first().click(); await expect(page.locator('.drawer')).toContainText('السلة فاضية');
    await page.locator('.drawer .x').click(); await openCustomerStore(page, `E2E Test Store ${data.runId}`); await item.getByRole('button').click(); await closeStoreModal(page); await page.getByRole('button', { name: /بقالة/ }).first().click();
    const other = page.locator('.store').first(); if (await other.count()) { await other.click(); const otherItem = page.locator('.item').first(); if (await otherItem.count()) await otherItem.getByRole('button').click(); await toastContains(page, /السلة لمتجر واحد/); }
  });

  test('checkout validation, address creation and payment guard work', async ({ page }) => {
    const data = await runtime(); await login(page, 'customer'); await openCustomerStore(page, `E2E Test Store ${data.runId}`); const item = page.locator('.item').filter({ hasText: `E2E Test Item ${data.runId}` }); await item.getByRole('button').click(); await closeStoreModal(page); await page.locator('nav .cart').click(); await (await visibleButton(page, /إتمام الطلب/)).click(); await expect(page.getByRole('button', { name: /إلكتروني/ })).toBeDisabled(); await expect(page.locator('.checkout')).toBeVisible();
    await page.locator('.checkout .x').click(); await page.getByRole('button', { name: /حسابي/ }).first().click(); await page.getByPlaceholder('العنوان بالتفصيل').fill(''); await page.getByRole('button', { name: /إضافة عنوان/ }).click(); await toastContains(page, /اكتب العنوان/); await page.getByPlaceholder('العنوان بالتفصيل').fill(`E2E New Address ${Date.now()}`); await page.getByRole('button', { name: /إضافة عنوان/ }).click(); await expect(page.locator('.address-list')).toContainText('E2E New Address');
  });

  test('order details, cancellation and review entry points are protected by state', async ({ page }) => {
    await login(page, 'customer'); await page.getByRole('button', { name: /طلباتي/ }).first().click(); if (await page.locator('.order').count()) { const order = page.locator('.order').first(); await order.getByRole('button', { name: 'تفاصيل' }).click(); await expect(page.locator('.order-detail')).toBeVisible(); await page.locator('.order-detail .x').click(); const cancel = order.getByRole('button', { name: 'إلغاء' }); if (await cancel.count()) { await cancel.click(); await expect(order).toContainText(/اتلغى|ملغي/); await expect(order.getByRole('button', { name: 'إلغاء' })).toHaveCount(0); } const review = order.getByRole('button', { name: 'قيّم' }); if (await review.count()) { await review.click(); await expect(page.getByText('قيّم تجربتك')).toBeVisible(); await page.locator('.auth .x').click(); } }
  });

  test('role status, quick tools and support validation work', async ({ page }) => {
    await login(page, 'customer'); const roleStatus = page.getByRole('button', { name: /أدواري/ }); if (await roleStatus.count()) { await roleStatus.click(); await expect(page.locator('.role-status-menu')).toContainText('العميل'); await roleStatus.click(); } await openTools(page, /أدوات العميل/); await page.getByRole('menuitem', { name: /الدعم والشكاوى/ }).click(); await expect(page.locator('h1')).toContainText('مساعدة ودعم'); await page.getByRole('button', { name: /إرسال الشكوى/ }).click(); await toastContains(page, /اكتب الموضوع والرسالة/); await page.getByPlaceholder('موضوع المشكلة').fill(`E2E مشكلة ${Date.now()}`); await page.getByPlaceholder('اشرح المشكلة بالتفصيل').fill('اختبار آلي لرحلة الدعم'); await page.getByRole('button', { name: /إرسال الشكوى/ }).click(); await expect(page.locator('body')).toContainText(/الشكوى اتبعت/, { timeout: 10_000 });
  });

  test('partner application validation works', async ({ page }) => {
    await login(page, 'customer'); await page.getByRole('button', { name: /حسابي/ }).first().click(); await page.getByRole('button', { name: /انضم كتاجر/ }).click(); await page.getByRole('button', { name: /إرسال الطلب|إنشاء حساب/ }).click(); await toastContains(page, /اكمل بيانات النشاط/); await expect(page.locator('.auth')).toBeVisible();
  });
});

test.describe('merchant exhaustive operations', () => {
  test('store, menu and inventory operations execute and invalid inventory is rejected', async ({ page }) => {
    const data = await runtime(); await login(page, 'merchant'); await page.getByRole('button', { name: 'المتجر', exact: true }).click(); await expect(page.locator('.store-list')).toContainText(`E2E Test Store ${data.runId}`); const storeToggle = page.locator('.store-list button').first(); await storeToggle.click(); await expect(page.locator('.store-list')).toContainText(/مفتوح|مغلق/); await storeToggle.click();
    await page.getByRole('button', { name: 'المنيو', exact: true }).click(); const nameInput = page.getByDisplayValue(`E2E Test Item ${data.runId}`).first(); await expect(nameInput).toBeVisible(); const menuRow = nameInput.locator('xpath=ancestor::div[1]'); await menuRow.getByRole('button', { name: 'حفظ' }).click(); await expect(page.locator('.toast')).toContainText('تم حفظ الصنف');
    const inv = page.locator('.merchant-inventory'); await expect(inv).toBeVisible(); await inv.getByPlaceholder('اسم الصنف / الخامة').fill(`E2E Inventory ${data.runId}`); await inv.getByPlaceholder('الوحدة').fill('قطعة'); await inv.getByPlaceholder('حد التنبيه').fill('5'); await inv.getByPlaceholder('تكلفة الوحدة').fill('20'); await inv.getByRole('button', { name: /إضافة/ }).click(); await expect(inv).toContainText(`E2E Inventory ${data.runId}`); const row = inv.locator('.inventory-card').filter({ hasText: `E2E Inventory ${data.runId}` }); await row.getByPlaceholder('+ / −').fill('10'); await row.getByRole('button', { name: 'تطبيق' }).click(); await expect(row).toContainText('10'); await row.getByPlaceholder('+ / −').fill('-3'); await row.getByRole('button', { name: 'تطبيق' }).click(); await expect(row).toContainText('7'); await row.getByPlaceholder('+ / −').fill('abc'); await row.getByRole('button', { name: 'تطبيق' }).click(); await toastContains(page, /كمية زيادة أو نقص/);
  });
  test('merchant URL tampering does not grant unauthorized admin', async ({ page }) => { await login(page, 'merchant'); await page.goto('/?role=admin'); await expect(page.locator('.workspace-root')).toHaveAttribute('data-role', 'merchant'); });
});

test.describe('driver exhaustive operations', () => {
  test('location, online/offline and safe controls', async ({ page }) => {
    await page.context().grantPermissions(['geolocation']); await page.context().setGeolocation({ latitude: 30.0444, longitude: 31.2357 }); await login(page, 'driver'); await expect(page.locator('.driver-ops')).toBeVisible(); await page.getByRole('button', { name: /تحديد موقعي/ }).click(); await expect(page.locator('.driver-location')).toContainText(/30\.0444/); const online = page.getByRole('button', { name: /أونلاين|أوفلاين/ }).last(); await online.click(); await expect(page.locator('body')).toContainText(/أونلاين|مستني طلبات/); await online.click(); await expect(page.locator('body')).toContainText(/أوفلاين|تم إيقاف استقبال الطلبات/);
  });
  test('driver quick tools and engagement nudge have safe dismissal', async ({ page }) => { await login(page, 'driver'); await openTools(page, /أدوات السائق/); await expect(page.locator('.workspace-tools-menu')).toContainText(/مركز السائق|دعم السائق/); const nudge = page.locator('.engagement-nudge.driver'); if (await nudge.count() && await nudge.isVisible()) { await nudge.getByRole('button', { name: 'إغلاق' }).click(); await expect(nudge).toHaveCount(0); } });
});

test.describe('admin exhaustive operations', () => {
  test('all admin work areas and monitoring are reachable', async ({ page }) => { await login(page, 'admin'); await expect(page.locator('.workspace-root')).toHaveAttribute('data-role', 'admin'); for (const tab of ['نظرة عامة', 'الطلبات', 'المستخدمون', 'المتاجر', 'المنيو', 'طلبات الانضمام', 'الإشعارات', 'سجل الإدارة', 'مراقبة الخدمة']) { await page.getByRole('button', { name: tab, exact: true }).click(); await expect(page.locator('.pcontent')).toBeVisible(); } await page.getByRole('button', { name: 'مراقبة الخدمة', exact: true }).click(); await expect(page.getByText('عداد الخدمات')).toBeVisible(); await expect(page.getByText('Supabase — Free')).toBeVisible(); await expect(page.getByText('Vercel — Hobby')).toBeVisible(); });
  test('coupon validation and activation controls are safe', async ({ page }) => { await login(page, 'admin'); const coupons = page.locator('.admin-coupons'); await expect(coupons).toBeVisible(); await coupons.getByRole('button', { name: /إضافة/ }).click(); await expect(coupons.locator('.toast')).toContainText('اكتب كود الكوبون'); const code = `E2E_${Date.now()}`; await coupons.locator('input[placeholder*="TALBAK"]').fill(code); await coupons.locator('input[type="number"]').first().fill('10'); await coupons.getByRole('button', { name: /إضافة/ }).click(); await expect(coupons).toContainText(code); const card = coupons.locator('.coupon-card').filter({ hasText: code }); await card.getByRole('button', { name: /تفعيل|إيقاف/ }).click(); await expect(card).toContainText(/شغال|متوقف/); });
  test('admin notification validation works', async ({ page }) => { await login(page, 'admin'); await page.getByRole('button', { name: 'الإشعارات', exact: true }).click(); await page.getByRole('button', { name: 'إرسال الإشعار', exact: true }).click(); await toastContains(page, /اكتب عنوان ونص الإشعار/); });
  test('admin complaint workflow can resolve a submitted complaint', async ({ page }) => { await login(page, 'admin'); await page.goto('/?support=1&role=admin'); await expect(page.locator('h1')).toContainText('إدارة الشكاوى'); const complaint = page.locator('.order').filter({ hasText: 'E2E مشكلة' }).first(); if (await complaint.count()) { await complaint.locator('select').selectOption('resolved'); await expect(complaint).toContainText('تم الحل'); } });
});
