import { useState, useEffect } from 'react';
import { User } from '../types';
import { fetchUsersFromDb, saveUserToDb, updateUserStatusInDb } from '../lib/supabaseService';
import { hashValue } from '../lib/auth';

export function useUsers() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('talabak_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [usersList, setUsersList] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('talabak_users');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'admin-1',
        name: 'مدير النظام (Admin)',
        phone: '01501600192',
        password: '88226464',
        pin: '8822',
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString()
      },
      {
        id: 'user-demo',
        name: 'عميل جديد',
        phone: '01012345678',
        pin: '1234',
        role: 'customer',
        status: 'active',
        createdAt: new Date().toISOString()
      }
    ];
  });

  // Load from DB if available
  useEffect(() => {
    async function load() {
      const dbUsers = await fetchUsersFromDb();
      if (dbUsers && dbUsers.length > 0) {
        setUsersList(dbUsers);
      }
    }
    load();
  }, []);

  // Save current user to local storage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('talabak_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('talabak_current_user');
    }
  }, [currentUser]);

  // Save users list to local storage
  useEffect(() => {
    localStorage.setItem('talabak_users', JSON.stringify(usersList));
  }, [usersList]);

  const registerUser = async (newUser: User) => {
    let passHash = newUser.passwordHash;
    let pinHash = newUser.pinHash;
    if (!passHash && newUser.password) {
      passHash = await hashValue(newUser.password);
    }
    if (!pinHash && newUser.pin) {
      pinHash = await hashValue(newUser.pin);
    }

    const updatedUser: User = {
      ...newUser,
      passwordHash: passHash,
      pinHash: pinHash
    };

    setUsersList(prev => [...prev.filter(u => u.phone !== newUser.phone), updatedUser]);
    saveUserToDb(updatedUser);
  };

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

  return {
    currentUser,
    setCurrentUser,
    usersList,
    registerUser,
    toggleUserStatus,
    deleteUser
  };
}
