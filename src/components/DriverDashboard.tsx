import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bike, CheckCircle2, Circle, Clock3, LocateFixed, MapPin, Navigation, Power, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendPushNotification } from '../lib/pushNotificationService';
import { User } from '../types';

interface Props { currentUser: User; }
type DriverStatus = { is_online: boolean; current_active_orders: number; max_allowed_orders: number; last_seen?: string };
type DriverOrder = { id: string; customer_name?: string; customer_phone?: string; status: string; driver_step?: string | null; total: number; delivery_address?: { street?: string; building?: string; floor?: string; apartment?: string; phone?: string } | null; created_at: string; payment_method?: string };

const nextSteps: Record<string, { status: string; label: string; icon: React.ReactNode }> = {
  driver_assigned: { status: 'arrived_store', label: 'وصلت للمتجر', icon: <MapPin className="w-4 h-4" /> },
  arrived_store: { status: 'picked_up', label: 'استلمت الطلب', icon: <CheckCircle2 className="w-4 h-4" /> },
  picked_up: { status: 'arrived_customer', label: 'وصلت للعميل', icon: <Navigation className="w-4 h-4" /> },
  arrived_customer: { status: 'delivered', label: 'تم التسليم', icon: <CheckCircle2 className="w-4 h-4" /> }
};

