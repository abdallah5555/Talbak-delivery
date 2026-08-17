import { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { fetchUsersFromDb, updateUserStatusInDb, fetchUserProfileById, signOutUser } from '../lib/supabaseService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const ACTIVE_ROLE_KEY = 'talabak_active_role';
const VALID_ROLES = new Set<User['role']>(['customer', 'driver', 'merchant', 'admin']);

type UsersListUpdater = User[] | ((prev: User[]) => User[]);

function resolvePreferredRole(roles: User['role'][], fallback?: User['role']): User['role'] | undefined {
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('driver')) return 'driver';
  if (roles.includes('merchant')) return 'merchant';
  if (roles.includes('customer')) return 'customer';
  return fallback;
}

export function useUsers() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [usersListState, setUsersListState] = useState<User[]>([]);
  const isLoggingOutRef = useRef(false);
  const rolesByUserRef = useRef(new Map<string, User['role'][]>());

  const normalizeUsers = (users: User[]) => users.map(user => {
    const roles = rolesByUserRef.current.get(user.id) || [];
    const preferred = resolvePreferredRole(roles, user.role);
    return preferred ? { ...user, role: preferred } : user;
  });

  // Keep the resolved role map authoritative even when App.tsx refreshes the
  // users list from Supabase later. This prevents a Customer+Driver account
  // from being overwritten back to Customer by a second data-loading effect.
  const setUsersList = (next: UsersListUpdater) => {
    setUsersListState(prev => normalizeUsers(typeof next === 'function' ? next(prev) : next));
  };

  useEffect(() => {
    let isMounted = true;
    async function initAuthSession() {
      if (!isSupabaseConfigured || !supabase) {
        if (isMounted) { setAuthStatus('unauthenticated'); setCurrentUser(null); }
        return;
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && !isLoggingOutRef.current) {
          const profile = await fetchUserProfileById(session.user.id);
          const activeProfile = await resolveActiveRole(profile);
          if (isMounted && !isLoggingOutRef.current) { setCurrentUser(activeProfile); setAuthStatus(activeProfile ? 'authenticated' : 'unauthenticated'); }
        } else if (isMounted) { setCurrentUser(null); setAuthStatus('unauthenticated'); }
      } catch {
        if (isMounted) { setCurrentUser(null); setAuthStatus('unauthenticated'); }
      }
    }
    void initAuthSession();

    const handleRoleChange = async (event: Event) => {
      const role = (event as CustomEvent<{ role?: string }>).detail?.role;
      if (!role || !VALID_ROLES.has(role as User['role']) || !supabase || isLoggingOutRef.current) return;
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser || !isMounted) return;
      const { data: roleRow } = await supabase.from('user_roles').select('role').eq('user_id', authUser.id).eq('role', role).maybeSingle();
      if (!roleRow || !isMounted) return;
      localStorage.setItem(ACTIVE_ROLE_KEY, role);
      setCurrentUser(prev => prev ? { ...prev, role: role as User['role'] } : prev);
    };
    window.addEventListener('talabak-role-change', handleRoleChange);

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (isLoggingOutRef.current) {
          if (event === 'SIGNED_OUT' && isMounted) { setCurrentUser(null); setAuthStatus('unauthenticated'); }
          return;
        }
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            const profile = await fetchUserProfileById(session.user.id);
            const activeProfile = await resolveActiveRole(profile);
            if (isMounted && !isLoggingOutRef.current) { setCurrentUser(activeProfile); setAuthStatus('authenticated'); }
          }
        } else if (event === 'SIGNED_OUT' && isMounted) {
          localStorage.removeItem(ACTIVE_ROLE_KEY); setCurrentUser(null); setAuthStatus('unauthenticated');
        }
      });
      return () => { isMounted = false; subscription.unsubscribe(); window.removeEventListener('talabak-role-change', handleRoleChange); };
    }
    return () => { isMounted = false; window.removeEventListener('talabak-role-change', handleRoleChange); };
  }, []);

  async function resolveActiveRole(profile: User | null): Promise<User | null> {
    if (!profile || !supabase) return profile;
    try {
      const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', profile.id);
      const roles = (roleRows || []).map((row: { role: string }) => row.role).filter((role): role is User['role'] => VALID_ROLES.has(role as User['role']));
      if (roles.length > 0) {
        rolesByUserRef.current.set(profile.id, roles);
        const savedRole = localStorage.getItem(ACTIVE_ROLE_KEY) as User['role'] | null;
        const activeRole = savedRole && roles.includes(savedRole) ? savedRole : resolvePreferredRole(roles, profile.role);
        if (savedRole !== activeRole && activeRole) localStorage.setItem(ACTIVE_ROLE_KEY, activeRole);
        return { ...profile, role: activeRole || profile.role };
      }
    } catch (error) {
      console.warn('[Auth] Failed to resolve active role:', error);
    }
    return profile;
  }

  useEffect(() => {
    async function loadUsers() {
      if (currentUser?.role !== 'admin') return;
      const dbUsers = await fetchUsersFromDb();
      if (!dbUsers) return;

      if (supabase) {
        const { data: roleRows, error } = await supabase.from('user_roles').select('user_id, role');
        if (!error && roleRows) {
          const nextRoles = new Map<string, User['role'][]>();
          for (const row of roleRows as Array<{ user_id: string; role: string }>) {
            if (!VALID_ROLES.has(row.role as User['role'])) continue;
            const roles = nextRoles.get(row.user_id) || [];
            roles.push(row.role as User['role']);
            nextRoles.set(row.user_id, roles);
          }
          rolesByUserRef.current = nextRoles;
        }
      }

      setUsersListState(normalizeUsers(dbUsers));
    }
    void loadUsers();
  }, [currentUser?.role]);

  const toggleUserStatus = async (userId: string) => {
    let newStatus: 'active' | 'suspended' = 'active';
    setUsersList(prev => prev.map(u => {
      if (u.id === userId) { newStatus = u.status === 'active' ? 'suspended' : 'active'; return { ...u, status: newStatus }; }
      return u;
    }));
    await updateUserStatusInDb(userId, newStatus);
  };

  const deleteUser = (userId: string) => setUsersList(prev => prev.filter(u => u.id !== userId));

  const logout = async () => {
    isLoggingOutRef.current = true;
    setCurrentUser(null);
    setAuthStatus('unauthenticated');
    try { await signOutUser(); } catch (e) { console.error('Error signing out:', e); }
    finally { localStorage.removeItem(ACTIVE_ROLE_KEY); isLoggingOutRef.current = false; }
  };

  return { currentUser, setCurrentUser, authStatus, usersList: usersListState, setUsersList, toggleUserStatus, deleteUser, logout };
}
