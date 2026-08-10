import { useState, useEffect } from 'react';
import { Store } from '../types';
import { stores as initialStores } from '../data/mockData';
import { fetchStoresFromDb, saveStoreToDb } from '../lib/supabaseService';

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

  const deleteStore = (storeId: string) => {
    setStores(prev => prev.filter(s => s.id !== storeId));
  };

  return { stores, addStore, deleteStore };
}
