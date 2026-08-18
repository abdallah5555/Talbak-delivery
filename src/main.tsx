import React, { StrictMode, Suspense, lazy, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import { supabase } from './lib/supabase';
import { User } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const DriverDashboard = lazy(() => import('./components/DriverDashboard').then(m => ({ default: m.DriverDashboard })));
const MerchantDashboard = lazy(() => import('./components/MerchantDashboard').then(m => ({ default: m.MerchantDashboard })));
const ACTIVE_ROLE_KEY = 'talabak_active_role';
type Role = User['role'];
const LABELS: Record<Role, string> = { customer: 'عميل', driver: 'طيار', merchant: 'تاجر', admin: 'إدارة' };

function useActiveRole() {
  const [role, setRole] = useState<Role | null>(() => localStorage.getItem(ACTIVE_ROLE_KEY) as Role | null);
  useEffect(() => {
    const sync = () => setRole(localStorage.getItem(ACTIVE_ROLE_KEY) as Role | null);
    window.addEventListener('talabak-role-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('talabak-role-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return [role, setRole] as const;
}

async function loadRoleContext(): Promise<{ profile: User | null; roles: Role[] }> {
  if (!supabase) return { profile: null, roles: [] };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { profile: null, roles: [] };
  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from('users').select('id,name,phone,status,rating,total_ratings,vehicle_type,store_id,created_at,role').eq('id', user.id).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', user.id)
  ]);
  if (!profile) return { profile: null, roles: [] };
  const roles = Array.from(new Set([
    ...(roleRows || []).map((r: { role: string }) => r.role as Role).filter((r) => ['customer','driver','merchant','admin'].includes(r)),
    profile.role as Role
  ].filter((r): r is Role => ['customer','driver','merchant','admin'].includes(r))));
  const saved = localStorage.getItem(ACTIVE_ROLE_KEY) as Role | null;
  const active = saved && roles.includes(saved) ? saved : (roles.includes(profile.role as Role) ? profile.role as Role : roles[0] || 'customer');
  localStorage.setItem(ACTIVE_ROLE_KEY, active);
  return { profile: { id: profile.id, name: profile.name, phone: profile.phone, role: active, status: profile.status, rating: profile.rating, totalRatings: profile.total_ratings || 0, vehicleType: profile.vehicle_type, storeId: profile.store_id, createdAt: profile.created_at }, roles };
}

function RoleModeHost() {
  const [activeRole, setActiveRole] = useActiveRole();
  const [profile, setProfile] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const ctx = await loadRoleContext();
      if (cancelled) return;
      setProfile(ctx.profile);
      setRoles(ctx.roles);
      setActiveRole((localStorage.getItem(ACTIVE_ROLE_KEY) as Role | null) || ctx.profile?.role || 'customer');
    };
    void load();
    return () => { cancelled = true; };
  }, [setActiveRole, activeRole]);

  const switchRole = (role: Role) => {
    if (!roles.includes(role)) return;
    localStorage.setItem(ACTIVE_ROLE_KEY, role);
    setActiveRole(role);
    if (profile) setProfile({ ...profile, role });
    window.dispatchEvent(new CustomEvent('talabak-role-change', { detail: { role } }));
  };

  if (!profile || !activeRole || activeRole === 'customer' || activeRole === 'admin') return null;

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-50">
      <div className="sticky top-0 z-[210] bg-slate-900 text-white border-b border-slate-700 px-3 py-2.5 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0"><span className="text-base">{activeRole === 'driver' ? '🛵' : '🏪'}</span><span className="font-extrabold text-sm truncate">وضع {LABELS[activeRole]} — {profile.name}</span></div>
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-[55%]">
            {roles.filter((r) => r !== activeRole).map((role) => <button key={role} type="button" onClick={() => switchRole(role)} className="shrink-0 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-3 py-1.5 text-[10px] sm:text-[11px] font-extrabold">التبديل إلى {LABELS[role]}</button>)}
          </div>
        </div>
      </div>
      <Suspense fallback={<div className="p-6 text-center">جاري تحميل لوحة الدور…</div>}>
        {activeRole === 'driver' && <DriverDashboard currentUser={{ ...profile, role: 'driver' }} />}
        {activeRole === 'merchant' && <MerchantDashboard currentUser={{ ...profile, role: 'merchant' }} onExit={() => switchRole('customer')} />}
      </Suspense>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
        <RoleModeHost />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
