import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { FullConfig } from '@playwright/test';

const runtimePath = join(process.cwd(), 'e2e', '.runtime.json');
const runId = `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const password = `TalbakE2E!${Date.now()}Aa9`;
const phone = (offset: number) => `+2010${String(Date.now()).slice(-6)}${String(offset).padStart(2, '0')}`;

type TestUser = { id: string; role: 'customer'|'merchant'|'driver'|'admin'; phone: string; password: string };
type Runtime = { runId: string; users: Record<string, TestUser>; storeId: string; menuItemId: string };

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. E2E setup needs a server-side Supabase key.`);
  return value;
}

async function removeUserData(supabase: SupabaseClient, userId: string) {
  const { data: orders } = await supabase.from('orders').select('id').or(`customer_id.eq.${userId},driver_id.eq.${userId}`);
  const ids = (orders ?? []).map((o: any) => o.id).filter(Boolean);
  if (ids.length) await supabase.from('order_items').delete().in('order_id', ids);
  if (ids.length) await supabase.from('orders').delete().in('id', ids);
  await supabase.from('favorites').delete().eq('user_id', userId);
  await supabase.from('addresses').delete().eq('user_id', userId);
  await supabase.from('notifications').delete().eq('user_id', userId);
  await supabase.from('complaints').delete().eq('customer_id', userId);
  await supabase.from('audit_logs').delete().eq('actor_id', userId);
  await supabase.from('merchant_applications').delete().eq('applicant_id', userId);
  await supabase.from('driver_applications').delete().eq('applicant_id', userId);
  await supabase.from('driver_status').delete().eq('user_id', userId);
  await supabase.from('user_roles').delete().eq('user_id', userId);
  await supabase.from('inventory_movements').delete().eq('actor_id', userId);
}

async function cleanup(supabase: SupabaseClient, runtime: Runtime) {
  const userIds = Object.values(runtime.users).map(u => u.id);
  const merchantId = runtime.users.merchant?.id;
  const { data: stores } = merchantId ? await supabase.from('stores').select('id').eq('owner_id', merchantId) : { data: [] } as any;
  const storeIds = [...new Set([runtime.storeId, ...(stores ?? []).map((s: any) => s.id)].filter(Boolean))];
  const { data: storeOrders } = storeIds.length ? await supabase.from('orders').select('id').in('store_id', storeIds) : { data: [] } as any;
  const orderIds = (storeOrders ?? []).map((o: any) => o.id).filter(Boolean);
  if (orderIds.length) {
    await supabase.from('order_items').delete().in('order_id', orderIds);
    await supabase.from('orders').delete().in('id', orderIds);
  }
  if (storeIds.length) {
    const { data: inventory } = await supabase.from('inventory_items').select('id').in('store_id', storeIds);
    const inventoryIds = (inventory ?? []).map((x: any) => x.id).filter(Boolean);
    if (inventoryIds.length) await supabase.from('inventory_movements').delete().in('inventory_item_id', inventoryIds);
    await supabase.from('inventory_items').delete().in('store_id', storeIds);
    await supabase.from('menu_items').delete().in('store_id', storeIds);
    await supabase.from('stores').delete().in('id', storeIds);
  }
  for (const id of userIds) await removeUserData(supabase, id);
  for (const id of userIds) {
    const { error } = await supabase.auth.admin.deleteUser(id, false);
    if (error && !/not found/i.test(error.message)) throw error;
  }
  await rm(runtimePath, { force: true });
}

export default async function globalSetup(_config: FullConfig) {
  const url = env('E2E_SUPABASE_URL');
  const key = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY || process.env.E2E_SUPABASE_SECRET_KEY;
  if (!key) throw new Error('Missing E2E_SUPABASE_SERVICE_ROLE_KEY (or E2E_SUPABASE_SECRET_KEY). Never put this key in Vite/public env variables.');
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const users: Runtime['users'] = {};
  try {
    const specs = [
      ['customer', phone(11)],
      ['merchant', phone(22)],
      ['driver', phone(33)],
      ['admin', phone(44)],
    ] as const;
    for (const [role, userPhone] of specs) {
      const { data, error } = await supabase.auth.admin.createUser({ phone: userPhone, password, phone_confirm: true, user_metadata: { full_name: `E2E ${role}`, phone: userPhone, e2e_run_id: runId } });
      if (error || !data.user) throw error ?? new Error(`Could not create ${role}`);
      users[role] = { id: data.user.id, role, phone: userPhone, password };
      const roles = role === 'customer' ? ['customer'] : ['customer', role];
      for (const assignedRole of roles) {
        const { error: roleError } = await supabase.from('user_roles').insert({ user_id: data.user.id, role: assignedRole });
        if (roleError) throw roleError;
      }
    }

    const { error: addressError } = await supabase.from('addresses').insert({ user_id: users.customer.id, label: 'E2E Test Address', address_line: `E2E Address ${runId}`, is_default: true });
    if (addressError) throw addressError;

    const { data: store, error: storeError } = await supabase.from('stores').insert({ owner_id: users.merchant.id, name: `E2E Test Store ${runId}`, category: 'مطاعم', description: 'Temporary automated E2E store', address: 'E2E Test Address', phone: users.merchant.phone, delivery_fee: 15, min_order: 0, is_open: true, prep_minutes: 10, rating: 5 }).select('id').single();
    if (storeError || !store) throw storeError ?? new Error('Could not create E2E store');
    const { data: item, error: itemError } = await supabase.from('menu_items').insert({ store_id: store.id, name: `E2E Test Item ${runId}`, description: 'Temporary automated E2E item', price: 50, category: 'E2E', is_available: true }).select('id').single();
    if (itemError || !item) throw itemError ?? new Error('Could not create E2E menu item');
    const { error: invError } = await supabase.from('inventory_items').insert({ store_id: store.id, name: `E2E Stock ${runId}`, unit: 'قطعة', quantity: 100, low_stock_threshold: 5, cost_price: 20 });
    if (invError) throw invError;
    const { error: statusError } = await supabase.from('driver_status').upsert({ user_id: users.driver.id, is_online: false }, { onConflict: 'user_id' });
    if (statusError) throw statusError;

    const runtime: Runtime = { runId, users, storeId: store.id, menuItemId: item.id };
    await writeFile(runtimePath, JSON.stringify(runtime, null, 2), 'utf8');
    return async () => cleanup(supabase, runtime);
  } catch (error) {
    const partial: Runtime = { runId, users, storeId: '', menuItemId: '' };
    await cleanup(supabase, partial).catch(() => undefined);
    throw error;
  }
}
