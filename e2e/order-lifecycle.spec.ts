import { test, expect } from '@playwright/test';
import { login, runtime, expectWorkspace } from './helpers';

async function clickFirstVisible(page: any, pattern: RegExp) {
  const buttons = page.getByRole('button', { name: pattern });
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

  await customer.locator('nav .cart').click();
  await expect(customer.locator('.drawer')).toBeVisible();
  await clickFirstVisible(customer, /إتمام الطلب/);
  await clickFirstVisible(customer, /تأكيد الطلب/);
  await expect(customer.getByText(/طلبك اتسجل بنجاح|تم.*الطلب/)).toBeVisible({ timeout: 15_000 });

  const driverContext = await browser.newContext({
    geolocation: { latitude: 30.0444, longitude: 31.2357 },
    permissions: ['geolocation'],
  });
  const driver = await driverContext.newPage();
  await login(driver, 'driver');
  await driver.goto('/?role=driver');
  await expectWorkspace(driver, 'driver');
  await clickFirstVisible(driver, /أونلاين|أوفلاين/);
  await expect(driver.locator('body')).toContainText(/أونلاين|مستني طلبات/);

  const merchantContext = await browser.newContext();
  const merchant = await merchantContext.newPage();
  await login(merchant, 'merchant');
  await merchant.goto('/?role=merchant');
  await expectWorkspace(merchant, 'merchant');
  await expect(merchant.locator('body')).toContainText(/طلب/);
  await clickFirstVisible(merchant, /قبول|استلام|بدء التجهيز|تجهيز/);
  await clickFirstVisible(merchant, /جاهز للسائق|جاهز|إرسال للسائق/);

  await expect(driver.locator('body')).toContainText(/طلب|معاك|متاح/);
  if (await driver.getByRole('button', { name: /قبول الطلب|استلام الطلب|قبول/ }).count()) {
    await clickFirstVisible(driver, /قبول الطلب|استلام الطلب|قبول/);
  }
  await clickFirstVisible(driver, /استلم|في الطريق|تم التسليم|تسليم/);
  await clickFirstVisible(driver, /في الطريق|تم التسليم|تسليم/);
  await clickFirstVisible(driver, /تم التسليم|تسليم/);

  await customer.reload();
  await expect(customer.locator('body')).toContainText(/تم التسليم|اتسلّم بنجاح/);

  await customer.close();
  await customerContext.close();
  await merchant.close();
  await merchantContext.close();
  await driver.close();
  await driverContext.close();
});
