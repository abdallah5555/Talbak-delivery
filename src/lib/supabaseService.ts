import { supabase, isSupabaseConfigured } from './supabase';
export { isSupabaseConfigured };
import { User, Store, Order, MerchantApplication, DriverApplication, Coupon, Complaint, AuditLog } from '../types';
import { hashValue, verifyHash } from './auth';

/**
 * Supabase Service Layer
 * Interacts with Supabase Auth & Database tables securely.
 */

const PIN_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 Hours

function phoneToEmail(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  return `${cleaned}@talabak.app`;
}

// --- AUTH & USER PROFILE ---

export async function signInWithPhoneAndPassword(phone: string, pass: string): Promise<{ user: User | null; session?: any; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { user: null, error: 'قاعدة البيانات غير متصلة.' };
  }

  try {
    const email = phoneToEmail(phone);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass
    });

    if (error || !data.user) {
      return { user: null, error: 'رقم الهاتف أو كلمة المرور غير صحيحة.' };
    }

    const userProfile = await fetchUserProfileById(data.user.id);
    if (!userProfile) {
      return { user: null, error: 'تعذر العثور على ملف المستخدم.' };
    }

    if (userProfile.status === 'suspended') {
      await supabase.auth.signOut();
      return { user: null, error: 'عفواً، تم إيقاف هذا الحساب مؤقتاً بواسطة الإدارة.' };
    }

    return { user: userProfile, session: data.session, error: null };
  } catch (e: any) {
    console.error('Error in signInWithPhoneAndPassword:', e);
    return { user: null, error: 'حدث خطأ أثناء تسجيل الدخول.' };
  }
}

export async function signUpWithPhoneAndPassword(
  name: string,
  username: string,
  phone: string,
  pass: string,
  pin: string
): Promise<{ user: User | null; session?: any; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { user: null, error: 'قاعدة البيانات غير متصلة.' };
  }

  try {
    const cleanedPhone = phone.replace(/\D/g, '');
    const email = phoneToEmail(cleanedPhone);
    const pinHash = await hashValue(pin.trim());

    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          name: name.trim(),
          username: username.trim() || cleanedPhone,
          phone: cleanedPhone
        }
      }
    });

    if (error || !data.user) {
      return { user: null, error: error?.message || 'تعذر إنشاء الحساب.' };
    }

    // Upsert into public.users profile
    const { error: profileError } = await supabase.from('users').upsert({
      id: data.user.id,
      name: name.trim(),
      username: username.trim() || cleanedPhone,
      phone: cleanedPhone,
      role: 'customer',
      status: 'active',
      pin_hash: pinHash,
      last_pin_verified_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (profileError) {
      console.warn('Profile creation warning:', profileError);
    }

    const userProfile = await fetchUserProfileById(data.user.id);
    return { user: userProfile, session: data.session, error: null };
  } catch (e: any) {
    console.error('Error in signUpWithPhoneAndPassword:', e);
    return { user: null, error: 'حدث خطأ أثناء إنشاء الحساب.' };
  }
}

export async function signOutUser(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
  }
}

export async function fetchUserProfileById(userId: string): Promise<User | null> {
  if (!isSupabaseConfigured || !supabase || !userId) return null;
  try {
    let rowData: any = null;
    const { data, error } = await supabase
      .from('users')
      .select('id, name, username, phone, role, status, rating, total_ratings, vehicle_type, store_id, last_pin_verified_at, is_verified_customer, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      // Fallback query selecting * in case of schema column differences
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (fallbackError || !fallbackData) {
        console.warn('fetchUserProfileById error:', error || fallbackError);
        return null;
      }
      rowData = fallbackData;
    } else {
      rowData = data;
    }

    return {
      id: rowData.id,
      name: rowData.name,
      phone: rowData.phone,
      role: rowData.role as any,
      status: rowData.status as any,
      rating: rowData.rating,
      totalRatings: rowData.total_ratings || 0,
      vehicleType: rowData.vehicle_type,
      storeId: rowData.store_id,
      isVerifiedCustomer: rowData.is_verified_customer,
      lastPinVerifiedMs: rowData.last_pin_verified_at ? new Date(rowData.last_pin_verified_at).getTime() : undefined,
      createdAt: rowData.created_at || new Date().toISOString()
    };
  } catch (e) {
    console.error('Error fetching profile:', e);
    return null;
  }
}

export async function getCurrentUserSessionProfile(): Promise<{ user: User | null; needsPin: boolean }> {
  if (!isSupabaseConfigured || !supabase) {
    return { user: null, needsPin: false };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { user: null, needsPin: false };

    const profile = await fetchUserProfileById(session.user.id);
    if (!profile) return { user: null, needsPin: false };

    // Check if 48h PIN verification is needed
    const lastVerified = profile.lastPinVerifiedMs || 0;
    const needsPin = Date.now() - lastVerified >= PIN_EXPIRY_MS;

    return { user: profile, needsPin };
  } catch (e) {
    return { user: null, needsPin: false };
  }
}

