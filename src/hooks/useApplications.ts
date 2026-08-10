import { useState, useEffect } from 'react';
import { MerchantApplication, DriverApplication } from '../types';
import { fetchMerchantAppsFromDb, fetchDriverAppsFromDb } from '../lib/supabaseService';

export function useApplications() {
  const [merchantApps, setMerchantApps] = useState<MerchantApplication[]>(() => {
    try {
      const saved = localStorage.getItem('talabak_merchant_apps');
      return saved ? JSON.parse(saved) : [
        {
          id: 'merch-demo-1',
          storeName: 'كافيه ومشويات السلطان',
          businessType: 'مطعم',
          ownerName: 'محمد أحمد',
          phone: '01020304050',
          city: 'القاهرة - الدقي',
          notes: 'مطعم وجبات مشويات وطواجن شرقية',
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      ];
    } catch {
      return [];
    }
  });

  const [driverApps, setDriverApps] = useState<DriverApplication[]>(() => {
    try {
      const saved = localStorage.getItem('talabak_driver_apps');
      return saved ? JSON.parse(saved) : [
        {
          id: 'driver-demo-1',
          fullName: 'كابتن ياسر محمود',
          phone: '01122334455',
          vehicleType: 'موتوسيكل',
          vehicleModel: 'دايون 4 - 2023',
          noLicense: false,
          drivingLicenseNumber: 'EG-98214',
          vehicleLicenseNumber: 'M-10293',
          photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    async function load() {
      const dbMerchants = await fetchMerchantAppsFromDb();
      if (dbMerchants) setMerchantApps(dbMerchants);
      const dbDrivers = await fetchDriverAppsFromDb();
      if (dbDrivers) setDriverApps(dbDrivers);
    }
    load();
  }, []);

  useEffect(() => {
    localStorage.setItem('talabak_merchant_apps', JSON.stringify(merchantApps));
  }, [merchantApps]);

  useEffect(() => {
    localStorage.setItem('talabak_driver_apps', JSON.stringify(driverApps));
  }, [driverApps]);

  const addMerchantApp = (app: MerchantApplication) => setMerchantApps(prev => [app, ...prev]);
  const addDriverApp = (app: DriverApplication) => setDriverApps(prev => [app, ...prev]);

  const updateMerchantStatus = (id: string, status: 'approved' | 'rejected') => {
    setMerchantApps(prev => prev.map(m => m.id === id ? { ...m, status } : m));
  };

  const updateDriverStatus = (id: string, status: 'approved' | 'rejected') => {
    setDriverApps(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  return {
    merchantApps,
    driverApps,
    addMerchantApp,
    addDriverApp,
    updateMerchantStatus,
    updateDriverStatus
  };
}
