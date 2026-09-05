import { test, expect } from '@playwright/test';
import { login, runtime, expectWorkspace } from './helpers';

async function clickFirstVisible(page: any, pattern: RegExp, timeout = 12_000) {
  const buttons = page.getByRole('button', { name: pattern });
  await expect.poll(async () => { const count = await buttons.count(); for (let i = 0; i < count; i++) if (await buttons.nth(i).isVisible()) return true; return false; }, { timeout, message: `Expected a visible button matching ${pattern}` }).toBe(true);
  const count = await buttons.count();
  for (let i = 0; i < count; i++) if (await buttons.nth(i).isVisible()) { await buttons.nth(i).click(); return; }
  throw new Error(`No visible button matched ${pattern}`);
}

test('full customer → merchant → driver order lifecycle', async ({ browser }) => {
  const data = await runtime();
  const customerContext = await browser.newContext();
  const customer = await customerContext.newPage();
  await login(customer, 'customer');
  await expectWorkspace(customer, 'customer');
  await customer.getByText(`E2E Test Store ${data.runId}`, { exact: true }).click();
  const itemRow = customer.locator('.item').filter({ hasText: `E2E Test Item ${data.runId}` });
  await expect(itemRow).toBeVisible();
  await itemRow.getByRole('button').click();
  await customer.locator('.store-modal .x').click();
  await customer.locator('nav .cart').click();
  await clickFirstVisible(customer, /إتمام الطلب/);
  await expect(customer.getByRole('button', { name: /إلكتروني/ })).toBeDisabled();
  await clickFirstVisible(customer, /تأكيد الطلب/);
  await expect(customer.locator('main.page')).toContainText(/طلبك اتسجل بنجاح|تم.*الطلب/, { timeout: 15_000 });

  const driverContext = await browser.newContext({ geolocation: { latitude: 30.0444, longitude: 31.2357 }, permissions: ['geolocation'] });
  const driver = await driverContext.newPage();
  await login(driver, 'driver');
  const availability = driver.getByRole('button', { name: /أونلاين|أوفلاين/ }).last();
  await expect(availability).toBeVisible({ timeout: 15_000 });
  const currentAvailability = (await availability.innerText()).trim();
  if (currentAvailability.includes('أوفلاين')) await availability.click();
  await expect.poll(async () => (await driver.getByRole('button', { name: /أونلاين|أوفلاين/ }).last().innerText()).trim()).toMatch(/أونلاين/);

  const merchantContext = await browser.newContext();
  const merchant = await merchantContext.newPage();
  await login(merchant, 'merchant');
  await expectWorkspace(merchant, 'merchant');
  await clickFirstVisible(merchant, /قبول الطلب/);
  await expect(merchant.locator('body')).toContainText(/مقبول/);
  await clickFirstVisible(merchant, /تحديث الحالة/);
  await expect(merchant.locator('body')).toContainText(/تجهيز/);
  await clickFirstVisible(merchant, /تحديث الحالة/);
  await expect(merchant.locator('body')).toContainText(/جاهز للسائق/);

  await expect(driver.locator('.portal-loading')).toHaveCount(0, { timeout: 15_000 });
  await expect.poll(async () => /استلام الطلب|مع السائق|جاهز للسائق/.test(await driver.locator('body').innerText()), { timeout: 15_000 }).toBe(true);
  const accept = driver.getByRole('button', { name: /استلام الطلب/ });
  for (let i = 0; i < await accept.count(); i++) if (await accept.nth(i).isVisible()) { await accept.nth(i).click(); break; }

  await expect.poll(async () => /مع السائق|استلم|في الطريق|تم التسليم/.test(await driver.locator('body').innerText()), { timeout: 15_000 }).toBe(true);
  for (let step = 0; step < 3; step++) {
    const buttons = driver.getByRole('button', { name: /^تحديث$|^تم التسليم$/ });
    let clicked = false;
    for (let i = 0; i < await buttons.count(); i++) if (await buttons.nth(i).isVisible()) { await buttons.nth(i).click(); clicked = true; break; }
    if (!clicked) break;
    if (step < 2) await expect.poll(async () => /استلم|في الطريق|تم التسليم/.test(await driver.locator('body').innerText()), { timeout: 15_000 }).toBe(true);
  }
  await expect(driver.locator('body')).toContainText(/تم التسليم/, { timeout: 15_000 });

  await customer.reload();
  await clickFirstVisible(customer, /طلباتي/);
  await expect(customer.locator('body')).toContainText(/اتسلّم بنجاح|تم التسليم/, { timeout: 15_000 });

  await customerContext.close();
  await merchantContext.close();
  await driverContext.close();
});
