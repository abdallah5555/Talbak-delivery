import { expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

type Runtime = { runId: string; users: Record<string, { id: string; role: string; phone: string; password: string }>; storeId: string; menuItemId: string };

export async function runtime(): Promise<Runtime> {
  return JSON.parse(await readFile(join(process.cwd(), 'e2e', '.runtime.json'), 'utf8')) as Runtime;
}

export async function login(page: Page, role: keyof Runtime['users']) {
  const data = await runtime();
  const user = data.users[role];
  await page.goto('/?login=1');
  await expect(page.getByLabel('رقم الموبايل')).toBeVisible();
  await page.getByLabel('رقم الموبايل').fill(user.phone);
  await page.getByLabel('كلمة المرور').fill(user.password);
  await page.getByRole('button', { name: /تسجيل الدخول بالرقم/ }).click();
  await page.waitForLoadState('domcontentloaded');
}

export async function expectWorkspace(page: Page, role: 'customer'|'merchant'|'driver'|'admin') {
  await expect(page.locator(`[data-role="${role}"]`)).toBeVisible();
}

export async function assertNoFatalBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.waitForTimeout(500);
  expect(errors, `Browser errors: ${errors.join(' | ')}`).toEqual([]);
}
