import { expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

type Runtime = { runId: string; users: Record<string, { id: string; role: string; phone: string; password: string }>; storeId: string; menuItemId: string };

const browserErrors = new WeakMap<Page, string[]>();
export function startBrowserErrorCapture(page: Page) {
  if (browserErrors.has(page)) return;
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
}

export async function runtime(): Promise<Runtime> {
  return JSON.parse(await readFile(join(process.cwd(), 'e2e', '.runtime.json'), 'utf8')) as Runtime;
}

export async function login(page: Page, role: keyof Runtime['users']) {
  startBrowserErrorCapture(page);
  const data = await runtime();
  const user = data.users[role];
  await page.context().clearCookies();
  await page.goto('/?login=1');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('رقم الموبايل')).toBeVisible();
  await page.getByLabel('رقم الموبايل').fill(user.phone);
  await page.getByLabel('كلمة المرور').fill(user.password);

  await Promise.all([
    page.waitForURL(url => url.searchParams.get('login') !== '1', { timeout: 15_000, waitUntil: 'domcontentloaded' }),
    page.getByRole('button', { name: 'دخول ←' }).click(),
  ]);
  await page.waitForLoadState('domcontentloaded');
  await page.goto(`/?role=${role}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator(`[data-role="${role}"]`)).toBeVisible({ timeout: 15_000 });
}

export async function expectWorkspace(page: Page, role: 'customer'|'merchant'|'driver'|'admin') {
  await expect(page.locator(`[data-role="${role}"]`)).toBeVisible();
}

export async function assertNoFatalBrowserErrors(page: Page) {
  const errors = browserErrors.get(page);
  expect(errors, 'Call startBrowserErrorCapture before navigation/actions').toBeDefined();
  if (!errors) throw new Error('Browser error capture was not started');
  expect(errors, `Browser errors: ${errors.join(' | ')}`).toEqual([]);
}
