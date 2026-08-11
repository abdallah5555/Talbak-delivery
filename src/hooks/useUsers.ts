import { useState, useEffect } from 'react';
import { User } from '../types';
import { fetchUsersFromDb, saveUserToDb, updateUserStatusInDb, fetchUserProfileById, signOutUser } from '../lib/supabaseService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export function useUsers() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [usersList, setUsersList] = useState<User[]>([]);

  // Real Supabase Auth Listener & Session Handler
  useEffect(() => {
    let isMounted = true;

    async function initAuthSession() {
      if (!isSupabaseConfigured || !supabase) {
        if (isMounted) {
          setAuthStatus('unauthenticated');
          setCurrentUser(null);
        }
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await fetchUserProfileById(session.user.id);
          if (isMounted) {
            setCurrentUser(profile);
            setAuthStatus(profile ? 'authenticated' : 'unauthenticated');
          }
        } else {
          if (isMounted) {
            setCurrentUser(null);
            setAuthStatus('unauthenticated');
          }
        }
      } catch (e) {
        if (isMounted) {
          setCurrentUser(null);
          setAuthStatus('unauthenticated');
        }
      }
    }

    initAuthSession();

    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            const profile = await fetchUserProfileById(session.user.id);
            if (isMounted) {
              setCurrentUser(profile);
              setAuthStatus('authenticated');
            }
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setCurrentUser(null);
            setAuthStatus('unauthenticated');
          }
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }
  }, []);

  // Fetch Users List for Admin Dashboard from DB
  useEffect(() => {
    async function loadUsers() {
      if (currentUser?.role === 'admin') {
        const dbUsers = await fetchUsersFromDb();
        if (dbUsers) {
          setUsersList(dbUsers);
        }
      }
    }
    loadUsers();
  }, [currentUser?.role]);

  const toggleUserStatus = async (userId: string) => {
    let newStatus: 'active' | 'suspended' = 'active';
    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        newStatus = u.status === 'active' ? 'suspended' : 'active';
        return { ...u, status: newStatus };
      }
      return u;
    }));
    await updateUserStatusInDb(userId, newStatus);
  };

  const deleteUser = (userId: string) => {
    setUsersList(prev => prev.filter(u => u.id !== userId));
  };

  const logout = async () => {
    setCurrentUser(null);
    setAuthStatus('unauthenticated');
    try {
      await signOutUser();
    } catch (e) {
      console.error('Error signing out:', e);
    }
  };

  return {
    currentUser,
    setCurrentUser,
    authStatus,
    usersList,
    setUsersList,
    toggleUserStatus,
    deleteUser,
    logout
  };
}
