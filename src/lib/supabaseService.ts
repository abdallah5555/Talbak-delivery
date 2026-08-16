import { supabase, isSupabaseConfigured } from './supabase';
export { isSupabaseConfigured };
import { User, Store, Order, MerchantApplication, DriverApplication, Coupon, Complaint, AuditLog, MenuItem, Notification } from '../types';
import { hashValue, verifyHash } from './auth';

/**
 * Supabase Service Layer
 * Interacts with Supabase Auth & Database tables securely.
 */

const PIN_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 Hours

/**
 * Normalizes an Egyptian phone number to standard local format (01xxxxxxxxx) and E.164 (+201xxxxxxxxx).
 */
export function normalizePhone(rawPhone: string): { local: string; e164: string } {
  let cleaned = (rawPhone || '').replace(/\D/g, '');
  
  if (cleaned.startsWith('0020')) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('20') && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  }

  if (!cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '0' + cleaned;
  }

  const local = cleaned;
  const e164 = cleaned.startsWith('0') ? '+20' + cleaned.substring(1) : '+20' + cleaned;

  return { local, e164 };
}

// --- AUTH & USER PROFILE ---

export async function signInWithPhoneAndPassword(phone: string, pass: string): Promise<{ user: User | null; session?: any; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { user: null, error: 'قاعدة البيانات غير متصلة.' };
  }

  try {
    const { local: localPhone, e164: e164Phone } = normalizePhone(phone);
    
    // Direct phone authentication
    let authRes = await supabase.auth.signInWithPassword({
      phone: e164Phone,
      password: pass
    });

    // Fallback attempt with local phone format if e164 was not stored
    if (authRes.error && !authRes.data.user) {
      authRes = await supabase.auth.signInWithPassword({
        phone: localPhone,
        password: pass
      });
    }

    const { data, error } = authRes;

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
  phone: string,
  pass: string,
  pin: string,
  _legacyUsername?: string
): Promise<{ user: User | null; session?: any; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { user: null, error: 'قاعدة البيانات غير متصلة.' };
  }

  try {
    const { local: localPhone, e164: e164Phone } = normalizePhone(phone);
    const pinHash = await hashValue(pin.trim());

    // 1. Check if phone is already registered in public.users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('phone', localPhone)
      .maybeSingle();

    if (existingUser) {
      return { user: null, error: 'رقم الهاتف مستخدم بالفعل.' };
    }

    // 2. Register real user in Supabase Auth via Phone/Password
    const { data, error } = await supabase.auth.signUp({
      phone: e164Phone,
      password: pass,
      options: {
        data: {
          name: name.trim(),
          phone: localPhone
        }
      }
    });

    if (error || !data.user) {
      let msg = 'تعذر إنشاء الحساب حالياً، حاول مرة أخرى.';
      if (error?.message?.includes('already registered') || error?.message?.includes('User already registered')) {
        msg = 'رقم الهاتف مستخدم بالفعل.';
      } else if (error?.message?.includes('rate limit')) {
        msg = 'يرجى الانتظار لحظات قبل إعادة المحاولة.';
      }
      return { user: null, error: msg };
    }

    // 3. Upsert into public.users profile matching the real Auth UUID
    const { error: profileError } = await supabase.from('users').upsert({
      id: data.user.id,
      name: name.trim(),
      phone: localPhone,
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
    return { user: null, error: 'تعذر إنشاء الحساب حالياً، حاول مرة أخرى.' };
  }
}

export async function adminCreateUser(params: {
  name: string;
  phone: string;
  password?: string;
  role: 'customer' | 'driver' | 'merchant' | 'admin';
  isAdminMain?: boolean;
  adminPermissions?: string[];
  adminPhotoUrl?: string;
  vehicleType?: string;
  storeId?: string;
}): Promise<{ user: User | null; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { user: null, error: 'قاعدة البيانات غير متصلة.' };
  }

  try {
    const { local: localPhone, e164: e164Phone } = normalizePhone(params.phone);
    const password = (params.password || '').trim();

    if (!params.name || !params.name.trim()) {
      return { user: null, error: 'يرجى إدخال اسم المستخدم بالكامل.' };
    }

    if (!localPhone || localPhone.length < 10) {
      return { user: null, error: 'يرجى إدخال رقم هاتف صحيح.' };
    }

    if (!password || password.length < 6) {
      return { user: null, error: 'كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل.' };
    }

    // 1. Check if phone is already registered in public.users to prevent duplicate accounts
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('phone', localPhone)
      .maybeSingle();

    if (existingUser) {
      return { user: null, error: 'رقم الهاتف مستخدم بالفعل.' };
    }

    // 2. Invoke server-side Supabase Edge Function (admin-create-user)
    const { data: funcData, error: funcError } = await supabase.functions.invoke('admin-create-user', {
      body: {
        name: params.name.trim(),
        phone: localPhone,
        phone_e164: e164Phone,
        password: password,
        role: params.role,
        isAdminMain: params.isAdminMain || false,
        adminPermissions: params.adminPermissions || [],
        adminPhotoUrl: params.adminPhotoUrl || '',
        vehicleType: params.vehicleType,
        storeId: params.storeId
      }
    });

    if (funcError) {
      console.error('Edge Function admin-create-user error:', funcError);
      let errMsg = 'تعذر إنشاء الحساب حالياً، حاول مرة أخرى.';
      if (funcError.message?.includes('403') || funcError.message?.includes('Forbidden')) {
        errMsg = 'لا تملك صلاحية إنشاء مستخدم.';
      } else if (funcError.message?.includes('401') || funcError.message?.includes('Unauthorized')) {
        errMsg = 'جلسة الدخول منتهية الصلاحية، يرجى إعادة تسجيل الدخول.';
      }
      return { user: null, error: errMsg };
    }

    if (funcData?.error) {
      return { user: null, error: funcData.error };
    }

    if (funcData?.user) {
      return { user: funcData.user, error: null };
    }

    return { user: null, error: 'تعذر إنشاء الحساب حالياً، حاول مرة أخرى.' };
  } catch (e: any) {
    console.error('Error in adminCreateUser:', e);
    return { user: null, error: 'تعذر إنشاء الحساب حالياً، حاول مرة أخرى.' };
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
        if (error || fallbackError) {
          console.error('[Diagnostic Auth Error]', {
            code: (error || fallbackError)?.code,
            message: (error || fallbackError)?.message,
            details: (error || fallbackError)?.details,
            hint: (error || fallbackError)?.hint
          });
        }
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
    const trimmed = pin.trim();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    // Direct check via stored pin_hash first
    const { data: userRow } = await supabase
      .from('users')
      .select('pin_hash')
      .eq('id', session.user.id)
      .maybeSingle();

    if (userRow?.pin_hash) {
      const isValid = await verifyHash(trimmed, userRow.pin_hash);
      if (isValid) {
        await supabase
          .from('users')
          .update({ last_pin_verified_at: new Date().toISOString() })
          .eq('id', session.user.id);
        return true;
      }
    }

    // Try RPC as fallback
    const hashed = await hashValue(trimmed);
    const { data, error } = await supabase.rpc('verify_user_pin', { p_pin: trimmed, p_hash: hashed });
    if (!error && data === true) {
      return true;
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
    const { local: normalizedPhone } = normalizePhone(user.phone);

    // If real UUID, update or insert by ID safely
    if (user.id && !user.id.startsWith('usr-') && !user.id.startsWith('user-') && !user.id.startsWith('admin-')) {
      // Check if phone belongs to another account with different ID
      const { data: conflict } = await supabase
        .from('users')
        .select('id, role')
        .eq('phone', normalizedPhone)
        .neq('id', user.id)
        .maybeSingle();

      if (conflict) {
        console.warn('saveUserToDb prevented overwrite of phone:', normalizedPhone);
        return false;
      }

      // Check existing user to prevent admin downgrade
      const { data: existing } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

      const targetRole = existing?.role === 'admin' && user.role !== 'admin' ? 'admin' : user.role;

      const payload: any = {
        id: user.id,
        name: user.name.trim(),
        phone: normalizedPhone,
        role: targetRole,
        status: user.status || 'active',
        vehicle_type: user.vehicleType || null,
        rating: user.rating || 5.0,
        total_ratings: user.totalRatings || 0,
        store_id: user.storeId || null
      };

      const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase saveUser error:', error);
        return false;
      }
      return true;
    }

    // For pseudo-IDs or local only, never overwrite existing accounts by phone
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('phone', normalizedPhone)
      .maybeSingle();

    if (existingUser) {
      console.warn('saveUserToDb rejected creation with existing phone:', normalizedPhone);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Error in saveUserToDb:', e);
    return false;
  }
}

export async function updateUserInDb(user: User): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured || !supabase || !user.id) {
    return { success: false, error: 'قاعدة البيانات غير متصلة.' };
  }
  try {
    const { local: normalizedPhone } = normalizePhone(user.phone);

    // 1. Check existing record
    const { data: existingUser, error: fetchErr } = await supabase
      .from('users')
      .select('id, role, phone')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchErr || !existingUser) {
      return { success: false, error: 'تعذر العثور على حساب المستخدم.' };
    }

    // 2. Check phone conflict with other accounts
    if (normalizedPhone !== existingUser.phone) {
      const { data: conflictUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', normalizedPhone)
        .neq('id', user.id)
        .maybeSingle();

      if (conflictUser) {
        return { success: false, error: 'رقم الهاتف مستخدم بالفعل بحساب آخر.' };
      }
    }

    // 3. Protect Admin accounts against accidental role demotion
    const finalRole = existingUser.role === 'admin' && user.role !== 'admin' ? 'admin' : user.role;

    const payload: any = {
      name: user.name.trim(),
      phone: normalizedPhone,
      role: finalRole,
      status: user.status || 'active',
      vehicle_type: user.vehicleType || null,
      rating: user.rating || 5.0,
      total_ratings: user.totalRatings || 0,
      store_id: user.storeId || null
    };

    const { error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', user.id);

    if (error) {
      console.error('Supabase updateUserInDb error:', error);
      return { success: false, error: 'تعذر تحديث بيانات المستخدم.' };
    }

    return { success: true, error: null };
  } catch (e: any) {
    console.error('Error in updateUserInDb:', e);
    return { success: false, error: 'حدث خطأ أثناء تحديث بيانات المستخدم.' };
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

// --- STORES & MENU ITEMS ---

export async function createMenuItemInDb(item: MenuItem): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload: any = {
      store_id: item.storeId,
      name: item.name,
      description: item.description || '',
      price: item.price,
      original_price: item.originalPrice || null,
      image: item.image || '',
      category: item.category || 'الرئيسية',
      is_popular: item.isPopular || false
    };

    if (item.id && !item.id.startsWith('item-')) {
      payload.id = item.id;
    }

    const { error } = await supabase.from('menu_items').upsert(payload);
    if (error) {
      console.error('[Supabase Menu Item Error] createMenuItemInDb failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error in createMenuItemInDb:', e);
    return false;
  }
}

export async function updateMenuItemInDb(item: MenuItem): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !item.id) return false;
  try {
    const payload: any = {
      name: item.name,
      description: item.description || '',
      price: item.price,
      original_price: item.originalPrice || null,
      image: item.image || '',
      category: item.category || 'الرئيسية',
      is_popular: item.isPopular || false
    };

    if (item.storeId) {
      payload.store_id = item.storeId;
    }

    const { error } = await supabase
      .from('menu_items')
      .update(payload)
      .eq('id', item.id);

    if (error) {
      console.error('[Supabase Menu Item Error] updateMenuItemInDb failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error in updateMenuItemInDb:', e);
    return false;
  }
}

