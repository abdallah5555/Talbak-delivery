import React, { useState } from 'react';
import { Tag, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { Coupon } from '../../types';

interface Props {
  coupons: Coupon[];
  onUpdateCoupons: (coupons: Coupon[]) => void;
}

export const AdminCouponsTab: React.FC<Props> = ({ coupons, onUpdateCoupons }) => {
  const [code, setCode] = useState('');
  const [discountValue, setDiscountValue] = useState('10');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');

  const handleAddCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    const newCoupon: Coupon = {
      id: 'c-' + Date.now(),
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: parseFloat(discountValue) || 10,
      isActive: true,
      usageLimit: 100,
      usedCount: 0,
      createdAt: new Date().toISOString()
    };
    onUpdateCoupons([...coupons, newCoupon]);
    setCode('');
  };

  const toggleCoupon = (id: string) => {
    onUpdateCoupons(coupons.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
  };

  const deleteCoupon = (id: string) => {
    onUpdateCoupons(coupons.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Create Coupon Form */}
      <form onSubmit={handleAddCoupon} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs text-slate-400 block mb-1">كود الكوبون (رمز الخصم)</label>
          <input
            type="text"
            required
            placeholder="مثال: OFF20"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white uppercase font-mono"
          />
        </div>
        <div className="w-full sm:w-32">
          <label className="text-xs text-slate-400 block mb-1">نوع الخصم</label>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white"
          >
            <option value="percentage">نسبة %</option>
            <option value="fixed">مبلغ ثابت</option>
          </select>
        </div>
        <div className="w-full sm:w-28">
          <label className="text-xs text-slate-400 block mb-1">قيمة الخصم</label>
          <input
            type="number"
            required
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-xs p-2.5 rounded-xl text-white font-mono"
          />
        </div>
        <button
          type="submit"
          className="w-full sm:w-auto bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة كوبون</span>
        </button>
      </form>

      {/* Coupons List */}
      <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-900 text-slate-400 border-b border-slate-700">
            <tr>
              <th className="p-3 font-bold">كود الخصم</th>
              <th className="p-3 font-bold">النوع والقيمة</th>
              <th className="p-3 font-bold">عدد مرات الاستخدام</th>
              <th className="p-3 font-bold">الحالة</th>
              <th className="p-3 font-bold text-center">التحكم</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60">
            {coupons.map((c) => (
              <tr key={c.id} className="hover:bg-slate-700/40 transition-colors">
                <td className="p-3 font-bold font-mono text-orange-400">{c.code}</td>
                <td className="p-3 text-slate-200">{c.discountType === 'percentage' ? `${c.discountValue}%` : `${c.discountValue} ج.م`}</td>
                <td className="p-3 text-slate-400">{c.usedCount} / {c.usageLimit}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
                    {c.isActive ? 'مفعل' : 'معطل'}
                  </span>
                </td>
                <td className="p-3 flex items-center justify-center gap-2">
                  <button onClick={() => toggleCoupon(c.id)} className="text-slate-300 hover:text-white">
                    {c.isActive ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                  </button>
                  <button onClick={() => deleteCoupon(c.id)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
