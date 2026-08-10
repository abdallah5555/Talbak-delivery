import { useState, useEffect } from 'react';
import { Order } from '../types';
import { 
  fetchOrdersFromDb, 
  createOrderInDb, 
  updateOrderStatusInDb, 
  acceptOrderAtomicInDb, 
  subscribeToOrdersRealtime 
} from '../lib/supabaseService';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('talabak_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load orders from Supabase DB on mount
  useEffect(() => {
    async function load() {
      const dbOrders = await fetchOrdersFromDb();
      if (dbOrders) {
        setOrders(dbOrders);
      }
    }
    load();
  }, []);

  // Realtime subscription for orders
  useEffect(() => {
    const unsubscribe = subscribeToOrdersRealtime(async () => {
      const freshOrders = await fetchOrdersFromDb();
      if (freshOrders) {
        setOrders(freshOrders);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('talabak_orders', JSON.stringify(orders));
  }, [orders]);

  const addOrder = async (newOrder: Order) => {
    setOrders(prev => [newOrder, ...prev]);
    await createOrderInDb(newOrder);
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status'], driverId?: string, driverStep?: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: newStatus,
          driverId: driverId || o.driverId,
          driverStep: driverStep || o.driverStep
        };
      }
      return o;
    }));
    await updateOrderStatusInDb(orderId, newStatus, driverId, driverStep);
  };

  const acceptOrderAtomic = async (orderId: string, driverId: string) => {
    const success = await acceptOrderAtomicInDb(orderId, driverId);
    if (success) {
      await updateOrderStatus(orderId, 'driver_assigned', driverId, 'accepted');
    } else {
      // Local fallback
      setOrders(prev => prev.map(o => {
        if (o.id === orderId && !o.driverId) {
          return { ...o, status: 'driver_assigned', driverId, driverStep: 'accepted' };
        }
        return o;
      }));
    }
    return success;
  };

  return {
    orders,
    setOrders,
    addOrder,
    updateOrderStatus,
    acceptOrderAtomic
  };
}