export async function deleteMenuItemFromDb(itemId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !itemId) return false;
  try {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('[Supabase Menu Item Error] deleteMenuItemFromDb failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error in deleteMenuItemFromDb:', e);
    return false;
  }
}

export async function fetchStoresFromDb(): Promise<Store[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data: storesData, error: storesErr } = await supabase.from('stores').select('*');
    if (storesErr || !storesData) {
      console.error('[Supabase Store Error] fetchStoresFromDb failed:', storesErr);
      return null;
    }

    // Fetch associated menu items from public.menu_items table
    const { data: menuData, error: menuErr } = await supabase.from('menu_items').select('*');
    const menuMap: Record<string, MenuItem[]> = {};

    if (!menuErr && menuData) {
      menuData.forEach((m: any) => {
        const item: MenuItem = {
          id: m.id,
          storeId: m.store_id,
          name: m.name,
          description: m.description || '',
          price: Number(m.price),
          originalPrice: m.original_price ? Number(m.original_price) : undefined,
          image: m.image || '',
          category: m.category || 'الرئيسية',
          isPopular: m.is_popular || false
        };
        if (!menuMap[m.store_id]) {
          menuMap[m.store_id] = [];
        }
        menuMap[m.store_id].push(item);
      });
    }

    return storesData.map((s: any) => {
      let items: MenuItem[] = [];
      if (menuMap[s.id] && menuMap[s.id].length > 0) {
        items = menuMap[s.id];
      } else if (s.items) {
        items = typeof s.items === 'string' ? JSON.parse(s.items) : (s.items || []);
      }

      return {
        id: s.id,
        name: s.name,
        category: s.category,
        rating: Number(s.rating || 5.0),
        reviewsCount: s.reviews_count || 0,
        deliveryTime: s.delivery_time || '25 - 35 دقيقة',
        deliveryFee: Number(s.delivery_fee || 15),
        minOrder: Number(s.min_order || 0),
        image: s.image || '',
        banner: s.banner || '',
        isFeatured: s.is_featured || false,
        isOpen: s.is_open !== false,
        distance: s.distance || '1.0 كم',
        address: s.address || 'القاهرة',
        tags: s.tags || [],
        items: items
      };
    });
  } catch (e) {
    console.error('Error in fetchStoresFromDb:', e);
    return null;
  }
}

