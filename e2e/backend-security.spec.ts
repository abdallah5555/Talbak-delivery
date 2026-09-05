import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { runtime } from './helpers';

function env(name: string, fallback?: string) {
  const value = process.env[name] || (fallback ? process.env[fallback] : undefined);
  if (!value) throw new Error(`Missing ${name}${fallback ? ` and ${fallback}` : ''}`);
  return value;
}

async function customerClient() {
  const data = await runtime();
  const customer = data.users.customer;
  const client = createClient(
    env('E2E_SUPABASE_URL'),
    env('E2E_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const signIn = await client.auth.signInWithPassword({ email: `u_${customer.phone.replace(/\D/g, '')}@talabak.internal.net`, password: customer.password });
  expect(signIn.error).toBeNull();
  return { client, data, customer };
}

test('customer cannot invoke admin RPCs or mutate merchant store data', async () => {
  const { client, data, customer } = await customerClient();
  const adminCall = await client.rpc('admin_list_users');
  expect(adminCall.error, 'customer must not execute admin_list_users').toBeTruthy();
  const storeMutation = await client.from('stores').update({ name: 'UNAUTHORIZED_E2E_CHANGE' }).eq('id', data.storeId).select('id');
  expect(storeMutation.error || !(storeMutation.data?.length), 'customer must not update merchant store').toBeTruthy();
  const storeRead = await client.from('stores').select('owner_id').eq('id', data.storeId).single();
  expect(storeRead.error).toBeNull();
  expect(storeRead.data?.owner_id).not.toBe(customer.id);
  await client.auth.signOut();
});

test('anonymous client cannot read private customer/admin data', async () => {
  const data = await runtime();
  const anon = createClient(env('E2E_SUPABASE_URL'), env('E2E_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY'), { auth: { autoRefreshToken: false, persistSession: false } });
  const [profiles, orders, audit] = await Promise.all([
    anon.from('profiles').select('id').eq('id', data.users.customer.id),
    anon.from('orders').select('id').eq('customer_id', data.users.customer.id),
    anon.from('audit_logs').select('id').limit(1),
  ]);
  expect(profiles.data?.length ?? 0).toBe(0);
  expect(orders.data?.length ?? 0).toBe(0);
  expect(audit.data?.length ?? 0).toBe(0);
});
