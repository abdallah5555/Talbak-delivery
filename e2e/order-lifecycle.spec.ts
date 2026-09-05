import { test, expect } from '@playwright/test';
import { login, runtime, expectWorkspace } from './helpers';

async function clickFirstVisible(page: any, pattern: RegExp, timeout = 12_000) {
  const buttons = page.getByRole('button', { name: pattern });
  await expect.poll(async () => { const count = await buttons.count(); for (let i = 0; i < count; i++) if (await buttons.nth(i).isVisible()) return true; return false; }, { timeout }).toBe(true);
  for (let i = 0; i < await buttons.count(); i++) if (await buttons.nth(i).isVisible()) { await buttons.nth(i).click(); return; }
}

test('full customer → merchant → driver order lifecycle', async ({ browser }) => {
  const data = await runtime();
  const customerContext = await browser.newContext(); const customer = await customerContext.newPage();
  await login(customer, 'customer'); await expectWorkspace(customer, 'customer');
  await customer.getByText(`E2E Test Store ${data.runId}`, { exact: true }).click();
  await customer.locator('.item').filter({ hasText: `E2E Test Item ${data.runId}` }).getByRole('button').click();
  await customer.locator('.store-modal .x').click(); await customer.locator('nav .cart').click(); await clickFirstVisible(customer, /إتمام الطلب/); await clickFirstVisible(customer, /تأكيد الطلب/);
  await expect(customer.locator('main.page')).toContainText(/طلبك اتسجل بنجاح|تم.*الطلب/, { timeout: 15_000 });
  const createdOrder = customer.locator('.order').filter({ hasText: `E2E Test Store ${data.runId}` }).first(); await expect(createdOrder).toBeVisible(); const orderText = await createdOrder.innerText(); const shortId = orderText.match(/#([A-F0-9]{6})/)?.[1]; expect(shortId).toBeTruthy();

  const driverContext = await browser.newContext({ geolocation: { latitude: 30.0444, longitude: 31.2357 }, permissions: ['geolocation'] }); const driver = await driverContext.newPage(); await login(driver, 'driver');
  const availability = driver.getByRole('button', { name: /أونلاين|أوفلاين/ }).last(); await expect(availability).toBeVisible({ timeout: 15_000 }); if ((await availability.innerText()).includes('أوفلاين')) await availability.click();

  const merchantContext = await browser.newContext(); const merchant = await merchantContext.newPage(); await login(merchant, 'merchant'); await expectWorkspace(merchant, 'merchant');
  const merchantOrder = merchant.locator('.order').filter({ hasText: `#${shortId}` }); await expect(merchantOrder).toBeVisible({timeout:15_000}); await merchantOrder.getByRole('button',{name:/قبول الطلب/}).click();
  for(let i=0;i<2;i++){const update=merchantOrder.getByRole('button',{name:/تحديث الحالة/});await expect(update).toBeVisible({timeout:15_000});await update.click();}
  await expect(merchantOrder).toContainText(/جاهز للسائق/,{timeout:15_000});

  await expect.poll(async()=> (await driver.locator('body').innerText()).includes(`#${shortId}`),{timeout:15_000}).toBe(true);
  const driverOrder=driver.locator('.order').filter({hasText:`#${shortId}`}); const accept=driverOrder.getByRole('button',{name:/استلام الطلب/}); if(await accept.count()&&await accept.isVisible())await accept.click();
  for(let step=0;step<3;step++){const b=driverOrder.getByRole('button',{name:/^تحديث$|^تم التسليم$/});if(!await b.count()||!await b.first().isVisible())break;await b.first().click();}
  await expect(driverOrder).toContainText(/تم التسليم/,{timeout:15_000});

  await customer.reload(); await clickFirstVisible(customer,/طلباتي/); const finalOrder=customer.locator('.order').filter({hasText:`#${shortId}`}); await expect(finalOrder).toContainText(/اتسلّم بنجاح|تم التسليم/,{timeout:15_000});
  await customerContext.close(); await merchantContext.close(); await driverContext.close();
});