export async function saveStoreToDb(store: Store): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload: any = {
      name: store.name,
      category: store.category,
      rating: store.rating || 5.0,
      reviews_count: store.reviewsCount || 0,
      delivery_time: store.deliveryTime || '25 - 35 دقيقة',
      delivery_fee: store.deliveryFee || 15,
      min_order: store.minOrder || 0,
      image: store.image || '',
      banner: store.banner || '',
      is_featured: store.isFeatured || false,
      is_open: store.isOpen !== false,
      distance: store.distance || '1.0 كم',
      address: store.address || 'القاهرة',
      tags: store.tags || [],
      items: store.items || []
    };

    if (store.id && !store.id.startsWith('store-') && !store.id.startsWith('str-')) {
      payload.id = store.id;
    }

    const { data: insertedData, error } = await supabase.from('stores').upsert(payload).select().maybeSingle();
    if (error) {
      console.error('[Supabase Store Error] saveStoreToDb failed:', error);
      return false;
    }

    const savedStoreId = insertedData?.id || payload.id || store.id;
    if (store.items && store.items.length > 0 && savedStoreId) {
      for (const item of store.items) {
        await createMenuItemInDb({ ...item, storeId: savedStoreId });
      }
    }

    return true;
  } catch (e) {
    console.error('Error in saveStoreToDb:', e);
    return false;
  }
}