export const DriverDashboard: React.FC<Props> = ({ currentUser }) => {
  const [driverStatus, setDriverStatus] = useState<DriverStatus>({ is_online: false, current_active_orders: 0, max_allowed_orders: 2 });
  const [availableOrders, setAvailableOrders] = useState<DriverOrder[]>([]);
  const [activeOrders, setActiveOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState('الموقع غير محدث');
  const [error, setError] = useState('');

  const loadDashboard = useCallback(async () => {
    if (!supabase || !currentUser.id) return;
    try {
      setError('');
      const [{ data: statusRow }, { data: openOrders, error: openError }, { data: mine, error: mineError }] = await Promise.all([
        supabase.from('driver_status').select('is_online,current_active_orders,max_allowed_orders,last_seen').eq('driver_id', currentUser.id).maybeSingle(),
        supabase.rpc('get_available_driver_orders'),
        supabase.from('orders').select('id,customer_name,customer_phone,status,driver_step,total,delivery_address,created_at,payment_method').eq('driver_id', currentUser.id).not('status','in','(delivered,cancelled)').order('created_at', { ascending: false }).limit(20)
      ]);
      if (openError) throw openError;
      if (mineError) throw mineError;
      setDriverStatus(statusRow || { is_online: false, current_active_orders: 0, max_allowed_orders: 2 });
      setAvailableOrders((openOrders || []) as DriverOrder[]);
      setActiveOrders((mine || []) as DriverOrder[]);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل بيانات الطيار الآن.');
    } finally { setLoading(false); }
  }, [currentUser.id]);

  const updateLocation = useCallback(async (showMessage = false) => {
    if (!supabase || !navigator.geolocation) { if (showMessage) setLocationStatus('المتصفح لا يدعم تحديد الموقع'); return; }
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude, accuracy } = position.coords;
        const { error: rpcError } = await supabase.rpc('update_driver_location', { p_latitude: latitude, p_longitude: longitude, p_accuracy_meters: accuracy || null });
        if (rpcError) throw rpcError;
        setLocationStatus(`الموقع محدث ✓ (دقة تقريبية ${Math.round(accuracy || 0)}م)`);
      } catch (e: any) {
        if (showMessage) setLocationStatus(e?.message || 'تعذر تحديث الموقع');
      }
    }, (geoError) => {
      if (showMessage) setLocationStatus(geoError.code === geoError.PERMISSION_DENIED ? 'اسمح للموقع من إعدادات الجهاز' : 'تعذر تحديد الموقع الآن');
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }, []);

  useEffect(() => {
    void loadDashboard();
    const timer = window.setInterval(() => void loadDashboard(), 10000);
    return () => window.clearInterval(timer);
  }, [loadDashboard]);

  useEffect(() => {
    if (!driverStatus.is_online) return;
    void updateLocation();
    const timer = window.setInterval(() => void updateLocation(), 30000);
    return () => window.clearInterval(timer);
  }, [driverStatus.is_online, updateLocation]);

  const toggleOnline = async () => {
    if (!supabase) return;
    setBusy('online'); setError('');
    try {
      const nextOnline = !driverStatus.is_online;
      const { error: updateError } = await supabase.from('driver_status').upsert({ driver_id: currentUser.id, is_online: nextOnline, current_active_orders: driverStatus.current_active_orders, max_allowed_orders: driverStatus.max_allowed_orders || 2, last_seen: new Date().toISOString() }, { onConflict: 'driver_id' });
      if (updateError) throw updateError;
      setDriverStatus(prev => ({ ...prev, is_online: nextOnline, last_seen: new Date().toISOString() }));
      if (nextOnline) void updateLocation(true);
    } catch (e: any) { setError(e?.message || 'تعذر تغيير حالة الظهور أونلاين.'); }
    finally { setBusy(null); }
  };

  const acceptOrder = async (orderId: string) => {
    if (!supabase) return;
    setBusy(orderId); setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('accept_order_atomic', { p_order_id: orderId, p_driver_id: currentUser.id });
      if (rpcError) throw rpcError;
      if (data !== true) throw new Error('لم يتم قبول الطلب. تأكد أنك أونلاين وأن السعة لم تكتمل.');
      await loadDashboard();
      void sendPushNotification({ userId: currentUser.id, title: 'تم قبول الطلب 🛵', body: `تم قبول الطلب #${orderId.slice(-5)} بنجاح.`, type: 'driver', url: '/?role=driver', orderId });
    } catch (e: any) { setError(e?.message || 'تعذر قبول الطلب.'); }
    finally { setBusy(null); }
  };

  const advanceOrder = async (order: DriverOrder) => {
    if (!supabase) return;
    const next = nextSteps[order.status];
    if (!next) return;
    setBusy(order.id); setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('driver_update_order_step', { p_order_id: order.id, p_next_status: next.status });
      if (rpcError) throw rpcError;
      if (!data?.success) throw new Error('تعذر تحديث حالة الطلب.');
      const customerPhone = order.customer_phone || order.delivery_address?.phone;
      if (customerPhone) {
        const messages: Record<string, string> = { arrived_store: 'الكابتن وصل للمتجر لاستلام طلبك 🏪', picked_up: 'الكابتن استلم طلبك وهو في الطريق إليك 🚀', arrived_customer: 'الكابتن وصل إلى موقع التوصيل 📍', delivered: 'تم تسليم طلبك بنجاح! بالهناء والشفاء 🎉' };
        const { data: customer } = await supabase.from('users').select('id').eq('phone', customerPhone).maybeSingle();
        if (customer?.id) void sendPushNotification({ userId: customer.id, title: `تحديث الطلب #${order.id.slice(-5)}`, body: messages[next.status], type: 'order', orderId: order.id, url: '/' });
      }
      await loadDashboard();
    } catch (e: any) { setError(e?.message || 'تعذر تحديث حالة الطلب.'); }
    finally { setBusy(null); }
  };

  const capacityText = useMemo(() => `${driverStatus.current_active_orders}/${driverStatus.max_allowed_orders || 2}`, [driverStatus.current_active_orders, driverStatus.max_allowed_orders]);

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-4 py-4 space-y-4">
      <div className="rounded-3xl bg-slate-900 text-white p-4 sm:p-6 shadow-xl border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-orange-600 flex items-center justify-center"><Bike className="w-6 h-6" /></div><div><div className="text-xs text-orange-300 font-bold">وضع الطيار</div><h2 className="text-xl font-black">أهلاً يا {currentUser.name} 👋</h2><p className="text-xs text-slate-300 mt-1">من هنا تستقبل الطلبات وتوصلها خطوة بخطوة.</p></div></div>
          <button onClick={toggleOnline} disabled={busy === 'online'} className={`w-full sm:w-auto px-5 py-3 rounded-2xl font-extrabold flex items-center justify-center gap-2 ${driverStatus.is_online ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white'} disabled:opacity-50`}><Power className="w-4 h-4" />{driverStatus.is_online ? 'أونلاين — استقبال الطلبات' : 'أوفلاين — اضغط للظهور أونلاين'}</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
          <div className="rounded-2xl bg-white/10 p-3"><div className="text-[10px] text-slate-300">الطلبات الحالية</div><div className="text-lg font-black">{capacityText}</div></div>
          <div className="rounded-2xl bg-white/10 p-3"><div className="text-[10px] text-slate-300">الحالة</div><div className="text-lg font-black">{driverStatus.is_online ? 'متاح' : 'غير متاح'}</div></div>
          <div className="rounded-2xl bg-white/10 p-3"><div className="text-[10px] text-slate-300">GPS</div><div className="text-xs font-black mt-1">{locationStatus}</div></div>
          <button type="button" onClick={() => void updateLocation(true)} className="rounded-2xl bg-white/10 hover:bg-white/20 p-3 text-right"><div className="text-[10px] text-slate-300">الموقع</div><div className="text-xs font-black mt-1 flex items-center gap-1"><LocateFixed className="w-3.5 h-3.5" />تحديث الآن</div></button>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-xs font-bold">{error}</div>}
      {!driverStatus.is_online && <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs font-bold text-amber-800 flex items-start gap-2"><ShieldCheck className="w-4 h-4 shrink-0" />ظهورك أونلاين مطلوب لاستقبال الطلبات الجديدة.</div>}

      <div className="flex items-center justify-between"><div><h3 className="text-lg font-black">طلبات متاحة</h3><p className="text-xs text-slate-500">تتحدث تلقائياً كل 10 ثواني.</p></div><button onClick={() => void loadDashboard()} className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm" title="تحديث"><RefreshCw className="w-4 h-4" /></button></div>
      {loading ? <div className="bg-white rounded-3xl border p-10 text-center text-sm font-bold text-slate-500">جاري تحميل الطلبات...</div> : availableOrders.length === 0 ? <div className="bg-white rounded-3xl border p-10 text-center"><Circle className="w-10 h-10 text-slate-300 mx-auto mb-3" /><div className="font-extrabold">مفيش طلبات متاحة دلوقتي</div><div className="text-xs text-slate-500 mt-1">خليك أونلاين والتطبيق هيحدّث الطلبات تلقائياً.</div></div> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{availableOrders.map(order => <div key={order.id} className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm"><div className="flex items-center justify-between"><span className="font-black">طلب #{order.id.slice(-6)}</span><span className="text-xs font-extrabold bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full">{order.status === 'preparing' ? 'جاهز للاستلام' : 'طلب جديد'}</span></div><div className="mt-3 text-sm font-bold">{order.delivery_address?.street || 'عنوان التوصيل'} — عمارة {order.delivery_address?.building || '-'}</div><div className="mt-2 flex justify-between text-xs text-slate-500"><span>{order.payment_method === 'cash' ? 'دفع كاش' : 'دفع إلكتروني'}</span><span className="font-black text-slate-900">{Number(order.total || 0).toFixed(2)} ج.م</span></div><button onClick={() => void acceptOrder(order.id)} disabled={!driverStatus.is_online || busy === order.id || driverStatus.current_active_orders >= (driverStatus.max_allowed_orders || 2)} className="mt-4 w-full bg-orange-600 disabled:opacity-50 text-white font-extrabold py-3 rounded-2xl">{busy === order.id ? 'جاري القبول...' : 'قبول الطلب 🛵'}</button></div>)}</div>}

      <div><h3 className="text-lg font-black">طلباتي الحالية</h3><p className="text-xs text-slate-500 mb-3">الحالات لا يمكن تخطيها ويتم التحقق منها داخل Supabase.</p>{activeOrders.length === 0 ? <div className="bg-white rounded-3xl border p-8 text-center text-xs text-slate-500">لا توجد طلبات قيد التوصيل.</div> : <div className="space-y-3">{activeOrders.map(order => { const next = nextSteps[order.status]; return <div key={order.id} className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm"><div className="flex items-center justify-between"><div className="font-black">طلب #{order.id.slice(-6)}</div><div className="text-xs font-extrabold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full">{order.status}</div></div><div className="text-sm font-bold mt-3">{order.delivery_address?.street || 'عنوان التوصيل'}</div>{next && <button onClick={() => void advanceOrder(order)} disabled={busy === order.id} className="mt-4 w-full bg-slate-900 disabled:opacity-50 text-white font-extrabold py-3 rounded-2xl flex items-center justify-center gap-2">{next.icon}{busy === order.id ? 'جاري التحديث...' : next.label}</button>}<div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500"><Clock3 className="w-3.5 h-3.5" />تحديث تلقائي كل 10 ثواني</div></div>; })}</div>}</div>
      <div className="rounded-2xl bg-white border border-slate-200 p-4 text-xs text-slate-600 flex items-center gap-2"><WalletCards className="w-4 h-4 text-orange-600" /><span>العمولة والتحصيل المالي يخضعان لقواعد النظام الحالية.</span></div>
    </section>
  );
};
