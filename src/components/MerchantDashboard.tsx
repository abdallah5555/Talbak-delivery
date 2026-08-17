import React, { useCallback, useEffect, useState } from 'react';
import { Check, X, Plus, RefreshCw, Store, Package, ClipboardList, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface Props { currentUser: User; onExit?: () => void; }
interface MerchantStore { id: string; name: string; category: string; delivery_fee: number; min_order: number; is_open: boolean; address: string; }
interface MenuItem { id: string; store_id: string; name: string; description: string | null; price: number; original_price: number | null; category: string; is_popular: boolean; }
interface MerchantOrder { id: string; customer_name: string | null; customer_phone: string | null; items: any[]; total: number; status: string; delivery_address: any; created_at: string; }

export const MerchantDashboard: React.FC<Props> = ({ currentUser, onExit }) => {
  const [store, setStore] = useState<MerchantStore | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'الرئيسية', description: '' });

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase.from('users').select('store_id').eq('id', currentUser.id).maybeSingle();
      if (!profile?.store_id) { setStore(null); setMenu([]); setOrders([]); return; }
      const [{ data: storeData }, { data: menuData }, { data: orderData }] = await Promise.all([
        supabase.from('stores').select('id,name,category,delivery_fee,min_order,is_open,address').eq('id', profile.store_id).maybeSingle(),
        supabase.from('menu_items').select('id,store_id,name,description,price,original_price,category,is_popular').eq('store_id', profile.store_id).order('created_at', { ascending: false }),
        supabase.from('orders').select('id,customer_name,customer_phone,items,total,status,delivery_address,created_at').in('status', ['sent','preparing','driver_assigned','arrived_store','picked_up']).order('created_at', { ascending: false }).limit(100)
      ]);
      if (storeData) setStore(storeData as MerchantStore);
      setMenu((menuData || []) as MenuItem[]);
      setOrders((orderData || []) as MerchantOrder[]);
    } catch (e) { console.error('[MerchantDashboard]', e); setMessage('تعذر تحميل بيانات المتجر حالياً.'); }
    finally { setLoading(false); }
  }, [currentUser.id]);

  useEffect(() => { void load(); }, [load]);

  const updateOrder = async (orderId: string, action: 'accept' | 'reject') => {
    if (!supabase) return;
    setSaving(true); setMessage(null);
    try {
      const { error } = await supabase.rpc('merchant_update_order', { p_order_id: orderId, p_action: action, p_rejection_reason: action === 'reject' ? 'المتجر غير قادر على قبول الطلب حالياً' : null });
      if (error) throw error;
      setMessage(action === 'accept' ? 'تم قبول الطلب وبدء التحضير.' : 'تم رفض الطلب وإبلاغ العميل.');
      await load();
    } catch (e: any) { setMessage(e?.message || 'تعذر تحديث الطلب.'); }
    finally { setSaving(false); }
  };

  const addMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !store || !newItem.name.trim() || Number(newItem.price) <= 0) return;
    setSaving(true); setMessage(null);
    try {
      const { error } = await supabase.from('menu_items').insert({ store_id: store.id, name: newItem.name.trim(), description: newItem.description.trim() || null, price: Number(newItem.price), category: newItem.category.trim() || 'الرئيسية', is_popular: false });
      if (error) throw error;
      setNewItem({ name: '', price: '', category: 'الرئيسية', description: '' });
      setMessage('تمت إضافة المنتج بنجاح.');
      await load();
    } catch (e: any) { setMessage(e?.message || 'تعذر إضافة المنتج.'); }
    finally { setSaving(false); }
  };

  const toggleStore = async () => {
    if (!supabase || !store) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('stores').update({ is_open: !store.is_open }).eq('id', store.id);
      if (error) throw error;
      await load();
    } catch (e: any) { setMessage(e?.message || 'تعذر تغيير حالة المتجر.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-3 sm:p-5">
      <div className="max-w-5xl mx-auto space-y-4">
        <header className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-orange-600 flex items-center justify-center"><Store className="w-5 h-5" /></div><div><div className="text-lg font-black">وضع التاجر</div><div className="text-xs text-slate-300">{store?.name || currentUser.name}</div></div></div>
          <div className="flex items-center gap-2"><button onClick={() => void load()} className="p-2 rounded-xl bg-white/10 hover:bg-white/20" title="تحديث"><RefreshCw className="w-4 h-4" /></button>{onExit && <button onClick={onExit} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-extrabold flex items-center gap-1"><LogOut className="w-3.5 h-3.5" />عميل</button>}</div>
        </header>

        {message && <div className="bg-white border border-orange-200 rounded-2xl p-3 text-sm font-bold text-orange-800">{message}</div>}

        {loading ? <div className="bg-white rounded-3xl p-10 text-center font-bold">جاري تحميل لوحة التاجر...</div> : !store ? <div className="bg-white rounded-3xl p-8 text-center"><Store className="w-10 h-10 mx-auto text-orange-500 mb-3" /><h2 className="font-black text-lg">لا يوجد متجر مرتبط بهذا الحساب</h2><p className="text-sm text-slate-500 mt-1">يجب اعتماد طلب التاجر أولاً لإنشاء المتجر وربطه بالحساب.</p></div> : <>
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-slate-200"><div className="text-xs text-slate-500">الطلبات النشطة</div><div className="text-2xl font-black mt-1">{orders.length}</div></div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200"><div className="text-xs text-slate-500">المنتجات</div><div className="text-2xl font-black mt-1">{menu.length}</div></div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200"><div className="text-xs text-slate-500">رسوم التوصيل</div><div className="text-2xl font-black mt-1">{store.delivery_fee} ج</div></div>
            <button disabled={saving} onClick={toggleStore} className={`rounded-2xl p-4 border text-right ${store.is_open ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}><div className="text-xs text-slate-500">حالة المتجر</div><div className="text-lg font-black mt-1">{store.is_open ? 'مفتوح 🟢' : 'مغلق 🔴'}</div></button>
          </section>

          <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b flex items-center gap-2"><ClipboardList className="w-5 h-5 text-orange-600" /><h2 className="font-black">الطلبات الواردة</h2></div>
            <div className="divide-y">
              {orders.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">لا توجد طلبات نشطة حالياً.</div> : orders.map(order => <div key={order.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div><div className="font-black text-sm">طلب #{order.id.slice(0,8)}</div><div className="text-xs text-slate-500 mt-1">{order.customer_name || 'عميل'} • {order.total} ج • {new Date(order.created_at).toLocaleString('ar-EG')}</div><div className="text-xs text-slate-600 mt-1">{order.delivery_address?.street || 'عنوان غير محدد'}</div></div>
                {order.status === 'sent' ? <div className="flex gap-2"><button disabled={saving} onClick={() => void updateOrder(order.id,'accept')} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center gap-1"><Check className="w-4 h-4" />قبول</button><button disabled={saving} onClick={() => void updateOrder(order.id,'reject')} className="px-4 py-2 rounded-xl bg-rose-100 text-rose-700 text-xs font-black flex items-center gap-1"><X className="w-4 h-4" />رفض</button></div> : <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-black">{order.status}</span>}
              </div>)}
            </div>
          </section>

          <section className="grid lg:grid-cols-2 gap-4">
            <form onSubmit={addMenuItem} className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-2"><Plus className="w-5 h-5 text-orange-600" /><h2 className="font-black">إضافة منتج</h2></div>
              <input required value={newItem.name} onChange={e=>setNewItem(v=>({...v,name:e.target.value}))} placeholder="اسم المنتج" className="w-full border rounded-xl p-3 text-sm" />
              <div className="grid grid-cols-2 gap-2"><input required type="number" min="0.01" value={newItem.price} onChange={e=>setNewItem(v=>({...v,price:e.target.value}))} placeholder="السعر" className="w-full border rounded-xl p-3 text-sm" /><input value={newItem.category} onChange={e=>setNewItem(v=>({...v,category:e.target.value}))} placeholder="القسم" className="w-full border rounded-xl p-3 text-sm" /></div>
              <textarea value={newItem.description} onChange={e=>setNewItem(v=>({...v,description:e.target.value}))} placeholder="وصف المنتج (اختياري)" className="w-full border rounded-xl p-3 text-sm min-h-20" />
              <button disabled={saving} className="w-full bg-orange-600 text-white rounded-xl py-3 font-black">إضافة المنتج</button>
            </form>
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden"><div className="p-4 border-b flex items-center gap-2"><Package className="w-5 h-5 text-orange-600" /><h2 className="font-black">قائمة المنتجات</h2></div><div className="max-h-80 overflow-y-auto divide-y">{menu.map(item=><div key={item.id} className="p-3 flex items-center justify-between gap-3"><div className="min-w-0"><div className="font-bold text-sm truncate">{item.name}</div><div className="text-[11px] text-slate-500">{item.category}</div></div><div className="font-black text-sm shrink-0">{item.price} ج</div></div>)}{menu.length===0&&<div className="p-8 text-center text-sm text-slate-500">لم تتم إضافة منتجات بعد.</div>}</div></div>
          </section>
        </>}
      </div>
    </div>
  );
};