export async function updateStoreInDb(store: Store): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !store.id) return false;
  try {
    const payload: any = {
      name: store.name,
      category: store.category,
      rating: store.rating,
      reviews_count: store.reviewsCount,
      delivery_time: store.deliveryTime,
      delivery_fee: store.deliveryFee,
      min_order: store.minOrder,
      image: store.image || '',
      banner: store.banner || '',
      is_featured: store.isFeatured || false,
      is_open: store.isOpen !== false,
      distance: store.distance || '1.0 كم',
      address: store.address || 'القاهرة',
      tags: store.tags || [],
      items: store.items || []
    };

    const { error } = await supabase
      .from('stores')
      .update(payload)
      .eq('id', store.id);

    if (error) {
      console.error('[Supabase Store Error] updateStoreInDb failed:', error);
      return false;
    }

    // Update / sync store menu items
    if (store.items && store.items.length > 0) {
      for (const item of store.items) {
        if (item.id && !item.id.startsWith('item-')) {
          await updateMenuItemInDb(item);
        } else {
          await createMenuItemInDb({ ...item, storeId: store.id });
        }
      }
    }

    return true;
  } catch (e) {
    console.error('Error in updateStoreInDb:', e);
    return false;
  }
}

export async function deleteStoreFromDb(storeId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !storeId) return false;
  try {
    // Cleanup menu items
    const { error: menuErr } = await supabase
      .from('menu_items')
      .delete()
      .eq('store_id', storeId);

    if (menuErr) {
      console.warn('[Supabase Store Warning] deleteStoreFromDb menu_items cleanup warning:', menuErr);
    }

    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', storeId);

    if (error) {
      console.error('[Supabase Store Error] deleteStoreFromDb failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error in deleteStoreFromDb:', e);
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
    const { data, error } = await supabase
      .from('merchant_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase Error] fetchMerchantAppsFromDb failed:', error);
      return null;
    }
    if (!data) return [];

    return data.map((m: any) => ({
      id: m.id,
      storeName: m.store_name,
      businessType: m.business_type,
      customBusinessType: m.custom_business_type,
      ownerName: m.owner_name,
      phone: m.phone,
      hasWhatsapp: m.has_whatsapp,
      city: m.city,
      notes: m.notes,
      status: m.status || 'pending',
      createdAt: m.created_at
    }));
  } catch (e) {
    console.error('Error fetching merchant apps:', e);
    return null;
  }
}

