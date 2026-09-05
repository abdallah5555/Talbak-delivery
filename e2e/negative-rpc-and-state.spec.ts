import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { runtime } from './helpers';

function env(name: string, fallback?: string) {
  const value = process.env[name] || (fallback ? process.env[fallback] : undefined);
  if (!value) throw new Error(`Missing ${name}${fallback ? ` and ${fallback}` : ''}`);
  return value;
}

type Role = 'customer' | 'merchant' | 'driver';

async function signedClient(role: Role) {
  const data = await runtime();
  const account = data.users[role];
  const client = createClient(
    env('E2E_SUPABASE_URL'),
    env('E2E_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const email = `u_${account.phone.replace(/\D/g, '')}@talabak.internal.net`;
  const { error } = await client.auth.signInWithPassword({ email, password: account.password });
  expect(error).toBeNull();
  return { client, data, account };
}

async function assertRpcDenied(client: SupabaseClient, fn: string, args: Record<string, unknown>) {
  const result = await client.rpc(fn, args);
  expect(result.error, `${fn} must reject this caller/state`).toBeTruthy();
}

test.describe('negative RPC/state-guard coverage', () => {
  test('customer cannot call staff/admin transitions', async () => {
    const { client, data } = await signedClient('customer');
    await assertRpcDenied(client, 'admin_list_users', {});
    await assertRpcDenied(client, 'admin_set_order', { p_order_id: data.storeId, p_status: 'cancelled', p_driver_id: null });
    await assertRpcDenied(client, 'merchant_update_order', { p_order_id: data.storeId, p_status: 'accepted', p_estimated_minutes: 30 });
    await assertRpcDenied(client, 'driver_accept_order', { p_order_id: data.storeId });
    await client.auth.signOut();
  });

  test('merchant cannot call driver/admin transitions', async () => {
    const { client, data } = await signedClient('merchant');
    await assertRpcDenied(client, 'admin_set_role', { p_user_id: data.users.merchant.id, p_role: 'driver', p_enabled: true });
    await assertRpcDenied(client, 'admin_set_user_active', { p_user_id: data.users.merchant.id, p_active: false });
    await assertRpcDenied(client, 'driver_update_order', { p_order_id: data.storeId, p_status: 'delivered' });
    await client.auth.signOut();
  });

  test('driver cannot call merchant/admin transitions', async () => {
    const { client, data } = await signedClient('driver');
    await assertRpcDenied(client, 'admin_set_order', { p_order_id: data.storeId, p_status: 'cancelled', p_driver_id: null });
    await assertRpcDenied(client, 'merchant_update_order', { p_order_id: data.storeId, p_status: 'accepted', p_estimated_minutes: 30 });
    await client.auth.signOut();
  });

  test('driver cannot accept a non-ready order and invalid status transitions fail closed', async () => {
    const customer = await signedClient('customer');
    const { client: driver, data } = await signedClient('driver');

    const create = await customer.client.rpc('create_order_secure', {
      p_store_id: data.storeId,
      p_items: [{ menu_item_id: data.menuItemId, quantity: 1 }],
      p_address: `Negative test ${data.runId}`,
      p_payment_method: 'cash',
      p_note: '',
      p_coupon_code: '',
    });
    expect(create.error).toBeNull();
    const orderId = create.data?.id as string;
    expect(orderId).toBeTruthy();

    await assertRpcDenied(driver, 'driver_accept_order', { p_order_id: orderId });
    await assertRpcDenied(customer.client, 'driver_update_order', { p_order_id: orderId, p_status: 'delivered' });
    await assertRpcDenied(customer.client, 'customer_cancel_order', { p_order_id: '00000000-0000-0000-0000-000000000000' });

    await customer.client.auth.signOut();
    await driver.auth.signOut();
  });

  test('authenticated users cannot read audit log rows through direct table access unless policy allows it', async () => {
    const { client: customer } = await signedClient('customer');
    const { data, error } = await customer.from('audit_logs').select('id').limit(1);
    expect(error || (data?.length ?? 0) === 0).toBeTruthy();
    await customer.auth.signOut();
  });
});