// --- PIN & TRUSTED DEVICES ---

export async function verifyUserPinServer(pin: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const hashed = await hashValue(pin.trim());
    // Try RPC first
    const { data, error } = await supabase.rpc('verify_user_pin', { p_pin: pin.trim(), p_hash: hashed });
    if (!error && data === true) {
      return true;
    }

    // Fallback direct check via authenticated profile update
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const { data: userRow } = await supabase
      .from('users')
      .select('pin_hash')
      .eq('id', session.user.id)
      .single();

    if (userRow?.pin_hash) {
      const isValid = await verifyHash(pin.trim(), userRow.pin_hash);
      if (isValid) {
        await supabase
          .from('users')
          .update({ last_pin_verified_at: new Date().toISOString() })
          .eq('id', session.user.id);
        return true;
      }
    }
    return false;
  } catch (e) {
    console.error('Error verifying PIN server:', e);
    return false;
  }
}

export async function checkTrustedDevice(deviceId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !deviceId) return false;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const { data, error } = await supabase
      .from('trusted_devices')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('device_id', deviceId)
      .is('revoked_at', null)
      .maybeSingle();

    return !error && !!data;
  } catch (e) {
    return false;
  }
}

export async function registerTrustedDeviceServer(
  deviceId: string,
  deviceName?: string,
  browser?: string,
  platform?: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !deviceId) return false;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    // Try RPC
    const { error: rpcErr } = await supabase.rpc('register_trusted_device', {
      p_device_id: deviceId,
      p_device_name: deviceName || 'Browser',
      p_browser: browser || 'Unknown',
      p_platform: platform || 'Unknown'
    });

    if (!rpcErr) return true;

    // Direct Upsert Fallback
    const { error } = await supabase.from('trusted_devices').upsert({
      user_id: session.user.id,
      device_id: deviceId,
      device_name: deviceName,
      browser: browser,
      platform: platform,
      last_seen: new Date().toISOString()
    }, { onConflict: 'user_id,device_id' });

    return !error;
  } catch (e) {
    console.error('Error registering trusted device:', e);
    return false;
  }
}

// --- USERS MANAGEMENT (ADMIN & DIRECT DB) ---

export async function fetchUsersFromDb(): Promise<User[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    let rows: any[] = [];
    const { data, error } = await supabase
      .from('users')
      .select('id, name, username, phone, role, status, vehicle_type, rating, total_ratings, store_id, last_pin_verified_at, is_verified_customer, created_at');

    if (error || !data) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('users')
        .select('*');

      if (fallbackError || !fallbackData) {
        console.warn('Supabase fetchUsers error:', error || fallbackError);
        return null;
      }
      rows = fallbackData;
    } else {
      rows = data;
    }

    return rows.map((u: any) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      role: u.role,
      status: u.status,
      vehicleType: u.vehicle_type,
      rating: u.rating,
      totalRatings: u.total_ratings || 0,
      storeId: u.store_id,
      isVerifiedCustomer: u.is_verified_customer,
      lastPinVerifiedMs: u.last_pin_verified_at ? new Date(u.last_pin_verified_at).getTime() : undefined,
      createdAt: u.created_at || new Date().toISOString()
    }));
  } catch (e) {
    console.error('Error in fetchUsersFromDb:', e);
    return null;
  }
}

export async function saveUserToDb(user: User): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload: any = {
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status || 'active',
      vehicle_type: user.vehicleType || null,
      rating: user.rating || 5.0,
      total_ratings: user.totalRatings || 0,
      store_id: user.storeId || null
    };

    if (user.id && !user.id.startsWith('usr-') && !user.id.startsWith('user-') && !user.id.startsWith('admin-')) {
      payload.id = user.id;
    }

    const { error } = await supabase.from('users').upsert(payload, { onConflict: 'phone' });
    if (error) {
      console.warn('Supabase saveUser error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error in saveUserToDb:', e);
    return false;
  }
}

export async function updateUserStatusInDb(userId: string, status: 'active' | 'suspended'): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { error } = await supabase.from('users').update({ status }).eq('id', userId);
    return !error;
  } catch (e) {
    return false;
  }
}

// --- STORES ---
export async function fetchStoresFromDb(): Promise<Store[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.from('stores').select('*');
    if (error || !data) return null;
    return data.map((s: any) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      rating: s.rating,
      reviewsCount: s.reviews_count,
      deliveryTime: s.delivery_time,
      deliveryFee: s.delivery_fee,
      minOrder: s.min_order,
      image: s.image,
      banner: s.banner,
      isFeatured: s.is_featured,
      isOpen: s.is_open,
      distance: s.distance,
      address: s.address,
      tags: s.tags || [],
      items: typeof s.items === 'string' ? JSON.parse(s.items) : (s.items || [])
    }));
  } catch (e) {
    return null;
  }
}