export async function updateMerchantApplicationStatusInDb(
  appId: string,
  status: 'approved' | 'rejected' | 'pending'
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !appId) return false;
  try {
    const { error } = await supabase
      .from('merchant_applications')
      .update({ status })
      .eq('id', appId);

    if (error) {
      console.error('[Supabase Error] updateMerchantApplicationStatusInDb failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error updating merchant application status:', e);
    return false;
  }
}

export async function saveMerchantApplicationToDb(
  app: MerchantApplication
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload: any = {
      store_name: app.storeName,
      business_type: app.businessType,
      custom_business_type: app.customBusinessType || null,
      owner_name: app.ownerName,
      phone: app.phone,
      has_whatsapp: app.hasWhatsapp || false,
      city: app.city || '',
      notes: app.notes || '',
      status: app.status || 'pending'
    };

    if (app.id && !app.id.startsWith('merch-')) {
      payload.id = app.id;
    }

    const { error } = await supabase.from('merchant_applications').insert(payload);
    if (error) {
      console.error('[Supabase Error] saveMerchantApplicationToDb failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error saving merchant application:', e);
    return false;
  }
}

export async function fetchDriverAppsFromDb(): Promise<DriverApplication[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('driver_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase Error] fetchDriverAppsFromDb failed:', error);
      return null;
    }
    if (!data) return [];

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
      status: d.status || 'pending',
      docStatus: typeof d.doc_status === 'string' ? JSON.parse(d.doc_status) : d.doc_status,
      rejectionReason: d.rejection_reason,
      createdAt: d.created_at
    }));
  } catch (e) {
    console.error('Error fetching driver apps:', e);
    return null;
  }
}

export async function updateDriverApplicationStatusInDb(
  appId: string,
  status: 'approved' | 'rejected' | 'pending',
  rejectionReason?: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !appId) return false;
  try {
    const updateData: any = { status };
    if (rejectionReason !== undefined) {
      updateData.rejection_reason = rejectionReason;
    }
    const { error } = await supabase
      .from('driver_applications')
      .update(updateData)
      .eq('id', appId);

    if (error) {
      console.error('[Supabase Error] updateDriverApplicationStatusInDb failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error updating driver application status:', e);
    return false;
  }
}

