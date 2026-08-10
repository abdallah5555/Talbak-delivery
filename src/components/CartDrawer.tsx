import React, { useState } from 'react';
import { CartItem, Coupon } from '../types';
import { X, Trash2, Plus, Minus, Tag, ArrowLeft, ShoppingBag, Bike, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (uniqueId: string, delta: number) => void;
  onRemoveItem: (uniqueId: string) => void;
  onProceedToCheckout: (couponDiscount: number) => void;
  coupons?: Coupon[];
}

export const CartDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  coupons = []
}) => {
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscountAmount, setAppliedDiscountAmount] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');

  if (!isOpen) return null;

  const activeCoupons = coupons.filter(c => c.isActive);

  const subtotal = cartItems.reduce((acc, cartItem) => {
    const optsPrice = cartItem.selectedOptions.reduce((oAcc, o) => oAcc + o.price, 0);
    return acc + (cartItem.item.price + optsPrice) * cartItem.quantity;
  }, 0);

  // Delivery fee is fixed or calculated
  const deliveryFee = cartItems.length > 0 ? 15 : 0;
  const discountAmount = Math.min(subtotal, appliedDiscountAmount);
  const total = Math.max(0, subtotal + deliveryFee - discountAmount);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponCode.trim().toUpperCase();
    const matched = activeCoupons.find(c => c.code.toUpperCase() === cleanCode);

    if (matched) {
      let calc = 0;
      if (matched.discountType === 'percentage') {
        calc = Math.round((subtotal * matched.discountValue) / 100);
        setCouponMsg(`تم تطبيق خصم ${matched.discountValue}% بنجاح! 🎉`);
      } else {
        calc = matched.discountValue;
        setCouponMsg(`تم تطبيق خصم ${matched.discountValue} ج.م بنجاح! 🎉`);
      }
      setAppliedDiscountAmount(calc);
    } else {
      setAppliedDiscountAmount(0);
      setCouponMsg('كود الخصم غير صحيح أو غير مفعل حالياً.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex justify-end animate-fade-in">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col relative"
        >
          {/* Cart Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              <h3 className="font-extrabold text-base">سلة الطلبات</h3>
              <span className="bg-orange-600 text-white text-xs font-black px-2 py-0.5 rounded-full">
                {cartItems.length} منتجات
              </span>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cartItems.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto text-orange-500">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <h4 className="font-extrabold text-base text-slate-800">السلة فارغة حالياً</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  تصفح المتاجر والمطاعم وأضف وجباتك ومنتجاتك المفضلين للبدء.
                </p>
                <button
                  onClick={onClose}
                  className="mt-2 bg-slate-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow"
                >
                  تصفح المتاجر الآن
                </button>
              </div>
            ) : (
              <>
                {cartItems.map((cartItem) => {
                  const itemOptionsPrice = cartItem.selectedOptions.reduce((a, b) => a + b.price, 0);
                  const itemUnitPrice = cartItem.item.price + itemOptionsPrice;

                  return (
                    <div
                      key={cartItem.uniqueId}
                      className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 flex gap-3 relative group"
                    >
                      <img
                        src={cartItem.item.image}
                        alt={cartItem.item.name}
                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                      />

                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between">
                          <h5 className="font-bold text-xs text-slate-900 line-clamp-1">
                            {cartItem.item.name}
                          </h5>
                          <button
                            onClick={() => onRemoveItem(cartItem.uniqueId)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-[10px] text-orange-600 font-semibold block">
                          من: {cartItem.storeName}
                        </span>

                        {/* Selected Options summary */}
                        {cartItem.selectedOptions.length > 0 && (
                          <p className="text-[10px] text-slate-500 leading-tight">
                            {cartItem.selectedOptions.map((o) => `${o.groupTitle}: ${o.optionName}`).join(' | ')}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1">
                          <span className="font-black text-xs text-slate-900">
                            {itemUnitPrice * cartItem.quantity} ج.م
                          </span>

                          <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-2 py-0.5 shadow-2xs">
                            <button
                              onClick={() => onUpdateQuantity(cartItem.uniqueId, -1)}
                              className="text-slate-600 hover:text-slate-900 p-0.5"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-bold text-xs text-slate-800 w-4 text-center">
                              {cartItem.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(cartItem.uniqueId, 1)}
                              className="text-slate-600 hover:text-slate-900 p-0.5"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Promo Code Form - Only rendered if admin activated a coupon */}
                {activeCoupons.length > 0 && (
                  <form onSubmit={handleApplyCoupon} className="bg-orange-50 p-3 rounded-2xl border border-orange-200/80 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-orange-900">
                      <Tag className="w-4 h-4 text-orange-600" />
                      <span>كود الخصم (كوبون مفعل):</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="أدخل كود الكوبون"
                        className="bg-white uppercase tracking-wider text-xs font-extrabold px-3 py-2 rounded-xl border border-orange-300 flex-1 focus:outline-hidden"
                      />
                      <button
                        type="submit"
                        className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                      >
                        تطبيق
                      </button>
                    </div>
                    {couponMsg && (
                      <p className={`text-[10px] font-bold ${appliedDiscountAmount > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {couponMsg}
                      </p>
                    )}
                  </form>
                )}

                {/* Price Breakdown */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs font-medium text-slate-600">
                  <div className="flex justify-between">
                    <span>مجموع المنتجات:</span>
                    <span className="font-bold text-slate-900">{subtotal} ج.م</span>
                  </div>
                  <div className="flex justify-between">
                    <span>رسوم التوصيل:</span>
                    <span className="font-bold text-slate-900">{deliveryFee} ج.م</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>خصم الكوبون (30%):</span>
                      <span>-{discountAmount} ج.م</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-slate-900">
                    <span>المبلغ الإجمالي:</span>
                    <span className="text-orange-600 text-base">{total} ج.م</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Checkout Button */}
          {cartItems.length > 0 && (
            <div className="p-4 border-t border-slate-200 bg-white">
              <button
                onClick={() => onProceedToCheckout(discountAmount)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>متابعة إتمام الطلب</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
