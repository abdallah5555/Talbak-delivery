import React, { useState, useEffect, useRef, useCallback } from 'react';
import { stores as initialStores, categories, initialOffersBanner } from './data/mockData';
import { Store, MenuItem, CartItem, CartItemOption, Order, User, MerchantApplication, DriverApplication, SiteSettings, Coupon, Notification as AppNotification } from './types';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useUsers } from './hooks/useUsers';

import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { CategoryList } from './components/CategoryList';
import { StoreCard } from './components/StoreCard';
import { StoreDetailsModal } from './components/StoreDetailsModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { PWAInstallGuideModal } from './components/PWAInstallGuideModal';
import { ShareAppModal } from './components/ShareAppModal';
import { VercelGuideModal } from './components/VercelGuideModal';
import { AuthModal } from './components/AuthModal';
import { PartnerApplyModal } from './components/PartnerApplyModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { WassalniModal } from './components/WassalniModal';
import { CustomerVerificationModal } from './components/CustomerVerificationModal';
import { AdBannersSection } from './components/AdBannersSection';
import { SocialLinksFooter } from './components/SocialLinksFooter';
import { PinVerificationModal } from './components/PinVerificationModal';
import { ReligiousReminderBanner } from './components/ReligiousReminderBanner';
import { NotificationDrawer } from './components/NotificationDrawer';
import { NotificationToast, ToastData } from './components/NotificationToast';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { useNotifications } from './hooks/useNotifications';
import { playNotificationSound } from './lib/soundService';
import { getDeviceSignature } from './lib/auth';
import { getNextRotatingReminder } from './lib/religiousReminders';
import {
  loadNotificationPreferences,
  sendPushNotification,
  subscribeToPushNotifications,
  isPushNotificationSupported,
  getNotificationPermissionState
} from './lib/pushNotificationService';
import { 
  fetchUsersFromDb, saveUserToDb, updateUserStatusInDb, adminCreateUser, updateUserInDb,
  fetchStoresFromDb, saveStoreToDb, updateStoreInDb, deleteStoreFromDb,
  createMenuItemInDb, updateMenuItemInDb, deleteMenuItemFromDb,
  fetchOrdersFromDb, saveOrderToDb, updateOrderStatusInDb, 
  fetchMerchantAppsFromDb, updateMerchantApplicationStatusInDb, saveMerchantApplicationToDb,
  fetchDriverAppsFromDb, updateDriverApplicationStatusInDb, saveDriverApplicationToDb,
  fetchCouponsFromDb, saveCouponToDb, deleteCouponFromDb,
  fetchComplaintsFromDb, fetchAuditLogsFromDb,
  isSupabaseConfigured, checkTrustedDevice, fetchUserProfileById
} from './lib/supabaseService';

import { Sparkles, Utensils, ShoppingCart, Bike, Flame, Star, Clock, CheckCircle2, MapPin, Search, ArrowLeft, Download, Smartphone, ShieldCheck, Building2, UserCheck } from 'lucide-react';

