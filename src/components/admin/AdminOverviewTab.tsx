import React from 'react';
import { DollarSign, ShoppingBag, Users, Bike, TrendingUp, Store as StoreIcon } from 'lucide-react';
import { User, Order, MerchantApplication, DriverApplication, Store } from '../../types';

interface Props {
  ordersList: Order[];
  usersList: User[];
  storesList: Store[];
  merchantApps: MerchantApplication[];
  driverApps: DriverApplication[];
}

export const AdminOverviewTab: React.FC<Props> = ({
  ordersList,
  usersList,
  storesList,
  merchantApps,
  driverApps
}) => {
  const totalRevenue = ordersList.reduce((acc, o) => acc + o.total, 0);
  const completedOrders = ordersList.filter(o => o.status === 'delivered');
  const activeDrivers = usersList.filter(u => u.role === 'driver' && u.status === 'active');
  const pendingMerchants = merchantApps.filter(m => m.status === 'pending');
  const pendingDrivers = driverApps.filter(d => d.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>إجمالي المبيعات</span>
          </div>
          <p className="text-lg sm:text-xl font-black text-emerald-400">{totalRevenue.toLocaleString()} ج.م</p>
          <span className="text-[10px] text-slate-400 mt-1 block">منذ بداية الشهر</span>
        </div>

        <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
            <ShoppingBag className="w-4 h-4 text-orange-400" />
            <span>الطلبات المكتملة</span>
          </div>
          <p className="text-lg sm:text-xl font-black text-orange-400">{completedOrders.length} / {ordersList.length}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">معدل النجاح 98%</span>
        </div>

        <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
            <Users className="w-4 h-4 text-blue-400" />
            <span>المستخدمين النشطين</span>
          </div>
          <p className="text-lg sm:text-xl font-black text-blue-400">{usersList.length}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">جميع الأدوار</span>
        </div>

        <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-1">
            <Bike className="w-4 h-4 text-purple-400" />
            <span>الطيارين المتاحين</span>
          </div>
          <p className="text-lg sm:text-xl font-black text-purple-400">{activeDrivers.length}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">جاهز للتوصيل</span>
        </div>
      </div>

      {/* Pending Applications Alerts */}
      {(pendingMerchants.length > 0 || pendingDrivers.length > 0) && (
        <div className="bg-amber-950/40 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-300">
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span>
              يوجد <strong>{pendingMerchants.length}</strong> طلبات متاجر و <strong>{pendingDrivers.length}</strong> طلبات طيارين بانتظار المراجعة والموافقة!
            </span>
          </div>
        </div>
      )}

      {/* Quick Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
          <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
            <StoreIcon className="w-4 h-4 text-orange-400" />
            المتاجر المعتمدة ({storesList.length})
          </h3>
          <div className="space-y-2">
            {storesList.slice(0, 5).map(s => (
              <div key={s.id} className="bg-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">{s.name}</span>
                <span className="text-slate-400">{s.category} • ⭐ {s.rating}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
          <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            أحدث الطلبات
          </h3>
          <div className="space-y-2">
            {ordersList.slice(0, 5).map(o => (
              <div key={o.id} className="bg-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-200 block">طلب #{o.id.slice(-6)}</span>
                  <span className="text-[10px] text-slate-400">{o.customerName}</span>
                </div>
                <span className="text-emerald-400 font-mono font-bold">{o.total} ج.م</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
