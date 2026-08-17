import React, { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { DriverDashboard } from './components/DriverDashboard';
import { supabase } from './lib/supabase';
import { User } from './types';
import './index.css';

const ACTIVE_ROLE_KEY = 'talabak_active_role';

function DriverModeHost() {
  const [driver, setDriver] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<string | null>(() => localStorage.getItem(ACTIVE_ROLE_KEY));

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const role = localStorage.getItem(ACTIVE_ROLE_KEY);
      setActiveRole(role);
      if (role !== 'driver' || !supabase) {
        setDriver(null);
        return;
      }
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || cancelled) {
        setDriver(null);
        return;
      }
      const { data: profile } = await supabase
        .from('users')
        .select('id,name,phone,role,status,rating,total_ratings,vehicle_type,store_id,created_at')
        .eq('id', authUser.id)
        .maybeSingle();
      if (cancelled || !profile) return;
      const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', authUser.id).eq('role', 'driver').maybeSingle();
      if (roleRow) {
        setDriver({
          id: profile.id,
          name: profile.name,
          phone: profile.phone,
          role: 'driver',
          status: profile.status,
          rating: profile.rating,
          totalRatings: profile.total_ratings || 0,
          vehicleType: profile.vehicle_type,
          storeId: profile.store_id,
          createdAt: profile.created_at
        });
      } else {
        setDriver(null);
      }
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 700);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  if (activeRole !== 'driver' || !driver) return null;

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-50">
      <div className="sticky top-0 z-10 bg-slate-900 text-white border-b border-slate-700 px-3 py-2.5 shadow-lg flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0"><span className="text-base">🛵</span><span className="font-extrabold text-sm truncate">وضع الطيار — {driver.name}</span></div>
        <button type="button" onClick={() => { localStorage.setItem(ACTIVE_ROLE_KEY, 'customer'); setActiveRole('customer'); }} className="shrink-0 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-3 py-1.5 text-[11px] font-extrabold">الرجوع لعميل</button>
      </div>
      <DriverDashboard currentUser={driver} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <DriverModeHost />
  </StrictMode>,
);
