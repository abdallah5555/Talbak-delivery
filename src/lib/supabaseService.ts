import { supabase, isSupabaseConfigured } from './supabase';
import { User, Store, Order, MerchantApplication, DriverApplication, Coupon, Complaint, AuditLog } from '../types';

/**
 * Supabase Service Layer
 * Interacts with Supabase when configured, and supports graceful local persistence sync.
 */

// --- USERS ---
export async function fetchUsersFromDb(): Promise<User[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error || !data) {
      console.warn('Supabase fetchUsers error:', error);
      return null;
    }
    return data.map((u: any) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      pin: u.pin || '8822',
      passwordHash: u.password_hash,
      pinHash: u.pin_hash,
      role: u.role,
      status: u.status,
      vehicleType: u.vehicle_type,
      rating: u.rating,
      totalRatings: u.total_ratings,
      storeId: u.store_id,
      lastPinVerifiedMs: u.last_pin_verified_at ? new Date(u.last_pin_verified_at).getTime() : undefined,
      createdAt: u.created_at
    }));
  } catch (e) {
    console.error('Error in fetchUsersFromDb:', e);
    return null;
  }
}

export async function saveUserToDb(user: User): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  try {
    const payload = {
      id: user.id.startsWith('user-') || user.id.startsWith('admin-') ? undefined : user.id,
      name: user.name,
      phone: user.phone,
      password_hash: user.passwordHash || '',
      pin_hash: user.pinHash || '',
      role: user.role,
      status: user.status || 'active',
      vehicle_type: user.vehicleType || null,
      rating: user.rating || 5.0,
      total_ratings: user.totalRatings || 0,
      store_id: user.storeId || null
    };
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

/**
 * Atomic Order Acceptance via RPC
 */
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

/**
 * Realtime Subscription for Orders Table
 */
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
      vehicleModel: d.vehicle_model,
      noLicense: d.no_license,
      drivingLicenseNumber: d.driving_license_number,
      vehicleLicenseNumber: d.vehicle_license_number,
      photoUrl: d.photo_url,
      status: d.status,
      createdAt: d.created_at
    }));
  } catch (e) {
    return null;
  }
}
