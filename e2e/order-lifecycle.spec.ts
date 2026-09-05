import { test, expect } from '@playwright/test';
import { login, runtime, expectWorkspace } from './helpers';

async function clickFirstVisible(page: any, pattern: RegExp, timeout = 12_000) {
  const buttons = page.getByRole('button', { name: pattern });
  await expect.poll(async () => {
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      if (await buttons.nth(i).isVisible()) return true;
    }
    return false;
  }, { timeout, message: `Expected a visible button matching ${pattern}` }).toBe(true);
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    if (await buttons.nth(i).isVisible()) {
      await buttons.nth(i).click();
      return;
    }
  }
  throw new Error(`No visible button matched ${pattern}`);
}

test('full customer → merchant → driver order lifecycle', async ({ browser }) => {
  const data = await runtime();

  const customerContext = await browser.newContext();
  const customer = await customerContext.newPage();
  await login(customer, 'customer');
  await customer.goto('/?role=customer');
  await expectWorkspace(customer, 'customer');

  const testStore = customer.getByText(`E2E Test Store ${data.runId}`, { exact: true });
  await expect(testStore).toBeVisible();
  await testStore.click();
  await expect(customer.getByText(`E2E Test Item ${data.runId}`, { exact: true })).toBeVisible();

  const itemRow = customer.locator('.item').filter({ hasText: `E2E Test Item ${data.runId}` });
  await expect(itemRow).toBeVisible();
  await itemRow.getByRole('button').click();
  await customer.locator('.store-modal .x').click();

  await customer.locator('nav .cart').click();
  await expect(customer.locator('.drawer')).toBeVisible();
  await clickFirstVisible(customer, /إتمام الطلب/);
  await expect(customer.getByRole('button', { name: /💳|إلكتروني/ })).toBeDisabled();
  await clickFirstVisible(customer, /تأكيد الطلب/);
  await expect(customer.locator('main.page')).toContainText(/طلبك اتسجل بنجاح|تم.*الطلب/, { timeout: 15_000 });

  const driverContext = await browser.newContext({ geolocation: { latitude: 30.0444, longitude: 31.2357 }, permissions: ['geolocation'] });
  const driver = await driverContext.newPage();
  await login(driver, 'driver');
  await driver.goto('/?role=driver');
  await expectWorkspace(driver, 'driver');
  await clickFirstVisible(driver, /أونلاين/);
  await expect(driver.locator('body')).toContainText(/أونلاين|مستني طلبات/);

  const merchantContext = await browser.newContext();
  const merchant = await merchantContext.newPage();
  await login(merchant, 'merchant');
  await merchant.goto('/?role=merchant');
  await expectWorkspace(merchant, 'merchant');
  await expect(merchant.locator('body')).toContainText(/طلب/);

  await clickFirstVisible(merchant, /قبول الطلب/);
  await expect(merchant.locator('body')).toContainText(/مقبول/);
  await clickFirstVisible(merchant, /تحديث الحالة/);
  await expect(merchant.locator('body')).toContainText(/تجهيز/);
  await clickFirstVisible(merchant, /تحديث الحالة/);
  await expect(merchant.locator('body')).toContainText(/جاهز للسائق/);

  await expect(driver.locator('.portal-loading')).toHaveCount(0, { timeout: 15_000 });
  await expect(driver.getByRole('button', { name: /استلام الطلب/ })).toBeVisible({ timeout: 15_000 });
  await driver.getByRole('button', { name: /استلام الطلب/ }).click();
  await expect(driver.locator('body')).toContainText(/مع السائق|استلم/);

  await expect(driver.getByRole('button', { name: /^تحديث$/ })).toBeVisible({ timeout: 10_000 });
  await driver.getByRole('button', { name: /^تحديث$/ }).click();
  await expect(driver.locator('body')).toContainText(/استلم/);

  await driver.getByRole('button', { name: /^تحديث$/ }).click();
  await expect(driver.locator('body')).toContainText(/في الطريق/);

  await driver.getByRole('button', { name: /تم التسليم/ }).click();
  await expect(driver.locator('body')).toContainText(/تم التسليم/);
  await expect(driver.getByRole('button', { name: /تم التسليم/ })).toHaveCount(0);

  await customer.reload();
  await clickFirstVisible(customer, /طلباتي/);
  await expect(customer.locator('body')).toContainText(/اتسلّم بنجاح|تم التسليم/, { timeout: 15_000 });

  await customer.close();
  await customerContext.close();
  await merchant.close();
  await merchantContext.close();
  await driver.close();
  await driverContext.close();
});
