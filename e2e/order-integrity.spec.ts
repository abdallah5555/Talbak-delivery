import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { runtime } from './helpers';

async function clientFor(role: string) {
  const data = await runtime();
  const account = data.users[role];
  const client = createClient(process.env.E2E_SUPABASE_URL!, (process.env.E2E_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY)!, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await client.auth.signInWithPassword({ email: `u_${account.phone.replace(/\D/g, '')}@talabak.internal.net`, password: account.password });
  expect(result.error).toBeNull();
  return { client, data };
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
