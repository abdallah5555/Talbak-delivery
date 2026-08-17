import React, { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { DriverDashboard } from './components/DriverDashboard';
import { MerchantDashboard } from './components/MerchantDashboard';
import { supabase } from './lib/supabase';
import { User } from './types';
import './index.css';

const ACTIVE_ROLE_KEY = 'talabak_active_role';

function useActiveRole() {
  const [role, setRole] = useState<string | null>(() => localStorage.getItem(ACTIVE_ROLE_KEY));
  useEffect(() => {
    const sync = () => setRole(localStorage.getItem(ACTIVE_ROLE_KEY));
    window.addEventListener('talabak-role-change', sync);
    const timer = window.setInterval(sync, 500);
    return () => { window.removeEventListener('talabak-role-change', sync); window.clearInterval(timer); };
  }, []);
  return [role, setRole] as const;
}

async function loadRoleUser(role: 'driver' | 'merchant'): Promise<User | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: roleRow }] = await Promise.all([
    supabase.from('users').select('id,name,phone,status,rating,total_ratings,vehicle_type,store_id,created_at').eq('id', user.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', role).maybeSingle()
  ]);
  if (!profile || !roleRow) return null;
  return { id: profile.id, name: profile.name, phone: profile.phone, role, status: profile.status, rating: profile.rating, totalRatings: profile.total_ratings || 0, vehicleType: profile.vehicle_type, storeId: profile.store_id, createdAt: profile.created_at };
}

function DriverModeHost() {
  const [driver, setDriver] = useState<User | null>(null);
  const [role, setRole] = useActiveRole();
  useEffect(() => { let cancelled = false; if (role !== 'driver') { setDriver(null); return () => { cancelled = true; }; } void loadRoleUser('driver').then(v => { if (!cancelled) setDriver(v); }); return () => { cancelled = true; }; }, [role]);
  if (role !== 'driver' || !driver) return null;
  const exit = () => { localStorage.setItem(ACTIVE_ROLE_KEY, 'customer'); setRole('customer'); window.dispatchEvent(new CustomEvent('talabak-role-change', { detail: { role: 'customer' } })); };
  return <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-50"><div className="sticky top-0 z-10 bg-slate-900 text-white px-3 py-2.5 flex items-center justify-between gap-2"><span className="font-extrabold text-sm truncate">🛵 وضع الطيار — {driver.name}</span><button onClick={exit} className="bg-white/10 rounded-xl px-3 py-1.5 text-[11px] font-extrabold">الرجوع لعميل</button></div><DriverDashboard currentUser={driver} /></div>;
}

function MerchantModeHost() {
  const [merchant, setMerchant] = useState<User | null>(null);
  const [role, setRole] = useActiveRole();
  useEffect(() => { let cancelled = false; if (role !== 'merchant') { setMerchant(null); return () => { cancelled = true; }; } void loadRoleUser('merchant').then(v => { if (!cancelled) setMerchant(v); }); return () => { cancelled = true; }; }, [role]);
  if (role !== 'merchant' || !merchant) return null;
  const exit = () => { localStorage.setItem(ACTIVE_ROLE_KEY, 'customer'); setRole('customer'); window.dispatchEvent(new CustomEvent('talabak-role-change', { detail: { role: 'customer' } })); };
  return <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-50"><MerchantDashboard currentUser={merchant} onExit={exit} /></div>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /><DriverModeHost /><MerchantModeHost /></StrictMode>);