export default function App() {
  // PWA Install Hook
  const { isInstallable, isInstalled, platform, triggerInstall, hasDeferredPrompt } = usePWAInstall();

  // User Auth & Accounts State from Supabase Hook
  const {
    currentUser,
    setCurrentUser,
    authStatus,
    usersList,
    setUsersList,
    toggleUserStatus,
    deleteUser,
    logout
  } = useUsers();

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'security' | 'logout'>('security');
  const isLoggingOutRef = useRef(false);
  const isLogoutRequestedRef = useRef(false);

  const executeLogout = async () => {
    isLoggingOutRef.current = true;
    isLogoutRequestedRef.current = true;
    setIsPinModalOpen(false);
    setIsAdminDashboardOpen(false);
    try {
      await logout();
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setCurrentUser(null);
      setPinModalMode('security');
      setIsPinModalOpen(false);
      isLoggingOutRef.current = false;
      isLogoutRequestedRef.current = false;
    }
  };

  const handleLogoutRequest = () => {
    // PIN verification temporarily disabled - execute logout directly
    executeLogout();
  };

  // Security check for Trusted Devices & 48h PIN expiry (Temporarily disabled)
  useEffect(() => {
    // PIN verification temporarily disabled
    return;
  }, [currentUser?.id]);

  // Notifications State & Realtime Toast Management
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<ToastData | null>(null);

  const handleNewRealtimeNotification = useCallback((notif: AppNotification) => {
    setActiveToast({
      id: notif.id,
      title: notif.title,
      message: notif.message,
      type: notif.type
    });
  }, []);

  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    markAsRead: handleMarkNotificationAsRead,
    markAllAsRead: handleMarkAllNotificationsAsRead,
    deleteNotification: handleDeleteNotification
  } = useNotifications(currentUser, authStatus, handleNewRealtimeNotification);

  // Auto-subscribe Push Notifications on authenticated user if permission was previously granted
  useEffect(() => {
    if (
      currentUser?.id &&
      isPushNotificationSupported() &&
      getNotificationPermissionState() === 'granted'
    ) {
      const prefs = loadNotificationPreferences();
      if (prefs.pushEnabled) {
        subscribeToPushNotifications(currentUser).catch((err) => {
          console.warn('[App] Auto push subscription check error:', err);
        });
      }
    }
  }, [currentUser?.id]);

  // Dynamic Rotating Religious Reminder (Configurable Interval & Preferences)
  useEffect(() => {
    if (!currentUser?.id || authStatus === 'unauthenticated') {
      return;
    }

    const prefs = loadNotificationPreferences();
    if (!prefs.religiousRemindersEnabled) {
      return;
    }

    const intervalMinutes = prefs.religiousReminderIntervalMinutes || 30;
    const intervalMs = Math.max(5, intervalMinutes) * 60 * 1000;

    const intervalId = setInterval(() => {
      const currentPrefs = loadNotificationPreferences();
      if (!currentPrefs.religiousRemindersEnabled) return;

      const rem = getNextRotatingReminder();
      setActiveToast({
        id: 'religious-reminder-' + Date.now(),
        title: rem.title,
        message: rem.text,
        isReligious: true
      });

      if (currentPrefs.soundEnabled) {
        playNotificationSound();
      }
    }, intervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [currentUser?.id, authStatus]);

  // Site Settings & Brand Control State
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() => {
    try {
      const saved = localStorage.getItem('talabak_site_settings');
      return saved ? JSON.parse(saved) : {
        siteName: 'طلبك دليفري',
        logoUrl: '/favicon.svg',
        supportPhone: '01501600192',
        deliveryBaseFee: 15,
        bannerOfferText: 'خصم يصل إلى 50% على أشهى الوجبات والمطاعم المجاورة!'
      };
    } catch {
      return {
        siteName: 'طلبك دليفري',
        logoUrl: '/favicon.svg',
        supportPhone: '01501600192',
        deliveryBaseFee: 15,
        bannerOfferText: 'خصم يصل إلى 50% على أشهى الوجبات والمطاعم المجاورة!'
      };
    }
  });

  // App State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeAddress, setActiveAddress] = useState<string>('القاهرة، شارع الحرية - الدقي');

  // Stores State (Includes approved merchant stores)
  const [storesList, setStoresList] = useState<Store[]>(() => {
    try {
      const saved = localStorage.getItem('talabak_stores');
      return saved ? JSON.parse(saved) : initialStores;
    } catch {
      return initialStores;
    }
  });

  // Applications State (Merchants & Drivers)
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

  // Coupons State
  const [couponsList, setCouponsList] = useState<Coupon[]>(() => {
    try {
      const saved = localStorage.getItem('talabak_coupons');
      return saved ? JSON.parse(saved) : [
        { id: 'c-1', code: 'TALABAK10', discountType: 'percentage', discountValue: 10, isActive: false, usageLimit: 100, usedCount: 12, createdAt: new Date().toISOString() },
        { id: 'c-2', code: 'FREE20', discountType: 'fixed', discountValue: 20, isActive: false, usageLimit: 50, usedCount: 5, createdAt: new Date().toISOString() }
      ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('talabak_coupons', JSON.stringify(couponsList));
  }, [couponsList]);
  
  // Modals & Drawers State
  const [activeStoreModal, setActiveStoreModal] = useState<Store | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState<boolean>(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [isVercelGuideOpen, setIsVercelGuideOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isPartnerApplyOpen, setIsPartnerApplyOpen] = useState<boolean>(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState<boolean>(false);
  const [isWassalniOpen, setIsWassalniOpen] = useState<boolean>(false);
  const [isCustomerVerificationOpen, setIsCustomerVerificationOpen] = useState<boolean>(false);

  // Auto-open Admin Dashboard if current logged-in user is admin
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      setIsAdminDashboardOpen(true);
    }
  }, [currentUser?.role]);

  // Auto-clear order history at the start of every month
  useEffect(() => {
    try {
      const currentMonthKey = `${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
      const lastClearedMonth = localStorage.getItem('talabak_last_cleared_month');
      if (lastClearedMonth !== currentMonthKey) {
        setOrders([]);
        localStorage.setItem('talabak_last_cleared_month', currentMonthKey);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Tabs & Cart/Order Data
  const [activeBottomTab, setActiveBottomTab] = useState<'home' | 'offers' | 'orders'>('home');
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('talabak_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('talabak_orders');
      return saved ? JSON.parse(saved) : [
        {
          id: '10928',
          items: [],
          subtotal: 120,
          deliveryFee: 15,
          discount: 0,
          total: 135,
          status: 'on_way',
          createdAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          deliveryAddress: {
            street: 'شارع الحرية',
            building: 'عمارة 12',
            floor: '3',
            phone: '01012345678'
          },
          paymentMethod: 'cash',
          estimatedMinutes: 20,
          driver: {
            name: 'أحمد محمود',
            phone: '01122334455',
            vehicle: 'سكوتر دليفري أحمر',
            rating: 4.9,
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
          }
        }
      ];
    } catch {
      return [];
    }
  });

  const [checkoutDiscount, setCheckoutDiscount] = useState<number>(0);

  // Sync settings & lists to local storage
  useEffect(() => {
    localStorage.setItem('talabak_site_settings', JSON.stringify(siteSettings));
  }, [siteSettings]);

  useEffect(() => {
    localStorage.setItem('talabak_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem('talabak_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('talabak_stores', JSON.stringify(storesList));
  }, [storesList]);

  useEffect(() => {
    localStorage.setItem('talabak_merchant_apps', JSON.stringify(merchantApps));
  }, [merchantApps]);

  useEffect(() => {
    localStorage.setItem('talabak_driver_apps', JSON.stringify(driverApps));
  }, [driverApps]);

  // Load initial data from Supabase DB if configured
  useEffect(() => {
    async function initDbData() {
      if (isSupabaseConfigured) {
        const [dbUsers, dbStores, dbOrders, dbMerchants, dbDrivers, dbCoupons] = await Promise.all([
          fetchUsersFromDb(),
          fetchStoresFromDb(),
          fetchOrdersFromDb(),
          fetchMerchantAppsFromDb(),
          fetchDriverAppsFromDb(),
          fetchCouponsFromDb()
        ]);

        if (dbUsers && dbUsers.length > 0) {
          setUsersList(prev => {
            const map = new Map<string, User>();
            prev.forEach(u => map.set(u.phone, u));
            dbUsers.forEach(u => map.set(u.phone, u));
            return Array.from(map.values());
          });
        }
        if (dbStores && dbStores.length > 0) setStoresList(dbStores);
        if (dbOrders && dbOrders.length > 0) setOrders(dbOrders);
        if (dbMerchants !== null) setMerchantApps(dbMerchants);
        if (dbDrivers !== null) setDriverApps(dbDrivers);
        if (dbCoupons !== null) setCouponsList(dbCoupons);
      }
    }
    initDbData();
  }, []);

  // Sync users & orders across browser tabs via storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'talabak_users' && e.newValue) {
        try {
          setUsersList(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === 'talabak_orders' && e.newValue) {
        try {
          setOrders(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Handlers
  const handleUpdateSiteSettings = (newSettings: Partial<SiteSettings>) => {
    setSiteSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleToggleUserStatus = (userId: string) => {
    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        const nextStatus = u.status === 'suspended' ? 'active' : 'suspended';
        updateUserStatusInDb(userId, nextStatus);
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  const handleDeleteUser = (userId: string) => {
    setUsersList(prev => prev.filter(u => u.id !== userId));
    if (currentUser?.id === userId) {
      setCurrentUser(null);
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    setUsersList(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser?.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    const res = await updateUserInDb(updatedUser);
    if (!res.success) {
      return { success: false, error: res.error };
    }
    return { success: true, error: null };
  };

  const handleCreateStore = async (newStore: Store) => {
    setStoresList(prev => [newStore, ...prev]);
    await saveStoreToDb(newStore);
  };

  const handleUpdateStore = async (updatedStore: Store) => {
    setStoresList(prev => prev.map(s => s.id === updatedStore.id ? updatedStore : s));
    await updateStoreInDb(updatedStore);
  };

  const handleDeleteStore = async (storeId: string) => {
    setStoresList(prev => prev.filter(s => s.id !== storeId));
    await deleteStoreFromDb(storeId);
  };

  const handleCreateMenuItem = async (item: MenuItem) => {
    setStoresList(prev => prev.map(s => {
      if (s.id === item.storeId) {
        const items = s.items ? [...s.items, item] : [item];
        return { ...s, items };
      }
      return s;
    }));
    await createMenuItemInDb(item);
  };

  const handleUpdateMenuItem = async (item: MenuItem) => {
    setStoresList(prev => prev.map(s => {
      if (s.id === item.storeId) {
        const items = s.items ? s.items.map(i => i.id === item.id ? item : i) : [item];
        return { ...s, items };
      }
      return s;
    }));
    await updateMenuItemInDb(item);
  };

  const handleDeleteMenuItem = async (storeId: string, itemId: string) => {
    setStoresList(prev => prev.map(s => {
      if (s.id === storeId) {
        const items = s.items ? s.items.filter(i => i.id !== itemId) : [];
        return { ...s, items };
      }
      return s;
    }));
    await deleteMenuItemFromDb(itemId);
  };

  const handleUpdateUserDocs = (idFrontUrl: string, idBackUrl: string) => {
    if (!currentUser) return;
    const updatedUser: User = {
      ...currentUser,
      verificationDocs: {
        idFrontUrl,
        idBackUrl,
        status: 'pending'
      }
    };
    setCurrentUser(updatedUser);
    setUsersList(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
  };

  const handleUpdateUserDocsStatus = (userId: string, status: 'approved' | 'rejected', reason?: string) => {
    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          verificationDocs: u.verificationDocs ? {
            ...u.verificationDocs,
            status,
            rejectReason: reason
          } : undefined
        };
      }
      return u;
    }));
  };

  const handleSubmitWassalniOrder = (wassalniOrder: Order) => {
    setOrders(prev => [wassalniOrder, ...prev]);
    setIsTrackingOpen(true);
  };

  const handleOpenWassalni = () => {
    if (!currentUser) {
      alert('خدمة "وصّلي" مخصصة للعملاء المسجلين فقط. يرجى تسجيل الدخول أو إنشاء حساب عميل جديد للبدء.');
      setIsAuthOpen(true);
      return;
    }
    if (currentUser.role !== 'customer') {
      alert('عفواً، هذه الخدمة مخصصة لحسابات العملاء فقط.');
      return;
    }
    setIsWassalniOpen(true);
  };

  const handleUpdateOrderAddress = (orderId: string, updatedAddress: { street: string; phone: string; notes: string }) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          deliveryAddress: {
            ...o.deliveryAddress,
            street: updatedAddress.street,
            phone: updatedAddress.phone,
            notes: updatedAddress.notes
          }
        };
      }
      return o;
    }));
  };

  const handleUpdateOrderItems = (orderId: string, updatedItems: CartItem[]) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const newSubtotal = updatedItems.reduce((acc, ci) => {
          const optsPrice = ci.selectedOptions.reduce((oAcc, o) => oAcc + o.price, 0);
          return acc + (ci.item.price + optsPrice) * ci.quantity;
        }, 0);
        const newTotal = Math.max(0, newSubtotal + o.deliveryFee - o.discount);
        return {
          ...o,
          items: updatedItems,
          subtotal: newSubtotal,
          total: newTotal
        };
      }
      return o;
    }));
  };

  const handleCancelOrder = (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
  };

  const handleRateOrder = (orderId: string, driverRating: number, driverReview: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          ratings: {
            ...o.ratings,
            driverRating,
            driverReview
          }
        };
      }
      return o;
    }));
  };

  const handleCreateUser = async (newUser: User, password?: string) => {
    if (isSupabaseConfigured) {
      const res = await adminCreateUser({
        name: newUser.name,
        phone: newUser.phone,
        password: password || 'Talabak@123',
        role: newUser.role,
        isAdminMain: newUser.isAdminMain,
        adminPermissions: newUser.adminPermissions,
        adminPhotoUrl: newUser.adminPhotoUrl
      });
      if (res.error || !res.user) {
        return { success: false, error: res.error || 'تعذر إنشاء الحساب.' };
      }
      setUsersList(prev => {
        const filtered = prev.filter(u => u.id !== res.user!.id && u.phone !== res.user!.phone);
        return [res.user!, ...filtered];
      });
      return { success: true, error: null };
    }

    setUsersList(prev => {
      const filtered = prev.filter(u => u.id !== newUser.id);
      return [newUser, ...filtered];
    });
    return { success: true, error: null };
  };

  // Handle PWA Triggering
  const handleInstallClick = async () => {
    const res = await triggerInstall();
    if (res === 'manual_guide') {
      setIsInstallGuideOpen(true);
    }
  };

  // Merchant Application Submissions & Approvals
  const handleMerchantSubmit = async (app: MerchantApplication) => {
    setMerchantApps(prev => [app, ...prev]);
    await saveMerchantApplicationToDb(app);
    // Push notification to Admins
    sendPushNotification({
      role: 'admin',
      title: 'طلب انضمام متجر جديد 🏪',
      body: `تم تقديم طلب انضمام جديد لمتجر: ${app.storeName} (${app.ownerName})`,
      type: 'admin',
      url: '/'
    }).catch(err => console.warn('[App] Admin push notification error:', err));
  };

  const handleDriverSubmit = async (app: DriverApplication) => {
    setDriverApps(prev => [app, ...prev]);
    await saveDriverApplicationToDb(app);
    // Push notification to Admins
    sendPushNotification({
      role: 'admin',
      title: 'طلب انضمام كابتن توصيل 🛵',
      body: `تم تقديم طلب انضمام جديد من الكابتن: ${app.fullName}`,
      type: 'admin',
      url: '/'
    }).catch(err => console.warn('[App] Admin push notification error:', err));
  };

  const handleApproveMerchant = async (appId: string) => {
    setMerchantApps(prev => prev.map(m => m.id === appId ? { ...m, status: 'approved' } : m));
    await updateMerchantApplicationStatusInDb(appId, 'approved');

    const app = merchantApps.find(m => m.id === appId);
    if (app) {
      const storeId = 'store-' + Date.now();
      // Create live Store entry
      const newStore: Store = {
        id: storeId,
        name: app.storeName,
        category: app.businessType.includes('سوبر') ? 'supermarket' : app.businessType.includes('صيدلية') ? 'pharmacy' : 'restaurants',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
        banner: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
        rating: 5.0,
        reviewsCount: 1,
        deliveryTime: '20-30 دقيقة',
        deliveryFee: siteSettings.deliveryBaseFee || 15,
        minOrder: 30,
        isOpen: true,
        distance: '1.2 كم',
        address: app.city || 'وسط البلد',
        tags: [app.businessType, 'جديد', 'معتمد'],
        items: [
          {
            id: 'item-' + Date.now() + '-1',
            storeId: storeId,
            name: 'الوجبة الرئيسية للمتجر',
            description: 'منتج مميز طازج متاح للطلب التلقائي',
            price: 85,
            image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
            isPopular: true,
            category: 'الرئيسية'
          }
        ]
      };
      setStoresList(prev => [newStore, ...prev]);
      await saveStoreToDb(newStore);

      // Create Merchant User Account so merchant can login!
      const newMerchantUser: User = {
        id: 'usr-merch-' + Date.now(),
        name: app.ownerName || app.storeName,
        phone: app.phone,
        role: 'merchant',
        status: 'active',
        storeId: storeId,
        createdAt: new Date().toISOString()
      };
      await saveUserToDb(newMerchantUser);
    }
  };

  const handleRejectMerchant = async (appId: string) => {
    setMerchantApps(prev => prev.map(m => m.id === appId ? { ...m, status: 'rejected' } : m));
    await updateMerchantApplicationStatusInDb(appId, 'rejected');
  };

  const handleApproveDriver = async (appId: string) => {
    setDriverApps(prev => prev.map(d => d.id === appId ? { ...d, status: 'approved' } : d));
    await updateDriverApplicationStatusInDb(appId, 'approved');

    const app = driverApps.find(d => d.id === appId);
    if (app) {
      // Create Driver User Account so driver can login!
      const newDriverUser: User = {
        id: 'usr-driver-' + Date.now(),
        name: app.fullName,
        phone: app.phone,
        role: 'driver',
        status: 'active',
        vehicleType: app.vehicleType,
        rating: 5.0,
        totalRatings: 1,
        createdAt: new Date().toISOString()
      };
      await saveUserToDb(newDriverUser);
    }
  };

  const handleRejectDriver = async (appId: string) => {
    setDriverApps(prev => prev.map(d => d.id === appId ? { ...d, status: 'rejected' } : d));
    await updateDriverApplicationStatusInDb(appId, 'rejected');
  };

  const handleUpdateCoupons = async (updated: Coupon[]) => {
    const prevMap = new Map<string, Coupon>(couponsList.map(c => [c.id, c]));
    const nextMap = new Map<string, Coupon>(updated.map(c => [c.id, c]));

    setCouponsList(updated);

    if (isSupabaseConfigured) {
      // Delete missing coupons from DB
      for (const id of Array.from(prevMap.keys())) {
        if (!nextMap.has(id)) {
          await deleteCouponFromDb(id);
        }
      }
      // Upsert added or modified coupons
      for (const coupon of updated) {
        await saveCouponToDb(coupon);
      }
    }
  };

  const handleRegisterUser = (newUser: User) => {
    setUsersList(prev => [...prev.filter(u => u.phone !== newUser.phone), newUser]);
    saveUserToDb(newUser);
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    updateOrderStatusInDb(orderId, newStatus);

    // Trigger Push Notification to Customer based on new status
    const statusMessages: Record<Order['status'], string> = {
      received: 'تم استلام طلبك بنجاح وجاري مراجعته 🛍️',
      sent: 'تم إرسال الطلب للمتجر 📤',
      preparing: 'المطعم يقوم بتجهيز وجبتك الطازجة الآن 🍳',
      driver_assigned: 'تم تعيين كابتن التوصيل وسيتوجه للمطعم فوراً 🛵',
      arrived_store: 'الكابتن وصل إلى المتجر لاستلام طلبك 🏪',
      picked_up: 'الكابتن استلم الطلب وهو في الطريق إلى عنوانك 🚀',
      arrived_customer: 'الكابتن وصل إلى موقع التوصيل 📍',
      delivered: 'تم تسليم طلبك بنجاح! بالهناء والشفاء 🎉',
      cancelled: 'تم إلغاء الطلب.'
    };

    const targetOrder = orders.find(o => o.id === orderId);
    const customerUser = targetOrder?.deliveryAddress?.phone
      ? usersList.find(u => u.phone === targetOrder.deliveryAddress.phone)
      : null;

    sendPushNotification({
      userId: customerUser?.id,
      title: `تحديث الطلب #${orderId} 🛵`,
      body: statusMessages[newStatus] || `تم تحديث حالة طلبك إلى: ${newStatus}`,
      orderId: orderId,
      type: 'order',
      url: '/'
    }).catch(err => console.warn('[App] Push order update error:', err));
  };

  // Cart operations
  const handleAddToCart = (item: MenuItem, selectedOptions: CartItemOption[], specialNotes: string) => {
    const currentStore = storesList.find((s) => s.id === item.storeId);
    const uniqueId = `${item.id}-${JSON.stringify(selectedOptions)}-${specialNotes}`;

    setCartItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.uniqueId === uniqueId);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          uniqueId,
          item,
          storeName: currentStore?.name || 'طلبك دليفري',
          storeId: item.storeId,
          quantity: 1,
          selectedOptions,
          specialNotes
        }
      ];
    });

    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (uniqueId: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((ci) => {
          if (ci.uniqueId === uniqueId) {
            const newQty = ci.quantity + delta;
            return newQty > 0 ? { ...ci, quantity: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveItem = (uniqueId: string) => {
    setCartItems((prev) => prev.filter((ci) => ci.uniqueId !== uniqueId));
  };

  const handleProceedToCheckout = (discountAmount: number) => {
    setCheckoutDiscount(discountAmount);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleConfirmOrder = (details: {
    address: { street: string; building: string; floor: string; phone: string; notes: string };
    paymentMethod: 'cash' | 'vodafone_cash' | 'card';
  }) => {
    const subtotal = cartItems.reduce((acc, ci) => {
      const optsP = ci.selectedOptions.reduce((a, b) => a + b.price, 0);
      return acc + (ci.item.price + optsP) * ci.quantity;
    }, 0);
    const deliveryFee = 15;
    const total = Math.max(0, subtotal + deliveryFee - checkoutDiscount);

    const newOrder: Order = {
      id: Math.floor(10000 + Math.random() * 90000).toString(),
      items: [...cartItems],
      subtotal,
      deliveryFee,
      discount: checkoutDiscount,
      total,
      status: 'received',
      createdAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      deliveryAddress: details.address,
      paymentMethod: details.paymentMethod,
      paymentPaidOnline: details.paymentMethod !== 'cash',
      estimatedMinutes: 25,
      driver: {
        name: 'كابتن محمود علي',
        phone: '01099887766',
        vehicle: 'دراجة نارية دليفري',
        rating: 4.8,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
      }
    };

    setOrders([newOrder, ...orders]);
    saveOrderToDb(newOrder);

    // Push notification to all active Drivers & Admins
    sendPushNotification({
      role: 'driver',
      title: 'طلب توصيل جديد 🛵',
      body: `متاح طلب جديد برقم #${newOrder.id} للتوصيل إلى: ${newOrder.deliveryAddress.street}`,
      orderId: newOrder.id,
      type: 'driver',
      url: '/'
    }).catch(err => console.warn('[App] Push to drivers error:', err));

    sendPushNotification({
      role: 'admin',
      title: 'طلب جديد في طلبك دليفري 🛍️',
      body: `تم استلام طلب جديد برقم #${newOrder.id} بقيمة ${newOrder.total} ج.م`,
      orderId: newOrder.id,
      type: 'admin',
      url: '/'
    }).catch(err => console.warn('[App] Push to admin error:', err));

    // Auto register or update customer if phone is provided
    if (details.address?.phone && !usersList.some(u => u.phone === details.address.phone)) {
      const newCust: User = {
        id: 'usr-' + Date.now(),
        name: details.address.street || 'عميل جديد',
        phone: details.address.phone,
        role: 'customer',
        status: 'active',
        createdAt: new Date().toISOString()
      };
      saveUserToDb(newCust);
    }

    setCartItems([]);
    setIsCheckoutOpen(false);
    setIsTrackingOpen(true);
  };

  // Filtering stores
  const filteredStores = storesList.filter((store) => {
    const matchesCategory = selectedCategory === 'all' || store.category === selectedCategory;
    const matchesSearch =
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      store.items.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (activeBottomTab === 'offers') {
      return matchesCategory && matchesSearch && store.items.some((i) => i.originalPrice);
    }
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24 md:pb-10 selection:bg-orange-500 selection:text-white overflow-x-hidden w-full max-w-full">
      
      {/* Navigation Header */}
      <Navbar
        siteName={siteSettings.siteName}
        logoUrl={siteSettings.logoUrl}
        cartCount={cartItems.reduce((acc, i) => acc + i.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenVercelGuide={() => setIsVercelGuideOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenPartnerApply={() => setIsPartnerApplyOpen(true)}
        onOpenAdminDashboard={() => setIsAdminDashboardOpen(true)}
        onOpenWassalni={handleOpenWassalni}
        currentUser={currentUser}
        onLogout={handleLogoutRequest}
        isInstalled={isInstalled}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeAddress={activeAddress}
        onChangeAddress={() => {
          const newAddr = prompt('أدخل عنوان التوصيل الجديد:', activeAddress);
          if (newAddr) setActiveAddress(newAddr);
        }}
        unreadNotificationsCount={unreadCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-6 w-full max-w-full overflow-x-hidden">

        {/* Visible Religious Reminder Banner for Authenticated App */}
        {currentUser && (
          <ReligiousReminderBanner />
        )}

        {/* Quick Partner Recruitment & Admin Bar Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-4 px-5 shadow-lg border border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-center sm:text-right">
            <div className="w-9 h-9 rounded-xl bg-orange-600/20 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-white flex items-center justify-center sm:justify-start gap-1.5">
                انضم لعائلة "طلبك دليفري" كمتجر أو طيار توصيل
              </h4>
              <p className="text-[11px] text-slate-300">
                وسع نطاق مبيعاتك وأرباحك اليوم بخطوات بسيطة وبدون رسوم اشتراك
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsPartnerApplyOpen(true)}
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>تقديم طلب انضمام</span>
            </button>
          </div>
        </div>

        {/* PWA App Install Banner Alert (If not installed) */}
        {!isInstalled && (
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-orange-400/30">
            <div className="flex items-center gap-3.5 text-center sm:text-right">
              <div className="w-12 h-12 rounded-2xl bg-white p-2 shadow-md shrink-0 mx-auto sm:mx-0">
                <img src="/favicon.svg" alt="طلبك دليفري" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-1.5">
                  <h3 className="font-extrabold text-base">ثبّت تطبيق "طلبك دليفري" على موبايلك!</h3>
                  <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    تثبيت بنقرة واحدة
                  </span>
                </div>
                <p className="text-xs text-orange-100 mt-1 leading-relaxed">
                  احصل على تجربة أسرع بدون الحاجة للدخول للمتصفح في كل مرة. يعمل على أجهزة أندرويد وآيفون مجاناً.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstallClick}
                className="bg-white text-orange-700 hover:bg-orange-50 font-extrabold text-xs px-5 py-2.5 rounded-2xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-orange-600" />
                تثبيت التطبيق الآن
              </button>
              <button
                onClick={() => setIsInstallGuideOpen(true)}
                className="bg-black/20 hover:bg-black/30 text-white text-xs font-bold px-3 py-2.5 rounded-2xl transition-colors"
              >
                طريقة التنزيل
              </button>
            </div>
          </div>
        )}

        {/* Offers Banners Carousel */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {initialOffersBanner.map((banner) => (
            <div
              key={banner.id}
              className={`relative bg-gradient-to-r ${banner.bgColor} rounded-3xl p-6 text-white shadow-lg overflow-hidden flex items-center justify-between h-40 group cursor-pointer`}
              onClick={() => {
                setSelectedCategory('restaurants');
              }}
            >
              <div className="space-y-1 z-10 max-w-[65%]">
                <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  عرض لفترة محدودة 🔥
                </span>
                <h3 className="font-black text-lg sm:text-xl leading-tight mt-1">{banner.title}</h3>
                <p className="text-xs text-white/90 font-medium line-clamp-1">{banner.subtitle}</p>
                <button className="mt-2 text-xs font-extrabold text-slate-900 bg-white hover:bg-slate-100 px-3.5 py-1.5 rounded-xl shadow transition-all flex items-center gap-1">
                  اطلب الآن
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>

              <img
                src={banner.image}
                alt={banner.title}
                className="absolute left-[-20px] bottom-[-20px] w-48 h-48 object-cover rounded-full border-4 border-white/20 shadow-2xl group-hover:scale-105 transition-transform duration-500 opacity-90"
              />
            </div>
          ))}
        </section>

        {/* Dynamic Ad Banners (Future Ads set by Admin) */}
        <AdBannersSection banners={siteSettings.adBanners} />

        {/* Categories Horizontal Bar */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-orange-600" />
              أقسام الطلبات والتوصيل:
            </h2>
            {selectedCategory !== 'all' && (
              <button
                onClick={() => setSelectedCategory('all')}
                className="text-xs text-orange-600 font-bold hover:underline"
              >
                عرض كل الأقسام
              </button>
            )}
          </div>

          <CategoryList
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={(id) => setSelectedCategory(id)}
          />
        </section>

        {/* Stores Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-lg text-slate-900">
                {activeBottomTab === 'offers' ? 'العروض والتخفيضات المميزة' : 'المطاعم والمتاجر القريبة منك'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {filteredStores.length} متجر متاح للتوصيل السريع لعنوانك
              </p>
            </div>

            {/* Tracking Quick Badge */}
            {orders.length > 0 && (
              <button
                onClick={() => setIsTrackingOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow transition-all flex items-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span>متابعة الطلب الحالى (#{orders[0].id.slice(-4)})</span>
              </button>
            )}
          </div>

          {filteredStores.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
              <Search className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-extrabold text-base text-slate-800">لم نجد أي مطاعم أو متاجر تطابق بحثك</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                جرب تغيير اسم البحث أو مسح الفلتر لعرض باقي المحلات المتاحة في منطقتك.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="bg-orange-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow"
              >
                إعادة ضبط البحث
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStores.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  onClick={() => setActiveStoreModal(store)}
                />
              ))}
            </div>
          )}
        </section>

      </main>

      {/* App Footer */}
      <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 py-10 px-4 mt-12 pb-28 sm:pb-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 p-1.5 shadow-md flex items-center justify-center shrink-0">
                <img src={siteSettings.logoUrl} alt="" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-lg font-black text-white">{siteSettings.siteName}</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {siteSettings.slogan || 'أسرع تطبيق دليفري وتوصيل للمطاعم والسوبرماركت والخدمات الخاصة'}
            </p>
          </div>

          {/* Col 2: Social Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400">تابعنا على وسائل التواصل</h4>
            <div className="flex flex-wrap items-center gap-2">
              {siteSettings.socialLinks?.facebook && (
                <a href={siteSettings.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all">
                  <span>فيسبوك</span>
                </a>
              )}
              {siteSettings.socialLinks?.whatsapp && (
                <a href={siteSettings.socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs px-3 py-1.5 rounded-xl border border-emerald-500/30 flex items-center gap-1.5 transition-all">
                  <span>واتساب الدعم</span>
                </a>
              )}
              {siteSettings.socialLinks?.instagram && (
                <a href={siteSettings.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all">
                  <span>انستجرام</span>
                </a>
              )}
              {siteSettings.socialLinks?.tiktok && (
                <a href={siteSettings.socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all">
                  <span>تيك توك</span>
                </a>
              )}
              {siteSettings.socialLinks?.telegram && (
                <a href={siteSettings.socialLinks.telegram} target="_blank" rel="noopener noreferrer" className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all">
                  <span>تلجرام</span>
                </a>
              )}
            </div>
          </div>

          {/* Col 3: Partners & Quick Join */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400">انضم لمنظومة {siteSettings.siteName}</h4>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setIsPartnerApplyOpen(true)}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow transition-all text-right flex items-center justify-between"
              >
                <span>الانضمام كمتجر / مطعم أو طيار</span>
                <span>←</span>
              </button>
              <button
                onClick={() => setIsWassalniOpen(true)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 px-4 rounded-xl border border-slate-700 transition-all text-right flex items-center justify-between"
              >
                <span>طلب خدمة "وصلي" للمشاوير والطلبات المباشرة</span>
                <span>⚡</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-slate-800/80 mt-8 pt-4 text-center text-[11px] text-slate-500">
          جميع الحقوق محفوظة © {new Date().getFullYear()} {siteSettings.siteName} - منصة التوصيل الذكي.
        </div>
      </footer>

      {/* Floating Cart Widget */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="relative bg-orange-600 text-white p-2.5 rounded-xl font-bold">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 bg-white text-orange-600 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            </div>
            <div>
              <h5 className="font-extrabold text-xs text-white">سلة الطلبات ({cartItems.length} صنف)</h5>
              <p className="text-[11px] text-orange-400 font-mono font-black">
                {cartItems.reduce((acc, ci) => acc + (ci.item.price + ci.selectedOptions.reduce((oAcc, o) => oAcc + o.price, 0)) * ci.quantity, 0)} ج.م
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>عرض السلة وإتمام الطلب</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating PWA Install Bottom Banner */}
      <PWAInstallBanner
        isInstalled={isInstalled}
        onInstallClick={handleInstallClick}
        onOpenGuide={() => setIsInstallGuideOpen(true)}
      />

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeBottomTab}
        setActiveTab={(tab) => {
          setActiveBottomTab(tab);
          if (tab === 'orders') setIsTrackingOpen(true);
        }}
        cartCount={cartItems.reduce((acc, i) => acc + i.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenInstallGuide={() => setIsInstallGuideOpen(true)}
        isInstalled={isInstalled}
      />

      {/* Modals & Drawers */}
      <StoreDetailsModal
        store={activeStoreModal}
        onClose={() => setActiveStoreModal(null)}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={handleProceedToCheckout}
        coupons={couponsList}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        discountAmount={checkoutDiscount}
        onConfirmOrder={handleConfirmOrder}
      />

      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        orders={orders}
        onUpdateOrderAddress={handleUpdateOrderAddress}
        onUpdateOrderItems={handleUpdateOrderItems}
        onCancelOrder={handleCancelOrder}
        onRateOrder={handleRateOrder}
      />

      {/* PWA Floating Install Banner */}
      <PWAInstallBanner
        isInstalled={isInstalled}
        onInstallClick={handleInstallClick}
        onOpenGuide={() => setIsInstallGuideOpen(true)}
      />

      <PWAInstallGuideModal
        isOpen={isInstallGuideOpen}
        onClose={() => setIsInstallGuideOpen(false)}
        platform={platform}
        onTryInstall={handleInstallClick}
        hasDeferredPrompt={hasDeferredPrompt}
      />

      <ShareAppModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />

      <VercelGuideModal
        isOpen={isVercelGuideOpen}
        onClose={() => setIsVercelGuideOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(user) => setCurrentUser(user)}
        usersList={usersList}
        onOpenPartnerApply={() => setIsPartnerApplyOpen(true)}
      />

      {/* PIN Verification Security Modal */}
      <PinVerificationModal
        isOpen={isPinModalOpen}
        userName={currentUser?.name}
        userPhone={currentUser?.phone}
        isLogoutMode={pinModalMode === 'logout'}
        title={pinModalMode === 'logout' ? 'تأكيد تسجيل الخروج' : undefined}
        description={
          pinModalMode === 'logout'
            ? 'أدخل رمز PIN لتأكيد تسجيل الخروج من حسابك'
            : undefined
        }
        onClose={() => {
          isLogoutRequestedRef.current = false;
          isLoggingOutRef.current = false;
          setIsPinModalOpen(false);
          setPinModalMode('security');
        }}
        onSuccess={async () => {
          if (pinModalMode === 'logout') {
            await executeLogout();
          } else {
            setIsPinModalOpen(false);
            if (currentUser?.id) {
              const updated = await fetchUserProfileById(currentUser.id);
              if (updated) setCurrentUser(updated);
            }
          }
        }}
      />

      {/* Partner Apply Modal (Merchants & Drivers) */}
      <PartnerApplyModal
        isOpen={isPartnerApplyOpen}
        onClose={() => setIsPartnerApplyOpen(false)}
        onSubmitMerchant={handleMerchantSubmit}
        onSubmitDriver={handleDriverSubmit}
      />

      {/* Admin Dashboard Panel */}
      <AdminDashboardModal
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        merchantApps={merchantApps}
        driverApps={driverApps}
        usersList={usersList}
        ordersList={orders}
        storesList={storesList}
        siteSettings={siteSettings}
        onUpdateSiteSettings={handleUpdateSiteSettings}
        onApproveMerchant={handleApproveMerchant}
        onRejectMerchant={handleRejectMerchant}
        onApproveDriver={handleApproveDriver}
        onRejectDriver={handleRejectDriver}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        onToggleUserStatus={handleToggleUserStatus}
        onCreateUser={handleCreateUser}
        onDeleteUser={handleDeleteUser}
        onUpdateUser={handleUpdateUser}
        onCreateStore={handleCreateStore}
        onUpdateStore={handleUpdateStore}
        onDeleteStore={handleDeleteStore}
        onCreateMenuItem={handleCreateMenuItem}
        onUpdateMenuItem={handleUpdateMenuItem}
        onDeleteMenuItem={handleDeleteMenuItem}
        onUpdateUserDocsStatus={handleUpdateUserDocsStatus}
        onSwitchToCustomerApp={() => setIsAdminDashboardOpen(false)}
        couponsList={couponsList}
        onUpdateCoupons={handleUpdateCoupons}
        currentUser={currentUser}
      />

      {/* Wassalni Errand Service Modal */}
      <WassalniModal
        isOpen={isWassalniOpen}
        onClose={() => setIsWassalniOpen(false)}
        onSubmitWassalniOrder={handleSubmitWassalniOrder}
        customerName={currentUser?.name}
        customerPhone={currentUser?.phone}
      />

      {/* Customer Verification Modal */}
      {currentUser && (
        <CustomerVerificationModal
          isOpen={isCustomerVerificationOpen}
          onClose={() => setIsCustomerVerificationOpen(false)}
          currentUser={currentUser}
          onUpdateUserDocs={handleUpdateUserDocs}
        />
      )}

      {/* Notification Center Drawer (Authenticated Users) */}
      {currentUser && (
        <NotificationDrawer
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          notifications={notifications}
          unreadCount={unreadCount}
          loading={notificationsLoading}
          onMarkAsRead={handleMarkNotificationAsRead}
          onMarkAllAsRead={handleMarkAllNotificationsAsRead}
          onDeleteNotification={handleDeleteNotification}
          onOpenSettings={() => setIsNotificationSettingsOpen(true)}
        />
      )}

      {/* Push Notification Preferences & Settings Modal */}
      <NotificationSettingsModal
        isOpen={isNotificationSettingsOpen}
        onClose={() => setIsNotificationSettingsOpen(false)}
        currentUser={currentUser}
      />

      {/* Realtime Floating Notification / Religious Reminder Toast */}
      <NotificationToast
        toast={activeToast}
        onClose={() => setActiveToast(null)}
        onClick={() => {
          if (currentUser) {
            setIsNotificationsOpen(true);
            setActiveToast(null);
          }
        }}
      />

      {/* Social Links Footer */}
      <SocialLinksFooter
        socialLinks={siteSettings.socialLinks}
        supportPhone={siteSettings.supportPhone}
        siteName={siteSettings.siteName}
      />

    </div>
  );
}

