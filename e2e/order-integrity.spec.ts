import { test, expect } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { runtime } from './helpers';

async function clientFor(role: string) {
  const data = await runtime();
  const account = data.users[role];
  const client = createClient(process.env.E2E_SUPABASE_URL!, (process.env.E2E_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY)!, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await client.auth.signInWithPassword({ email: `u_${account.phone.replace(/\D/g, '')}@talabak.internal.net`, password: account.password });
  expect(result.error).toBeNull();
  return { client, data };
}

function adminClient() {
  return createClient(process.env.E2E_SUPABASE_URL!, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}

test('server prices order and ignores injected item price', async () => {
  const { client, data } = await clientFor('customer');
  try {
    const created = await client.rpc('create_order_secure', {
      p_store_id: data.storeId,
      p_items: [{ menu_item_id: data.menuItemId, quantity: 2, price: 0.01, unit_price: 0.01 }],
      p_address: `Integrity ${data.runId}`, p_payment_method: 'cash', p_note: '', p_coupon_code: '',
    });
    expect(created.error).toBeNull();
    expect(created.data.customer_id).toBe(data.users.customer.id);
    expect(Number(created.data.subtotal)).toBe(100);
    expect(Number(created.data.delivery_fee)).toBe(15);
    expect(Number(created.data.total)).toBe(115);
    const lines = await client.from('order_items').select('unit_price,quantity').eq('order_id', created.data.id);
    expect(lines.error).toBeNull();
    expect(lines.data).toHaveLength(1);
    expect(Number(lines.data![0].unit_price)).toBe(50);
    const cancelled = await client.rpc('customer_cancel_order', { p_order_id: created.data.id });
    expect(cancelled.error).toBeNull();
  } finally { await client.auth.signOut(); }
});

for (const quantity of [0, -1, 31]) {
  test(`server rejects invalid quantity ${quantity} without creating an order`, async () => {
    const { client, data } = await clientFor('customer');
    const note = `invalid-${quantity}-${data.runId}`;
    try {
      const result = await client.rpc('create_order_secure', {
        p_store_id: data.storeId, p_items: [{ menu_item_id: data.menuItemId, quantity }],
        p_address: 'Test address', p_payment_method: 'cash', p_note: note, p_coupon_code: '',
      });
      expect(result.error?.code).toBe('P0001');
      expect(result.error?.message).toMatch(/Invalid quantity/);
      const rows = await client.from('orders').select('id').eq('customer_id', data.users.customer.id).eq('customer_note', note);
      expect(rows.error).toBeNull();
      expect(rows.data).toEqual([]);
    } finally { await client.auth.signOut(); }
  });
}

test('another authenticated customer cannot read or cancel an existing order', async () => {
  const owner = await clientFor('customer');
  // Driver fixture also has a customer role, but does not own this pending order.
  const other = await clientFor('driver');
  let orderId: string | undefined;
  try {
    const created = await owner.client.rpc('create_order_secure', {
      p_store_id: owner.data.storeId, p_items: [{ menu_item_id: owner.data.menuItemId, quantity: 1 }],
      p_address: 'IDOR fixture', p_payment_method: 'cash', p_note: '', p_coupon_code: '',
    });
    expect(created.error).toBeNull(); orderId = created.data.id;
    const visible = await owner.client.from('orders').select('id,status').eq('id', orderId).single();
    expect(visible.error).toBeNull(); expect(visible.data?.status).toBe('pending');
    const foreign = await other.client.from('orders').select('id').eq('id', orderId);
    expect(foreign.error).toBeNull(); expect(foreign.data).toEqual([]);
    const cancelled = await other.client.rpc('customer_cancel_order', { p_order_id: orderId });
    expect(cancelled.error?.code).toBe('P0001');
    expect(cancelled.error?.message).toMatch(/cannot be cancelled/);
    const unchanged = await owner.client.from('orders').select('status').eq('id', orderId).single();
    expect(unchanged.error).toBeNull(); expect(unchanged.data?.status).toBe('pending');
  } finally {
    if (orderId) await owner.client.rpc('customer_cancel_order', { p_order_id: orderId });
    await Promise.all([owner.client.auth.signOut(), other.client.auth.signOut()]);
  }
});

test('two online drivers cannot claim the same ready order concurrently', async () => {
  const owner = await clientFor('customer');
  const merchant = await clientFor('merchant');
  const firstDriver = await clientFor('driver');
  const admin = adminClient();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `e2e_driver_${suffix}@talabak.internal.net`;
  const password = `TalbakE2E!${suffix}Aa9`;
  let secondDriverId: string | undefined;
  let orderId: string | undefined;
  let secondDriver: SupabaseClient<any> | undefined;
  try {
    const createdUser = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'E2E competing driver', e2e_run_id: owner.data.runId } });
    expect(createdUser.error).toBeNull(); secondDriverId = createdUser.data.user?.id; expect(secondDriverId).toBeTruthy();
    const roles = await admin.from('user_roles').insert([{ user_id: secondDriverId!, role: 'customer' }, { user_id: secondDriverId!, role: 'driver' }]);
    expect(roles.error).toBeNull();
    secondDriver = createClient(process.env.E2E_SUPABASE_URL!, (process.env.E2E_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY)!, { auth: { persistSession: false, autoRefreshToken: false } });
    expect((await secondDriver.auth.signInWithPassword({ email, password })).error).toBeNull();
    expect((await firstDriver.client.rpc('update_driver_location', { p_latitude: 30.0444, p_longitude: 31.2357, p_accuracy_meters: 5 })).error).toBeNull();
    expect((await secondDriver.rpc('update_driver_location', { p_latitude: 30.045, p_longitude: 31.236, p_accuracy_meters: 5 })).error).toBeNull();

    const created = await owner.client.rpc('create_order_secure', { p_store_id: owner.data.storeId, p_items: [{ menu_item_id: owner.data.menuItemId, quantity: 1 }], p_address: 'Concurrent claim fixture', p_payment_method: 'cash', p_note: '', p_coupon_code: '' });
    expect(created.error).toBeNull(); orderId = created.data.id;
    for (const status of ['accepted', 'preparing', 'ready']) {
      const moved = await merchant.client.rpc('merchant_update_order', { p_order_id: orderId, p_status: status, p_estimated_minutes: 10 });
      expect(moved.error).toBeNull();
    }
    const claims = await Promise.all([firstDriver.client.rpc('driver_accept_order', { p_order_id: orderId }), secondDriver.rpc('driver_accept_order', { p_order_id: orderId })]);
    expect(claims.filter(result => !result.error)).toHaveLength(1);
    expect(claims.filter(result => result.error?.code === 'P0001')).toHaveLength(1);
    const assigned = await admin.from('orders').select('status,driver_id').eq('id', orderId).single();
    expect(assigned.error).toBeNull(); expect(assigned.data?.status).toBe('assigned');
    expect([firstDriver.data.users.driver.id, secondDriverId]).toContain(assigned.data?.driver_id);
  } finally {
    if (orderId) { await admin.from('order_items').delete().eq('order_id', orderId); await admin.from('orders').delete().eq('id', orderId); }
    await firstDriver.client.from('driver_status').update({ is_online: false }).eq('user_id', firstDriver.data.users.driver.id);
    if (secondDriver) await secondDriver.auth.signOut();
    if (secondDriverId) { await admin.from('notifications').delete().eq('user_id', secondDriverId); await admin.from('driver_status').delete().eq('user_id', secondDriverId); await admin.from('user_roles').delete().eq('user_id', secondDriverId); await admin.auth.admin.deleteUser(secondDriverId, false); }
    await Promise.all([owner.client.auth.signOut(), merchant.client.auth.signOut(), firstDriver.client.auth.signOut()]);
  }
});