export async function saveStoreToDb(store: Store): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload = {
      name: store.name,
      category: store.category,
      rating: store.rating || 5.0,
      reviews_count: store.reviewsCount || 0,
      delivery_time: store.deliveryTime || '25 - 35 دقيقة',
      delivery_fee: store.deliveryFee || 15,
      min_order: store.minOrder || 0,
      image: store.image,
      banner: store.banner,
      is_featured: store.isFeatured || false,
      is_open: store.isOpen !== false,
      distance: store.distance || '1.0 كم',
      address: store.address || 'القاهرة',
      tags: store.tags || []
    };
    const { error } = await supabase.from('stores').insert(payload);
    return !error;
  } catch (e) {
    return false;
  }
}

// --- ORDERS ---
export async function fetchOrdersFromDb(): Promise<Order[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error || !data) return null;
    return data.map((o: any) => ({
      id: o.id,
      customerName: o.customer_name,
      customerPhone: o.customer_phone,
      items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
      subtotal: Number(o.subtotal),
      deliveryFee: Number(o.delivery_fee),
      discount: Number(o.discount || 0),
      total: Number(o.total),
      status: o.status,
      deliveryAddress: typeof o.delivery_address === 'string' ? JSON.parse(o.delivery_address) : o.delivery_address,
      paymentMethod: o.payment_method,
      paymentPaidOnline: o.payment_paid_online,
      driverStep: o.driver_step,
      cancelledBy: o.cancelled_by,
      cancellationReason: o.cancellation_reason,
      cancelledAt: o.cancelled_at,
      estimatedMinutes: o.estimated_minutes || 25,
      createdAt: o.created_at
    }));
  } catch (e) {
    return null;
  }
}

export async function createOrderInDb(order: Order): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload = {
      customer_name: order.deliveryAddress.street || 'عميل',
      customer_phone: order.deliveryAddress.phone,
      items: order.items,
      subtotal: order.subtotal,
      delivery_fee: order.deliveryFee,
      discount: order.discount || 0,
      total: order.total,
      status: order.status || 'sent',
      delivery_address: order.deliveryAddress,
      payment_method: order.paymentMethod,
      payment_paid_online: order.paymentPaidOnline || false
    };
    const { error } = await supabase.from('orders').insert(payload);
    return !error;
  } catch (e) {
    return false;
  }
}
export { createOrderInDb as saveOrderToDb };

export async function updateOrderStatusInDb(orderId: string, status: Order['status'], driverId?: string, driverStep?: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const updateData: any = { status };
    if (driverId) updateData.driver_id = driverId;
    if (driverStep) updateData.driver_step = driverStep;
    const { error } = await supabase.from('orders').update(updateData).eq('id', orderId);
    return !error;
  } catch (e) {
    return false;
  }
}

export async function acceptOrderAtomicInDb(orderId: string, driverId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const { data, error } = await supabase.rpc('accept_order_atomic', {
      p_order_id: orderId,
      p_driver_id: driverId
    });
    if (error) {
      console.warn('accept_order_atomic error:', error);
      return false;
    }
    return Boolean(data);
  } catch (e) {
    return false;
  }
}

export function subscribeToOrdersRealtime(onOrderChange: (payload: any) => void): (() => void) | null {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        onOrderChange(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    console.error('Error subscribing to orders realtime:', e);
    return null;
  }
}

// --- APPLICATIONS ---
export async function fetchMerchantAppsFromDb(): Promise<MerchantApplication[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.from('merchant_applications').select('*');
    if (error || !data) return null;
    return data.map((m: any) => ({
      id: m.id,
      storeName: m.store_name,
      businessType: m.business_type,
      ownerName: m.owner_name,
      phone: m.phone,
      city: m.city,
      notes: m.notes,
      status: m.status,
      createdAt: m.created_at
    }));
  } catch (e) {
    return null;
  }
}

export async function fetchDriverAppsFromDb(): Promise<DriverApplication[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.from('driver_applications').select('*');
    if (error || !data) return null;
    return data.map((d: any) => ({
      id: d.id,
      fullName: d.full_name,
      phone: d.phone,
      vehicleType: d.vehicle_type,
      vehicleBrand: d.vehicle_brand,
      vehicleModel: d.vehicle_model,
      plateNumber: d.plate_number,
      noLicense: d.no_license,
      personalPhotoUrl: d.personal_photo_url || d.photo_url,
      driverLicenseUrl: d.driver_license_url || d.driving_license_number,
      vehicleLicenseUrl: d.vehicle_license_url || d.vehicle_license_number,
      status: d.status,
      createdAt: d.created_at
    }));
  } catch (e) {
    return null;
  }
}
