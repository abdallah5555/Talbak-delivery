import { useState, useEffect } from 'react';
import { Store, MenuItem } from '../types';
import { stores as initialStores } from '../data/mockData';
import {
  fetchStoresFromDb,
  saveStoreToDb,
  updateStoreInDb,
  deleteStoreFromDb,
  createMenuItemInDb,
  updateMenuItemInDb,
  deleteMenuItemFromDb
} from '../lib/supabaseService';

export function useStores() {
  const [stores, setStores] = useState<Store[]>(() => {
    try {
      const saved = localStorage.getItem('talabak_stores');
      return saved ? JSON.parse(saved) : initialStores;
    } catch {
      return initialStores;
    }
  });

  useEffect(() => {
    async function load() {
      const dbStores = await fetchStoresFromDb();
      if (dbStores && dbStores.length > 0) {
        setStores(dbStores);
      }
    }
    load();
  }, []);

  useEffect(() => {
    localStorage.setItem('talabak_stores', JSON.stringify(stores));
  }, [stores]);

  const addStore = async (newStore: Store) => {
    setStores(prev => [newStore, ...prev]);
    await saveStoreToDb(newStore);
  };

  const updateStore = async (updatedStore: Store) => {
    setStores(prev => prev.map(s => s.id === updatedStore.id ? updatedStore : s));
    await updateStoreInDb(updatedStore);
  };

  const deleteStore = async (storeId: string) => {
    setStores(prev => prev.filter(s => s.id !== storeId));
    await deleteStoreFromDb(storeId);
  };

  const addMenuItem = async (storeId: string, item: MenuItem) => {
    setStores(prev => prev.map(s => {
      if (s.id === storeId) {
        const items = s.items ? [...s.items, item] : [item];
        return { ...s, items };
      }
      return s;
    }));
    await createMenuItemInDb({ ...item, storeId });
  };

  const updateMenuItem = async (item: MenuItem) => {
    setStores(prev => prev.map(s => {
      if (s.id === item.storeId) {
        const items = s.items ? s.items.map(i => i.id === item.id ? item : i) : [item];
        return { ...s, items };
      }
      return s;
    }));
    await updateMenuItemInDb(item);
  };

  const deleteMenuItem = async (storeId: string, itemId: string) => {
    setStores(prev => prev.map(s => {
      if (s.id === storeId) {
        const items = s.items ? s.items.filter(i => i.id !== itemId) : [];
        return { ...s, items };
      }
      return s;
    }));
    await deleteMenuItemFromDb(itemId);
  };

  return {
    stores,
    addStore,
    updateStore,
    deleteStore,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem
  };
}

