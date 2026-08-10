import React, { useState } from 'react';
import { ShoppingBag, Search, CheckCircle2, Clock, Phone } from 'lucide-react';
import { Order } from '../../types';

interface Props {
  ordersList: Order[];
  onUpdateOrderStatus: (orderId: string, status: Order['status']) => void;
}

export const AdminOrdersTab: React.FC<Props> = ({ ordersList, onUpdateOrderStatus }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredOrders = ordersList.filter(o => {
    const matchesSearch = o.id.includes(searchTerm) || (o.customerName && o.customerName.includes(searchTerm)) || (o.customerPhone && o.customerPhone.includes(searchTerm));
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="بحث برقم الطلب أو اسم/هاتف العميل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-xs pr-9 pl-3 py-2.5 rounded-xl text-white focus:outline-none"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-xs px-3 py-2.5 rounded-xl text-white focus:outline-none"
        >
          <option value="all">كل الحالات ({ordersList.length})</option>
          <option value="sent">جديد (Sent)</option>
          <option value="preparing">جاري التجهيز</option>
          <option value="driver_assigned">تم تعيين طيار</option>
          <option value="picked_up">تم الاستلام</option>
          <option value="delivered">تم التوصيل</option>
          <option value="cancelled">ملغي</option>
        </select>
      </div>

      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-slate-800/50 p-6 rounded-2xl text-center text-slate-400 text-xs border border-slate-700/50">
            لا توجد طلبات تطابق معايير البحث.
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
                <div>
                  <span className="text-xs font-black text-orange-400 font-mono">طلب #{order.id.slice(-6)}</span>
                  <span className="text-[10px] text-slate-400 mr-2">{new Date(order.createdAt).toLocaleString('ar-EG')}</span>
                </div>
                <select
                  value={order.status}
                  onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-lg text-emerald-400"
                >
                  <option value="sent">جديد</option>
                  <option value="preparing">جاري التجهيز</option>
                  <option value="driver_assigned">تم تعيين طيار</option>
                  <option value="arrived_store">وصل للمحل</option>
                  <option value="picked_up">تم الاستلام من المحل</option>
                  <option value="arrived_customer">وصل للعميل</option>
                  <option value="delivered">تم التوصيل بنجاح</option>
                  <option value="cancelled">إلغاء الطلب</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row justify-between text-xs text-slate-300 gap-2">
                <div>
                  <p><strong>العميل:</strong> {order.customerName || 'عميل بدون اسم'} ({order.customerPhone})</p>
                  <p className="text-[11px] text-slate-400"><strong>العنوان:</strong> {typeof order.deliveryAddress === 'string' ? order.deliveryAddress : `${order.deliveryAddress?.street || ''} ${order.deliveryAddress?.building || ''}`}</p>
                </div>
                <div className="text-left font-mono">
                  <p className="text-emerald-400 font-extrabold text-sm">{order.total} ج.م</p>
                  <p className="text-[10px] text-slate-400">طريقة الدفع: {order.paymentMethod === 'cash' ? 'كاش' : 'إلكتروني'}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
