import React, { useState } from 'react';
import { CartItem } from '../types';
import { X, MapPin, Phone, CreditCard, Banknote, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  discountAmount: number;
  onConfirmOrder: (orderDetails: {
    address: { street: string; building: string; floor: string; phone: string; notes: string };
    paymentMethod: 'cash' | 'vodafone_cash' | 'card';
  }) => void;
}

export const CheckoutModal: React.FC<Props> = ({
  isOpen,
  onClose,
  cartItems,
  discountAmount,
  onConfirmOrder
}) => {
  const [street, setStreet] = useState('شارع الثورة - وسط البلد');
  const [building, setBuilding] = useState('عمارة رقم 12');
  const [floor, setFloor] = useState('الطابق الثالث - شقة 6');
  const [phone, setPhone] = useState('01012345678');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'vodafone_cash' | 'card'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, cartItem) => {
    const optsPrice = cartItem.selectedOptions.reduce((oAcc, o) => oAcc + o.price, 0);
    return acc + (cartItem.item.price + optsPrice) * cartItem.quantity;
  }, 0);
  const deliveryFee = 15;
  const total = Math.max(0, subtotal + deliveryFee - discountAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      onConfirmOrder({
        address: { street, building, floor, phone, notes },
        paymentMethod
      });
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500" />
              <h3 className="font-extrabold text-base">إتمام الطلب وتحديد العنوان</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
            
            {/* Delivery Address Section */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-orange-600" />
                عنوان التوصيل:
              </h4>

              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">الشارع والمنطقة:</label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full bg-slate-50 text-xs p-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 block">العمارة / المنزل:</label>
                    <input
                      type="text"
                      required
                      value={building}
                      onChange={(e) => setBuilding(e.target.value)}
                      className="w-full bg-slate-50 text-xs p-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 block">الدور والشقة:</label>
                    <input
                      type="text"
                      required
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      className="w-full bg-slate-50 text-xs p-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">رقم الموبايل للتواصل:</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 text-xs p-2.5 pr-9 rounded-xl border border-slate-200 focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">ملاحظات للمندوب (اختياري):</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="مثال: اتصل عند الوصول، الجرس معطل..."
                    className="w-full bg-slate-50 text-xs p-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Section */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-orange-600" />
                طريقة الدفع المفضلة:
              </h4>

              <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] p-2.5 rounded-xl">
                ⚠️ <strong>تنويه هام:</strong> خيارات الدفع الإلكتروني (فودافون كاش / بطاقة) تقوم بحساب إجمالي الحساب والتحويل المباشر مع التاجر/المندوب عند الاستلام، وهي غير مرتبطة ببوابة دفع اقتطاع تلقائي حالياً.
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-orange-50 border-orange-500 text-orange-900 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Banknote className="w-5 h-5 mx-auto mb-1 text-orange-600" />
                  <span className="text-[11px] font-bold block">1. الدفع نقدًا (كاش)</span>
                  <span className="text-[9px] text-slate-500">للمحل والتوصيل عند الاستلام</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    paymentMethod !== 'cash'
                      ? 'bg-orange-50 border-orange-500 text-orange-900 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                  <span className="text-[11px] font-bold block">2. دفعت للمحل إلكترونيًا</span>
                  <span className="text-[9px] text-slate-500">فيزا / فودافون كاش للمحل</span>
                </button>
              </div>
            </div>

            {/* Final Cost summary */}
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl space-y-2 text-xs font-bold shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {paymentMethod !== 'cash' ? 'المبلغ المطلوب سداده نقداً للمندوب (التوصيل فقط):' : 'المبلغ الإجمالي المطلوب تسليمه نقداً:'}
                  </span>
                  <span className="text-orange-400 text-base font-black">
                    {paymentMethod !== 'cash' ? `${deliveryFee} جنيه مصري` : `${total} جنيه مصري`}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>طلب آمن ومضمون</span>
                </div>
              </div>

              {paymentMethod !== 'cash' && (
                <div className="text-[10px] text-emerald-300 bg-emerald-950/80 p-2 rounded-xl border border-emerald-800/80">
                  💳 تم خصم سعر المنتجات ({subtotal} ج.م) لأنك اخترت الدفع الإلكتروني للمحل. المطلوب سداده نقداً للطيار عند التسليم هو رسوم التوصيل ({deliveryFee} ج.م) فقط.
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>جاري إرسال الطلب...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>تأكيد وإرسال الطلب الآن</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