export async function saveDriverApplicationToDb(
  app: DriverApplication
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload: any = {
      full_name: app.fullName,
      phone: app.phone,
      vehicle_type: app.vehicleType,
      vehicle_brand: app.vehicleBrand || null,
      vehicle_model: app.vehicleModel || null,
      plate_number: app.plateNumber || null,
      no_license: app.noLicense || false,
      personal_photo_url: app.personalPhotoUrl || null,
      driver_license_url: app.driverLicenseUrl || null,
      vehicle_license_url: app.vehicleLicenseUrl || null,
      status: app.status || 'pending',
      doc_status: app.docStatus ? JSON.stringify(app.docStatus) : null
    };

    if (app.id && !app.id.startsWith('driver-')) {
      payload.id = app.id;
    }

    const { error } = await supabase.from('driver_applications').insert(payload);
    if (error) {
      console.error('[Supabase Error] saveDriverApplicationToDb failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error saving driver application:', e);
    return false;
  }
}

// --- COMPLAINTS ---
export async function fetchComplaintsFromDb(): Promise<Complaint[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase Error] fetchComplaintsFromDb failed:', error);
      return null;
    }
    if (!data) return [];

    return data.map((c: any) => ({
      id: c.id,
      orderId: c.order_id,
      customerName: c.customer_name,
      customerPhone: c.customer_phone,
      category: c.category || 'other',
      description: c.description,
      status: c.status || 'open',
      adminResponse: c.admin_response,
      createdAt: c.created_at
    }));
  } catch (e) {
    console.error('Error fetching complaints from DB:', e);
    return null;
  }
}

export async function saveComplaintToDb(complaint: Complaint): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload: any = {
      order_id: complaint.orderId || null,
      customer_name: complaint.customerName,
      customer_phone: complaint.customerPhone,
      category: complaint.category || 'other',
      description: complaint.description,
      status: complaint.status || 'open',
      admin_response: complaint.adminResponse || null
    };

    if (complaint.id && !complaint.id.startsWith('c-') && !complaint.id.startsWith('cmp-')) {
      payload.id = complaint.id;
    }

    const { error } = await supabase.from('complaints').insert(payload);
    if (error) {
      console.error('[Supabase Error] saveComplaintToDb failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error saving complaint to DB:', e);
    return false;
  }
}

export async function updateComplaintStatusInDb(
  complaintId: string,
  status: 'open' | 'investigating' | 'resolved' | 'rejected',
  adminResponse?: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !complaintId) return false;
  try {
    const updateData: any = { status };
    if (adminResponse !== undefined) {
      updateData.admin_response = adminResponse;
    }
    const { error } = await supabase
      .from('complaints')
      .update(updateData)
      .eq('id', complaintId);

    if (error) {
      console.error('[Supabase Error] updateComplaintStatusInDb failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error updating complaint status:', e);
    return false;
  }
}

// --- AUDIT LOGS ---
export async function fetchAuditLogsFromDb(): Promise<AuditLog[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase Error] fetchAuditLogsFromDb failed:', error);
      return null;
    }
    if (!data) return [];

    return data.map((a: any) => ({
      id: a.id,
      actorName: a.actor_name,
      actorRole: a.actor_role,
      action: a.action,
      target: a.target,
      details: a.details,
      canRevert: a.can_revert !== false,
      reverted: a.reverted || false,
      createdAt: a.created_at
    }));
  } catch (e) {
    console.error('Error fetching audit logs from DB:', e);
    return null;
  }
}

export async function saveAuditLogToDb(log: AuditLog): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload: any = {
      actor_name: log.actorName,
      actor_role: log.actorRole,
      action: log.action,
      target: log.target,
      details: log.details || '',
      can_revert: log.canRevert !== false,
      reverted: log.reverted || false
    };

    if (log.id && !log.id.startsWith('log-') && !log.id.startsWith('audit-')) {
      payload.id = log.id;
    }

    const { error } = await supabase.from('audit_logs').insert(payload);
    if (error) {
      console.error('[Supabase Error] saveAuditLogToDb failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error saving audit log to DB:', e);
    return false;
  }
}

