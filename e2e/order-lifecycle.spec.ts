import { test, expect } from '@playwright/test';
import { login, runtime, expectWorkspace } from './helpers';

async function clickFirstVisible(page: any, pattern: RegExp, timeout = 12_000) {
  const buttons = page.getByRole('button', { name: pattern });
  await expect.poll(async () => { const count = await buttons.count(); for (let i = 0; i < count; i++) if (await buttons.nth(i).isVisible()) return true; return false; }, { timeout }).toBe(true);
  for (let i = 0; i < await buttons.count(); i++) if (await buttons.nth(i).isVisible()) { await buttons.nth(i).click(); return; }
}

test('full customer → merchant → driver order lifecycle', async ({ browser, contextOptions }) => {
  const data = await runtime();
  const customerContext = await browser.newContext(contextOptions); const customer = await customerContext.newPage();
  await login(customer, 'customer'); await expectWorkspace(customer, 'customer');
  await customer.getByText(`E2E Test Store ${data.runId}`, { exact: true }).click();
  await customer.locator('.item').filter({ hasText: `E2E Test Item ${data.runId}` }).getByRole('button').click();
  await customer.locator('.store-modal .x').click(); await customer.locator('nav .cart').click(); await clickFirstVisible(customer, /إتمام الطلب/);
  const responsePromise = customer.waitForResponse(r => r.url().endsWith('/rpc/create_order_secure') && r.request().method() === 'POST');
  await clickFirstVisible(customer, /تأكيد الطلب/);
  const response = await responsePromise; expect(response.ok()).toBe(true);
  const created = await response.json();
  expect(created.id).toMatch(/^[0-9a-f-]{36}$/i);
  expect(created.customer_id).toBe(data.users.customer.id);
  expect(created.store_id).toBe(data.storeId);
  expect(Number(created.total)).toBe(65);
  const shortId = created.id.slice(0,6).toUpperCase();
  const createdOrder = customer.locator('.order').filter({ hasText: `#${shortId}` }); await expect(createdOrder).toHaveCount(1);

  // Manual-dispatch scenario: prevent automatic dispatch to a non-fixture driver.
  const driverContext = await browser.newContext({ ...contextOptions, geolocation: { latitude: 30.0444, longitude: 31.2357 }, permissions: ['geolocation'] }); const driver = await driverContext.newPage(); await login(driver, 'driver');
  const availability = driver.locator('.phead button.online'); await expect(availability).toBeVisible({ timeout: 15_000 }); if ((await availability.innerText()).includes('أوفلاين')) await availability.click();
  await expect(availability).toHaveText('أونلاين');

  const merchantContext = await browser.newContext(contextOptions); const merchant = await merchantContext.newPage(); await merchant.route('**/rpc/auto_assign_nearest_driver', route => route.fulfill({status:200,contentType:'application/json',body:'null'})); await login(merchant, 'merchant'); await expectWorkspace(merchant, 'merchant');
  const merchantOrder = merchant.locator('.porder').filter({ hasText: `#${shortId}` }); await expect(merchantOrder).toBeVisible({timeout:15_000}); await merchantOrder.getByRole('button',{name:/قبول الطلب/}).click();
  await expect(merchantOrder).toContainText(/مقبول/,{timeout:15_000});
  const update=merchantOrder.getByRole('button',{name:/تحديث الحالة/}); await update.click(); await expect(merchantOrder).toContainText(/تجهيز/,{timeout:15_000});
  await update.click();
  await expect(merchantOrder).toContainText(/جاهز للسائق/,{timeout:15_000});

  await driver.locator('.psection button.refresh').click();
  await expect.poll(async()=> (await driver.locator('body').innerText()).includes(`#${shortId}`),{timeout:15_000}).toBe(true);
  const driverOrder=driver.locator('.porder').filter({hasText:`#${shortId}`}); const accept=driverOrder.getByRole('button',{name:/استلام الطلب/}); await expect(accept).toBeVisible(); await accept.click(); await expect(driverOrder.locator('.badge')).toHaveClass(/assigned/);
  for(const state of ['picked_up','on_the_way','delivered']){const b=driverOrder.getByRole('button',{name:state==='delivered'?'تم التسليم':'تحديث',exact:true}); await expect(b).toBeVisible();await b.click();await expect(driverOrder.locator('.badge')).toHaveClass(new RegExp(state));}
  await expect(driverOrder.locator('.badge')).toHaveClass(/delivered/,{timeout:15_000});
  await expect(driverOrder.getByRole('button',{name:'تم التسليم',exact:true})).toHaveCount(0);

  await expect(createdOrder.locator('.order-head > span')).toContainText(/اتسلّم|تم التسليم/,{timeout:15_000});
  await customer.reload(); await clickFirstVisible(customer,/طلباتي/); const finalOrder=customer.locator('.order').filter({hasText:`#${shortId}`}); await expect(finalOrder).toContainText(/اتسلّم بنجاح|تم التسليم/,{timeout:15_000});
  await availability.click(); await expect(availability).toHaveText('أوفلاين');
  await customerContext.close(); await merchantContext.close(); await driverContext.close();
});