export async function updateAuditLogRevertedInDb(
  logId: string,
  reverted: boolean
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !logId) return false;
  try {
    const { error } = await supabase
      .from('audit_logs')
      .update({ reverted })
      .eq('id', logId);

    if (error) {
      console.error('[Supabase Error] updateAuditLogRevertedInDb failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error updating audit log reverted status:', e);
    return false;
  }
}

// --- COUPONS ---
export async function fetchCouponsFromDb(): Promise<Coupon[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase Error] fetchCouponsFromDb failed:', error);
      return null;
    }
    if (!data) return [];

    return data.map((c: any) => ({
      id: c.id,
      code: c.code,
      discountType: c.discount_type,
      discountValue: Number(c.discount_value),
      isActive: c.is_active !== false,
      usageLimit: c.usage_limit || 100,
      usedCount: c.used_count || 0,
      createdAt: c.created_at
    }));
  } catch (e) {
    console.error('Error fetching coupons from DB:', e);
    return null;
  }
}

export async function saveCouponToDb(coupon: Coupon): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload: any = {
      code: coupon.code,
      discount_type: coupon.discountType,
      discount_value: coupon.discountValue,
      is_active: coupon.isActive !== false,
      usage_limit: coupon.usageLimit || 100,
      used_count: coupon.usedCount || 0
    };

    if (coupon.id && !coupon.id.startsWith('c-') && !coupon.id.startsWith('cpn-')) {
      payload.id = coupon.id;
    }

    const { error } = await supabase.from('coupons').upsert(payload, { onConflict: 'code' });
    if (error) {
      console.error('[Supabase Error] saveCouponToDb failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error saving coupon to DB:', e);
    return false;
  }
}

export async function updateCouponInDb(coupon: Coupon): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !coupon.id) return false;
  try {
    const payload: any = {
      code: coupon.code,
      discount_type: coupon.discountType,
      discount_value: coupon.discountValue,
      is_active: coupon.isActive !== false,
      usage_limit: coupon.usageLimit,
      used_count: coupon.usedCount
    };

    const { error } = await supabase
      .from('coupons')
      .update(payload)
      .eq('id', coupon.id);

    if (error) {
      console.error('[Supabase Error] updateCouponInDb failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error updating coupon in DB:', e);
    return false;
  }
}

export async function deleteCouponFromDb(couponId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !couponId) return false;
  try {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', couponId);

    if (error) {
      console.error('[Supabase Error] deleteCouponFromDb failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error deleting coupon from DB:', e);
    return false;
  }
}

// --- NOTIFICATIONS ---

export async function fetchNotificationsFromDb(userId: string): Promise<Notification[]> {
  if (!isSupabaseConfigured || !supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, title, message, type, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase Error] fetchNotificationsFromDb failed:', error);
      return [];
    }

    if (!data) return [];

    return data.map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      title: n.title || '',
      message: n.message || '',
      type: n.type || 'system',
      isRead: Boolean(n.is_read),
      createdAt: n.created_at || new Date().toISOString()
    }));
  } catch (e) {
    console.error('Error fetching notifications from DB:', e);
    return [];
  }
}

export async function markNotificationAsReadInDb(notificationId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !notificationId) return false;
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('[Supabase Error] markNotificationAsReadInDb failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error marking notification as read in DB:', e);
    return false;
  }
}

export async function markAllNotificationsAsReadInDb(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !userId) return false;
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('[Supabase Error] markAllNotificationsAsReadInDb failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error marking all notifications as read in DB:', e);
    return false;
  }
}

export async function deleteNotificationFromDb(notificationId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !notificationId) return false;
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('[Supabase Error] deleteNotificationFromDb failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error deleting notification from DB:', e);
    return false;
  }
}

export function subscribeToNotificationsRealtime(
  userId: string,
  onNotificationEvent: (payload: any) => void
): (() => void) | null {
  if (!isSupabaseConfigured || !supabase || !userId) return null;
  try {
    const channel = supabase
      .channel(`public:notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          onNotificationEvent(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    console.error('Error subscribing to notifications realtime:', e);
    return null;
  }
}

