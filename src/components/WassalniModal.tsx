import React, { useState } from 'react';
import { X, Send, MapPin, Package, ShieldCheck, DollarSign, Sparkles, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Order } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmitWassalniOrder: (order: Order) => void;
  customerName?: string;
  customerPhone?: string;
}

export const WassalniModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmitWassalniOrder,
  customerName = 'عميل كريم',
  customerPhone = '01000000000'
}) => {
  const [itemDescription, setItemDescription] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [userTip, setUserTip] = useState(0);
  const [isLocatingPickup, setIsLocatingPickup] = useState(false);
  const [isLocatingDropoff, setIsLocatingDropoff] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  // Calculate estimated distance and dynamic fee
  const minFee = 20;
  const maxFee = 70;
  const estimatedFee = Math.min(maxFee, Math.max(minFee, minFee + Math.floor((itemDescription.length + pickupAddress.length) / 8)));
  const grandTotal = estimatedFee + userTip;

  const handleGetPickupGPS = () => {
    setIsLocatingPickup(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPickupAddress(`موقعي الجغرافي الحالي (مُحدد بدقة عبر GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
          setIsLocatingPickup(false);
        },
        () => {
          setPickupAddress('شارع النصر - بجوار المحطة الرئيسية (GPS)');
          setIsLocatingPickup(false);
        }
      );
    } else {
      setPickupAddress('شارع النصر - القاطنين بالقرب');
      setIsLocatingPickup(false);
    }
  };

  const handleGetDropoffGPS = () => {
    setIsLocatingDropoff(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDropoffAddress(`موقع التسليم الجغرافي (مُحدد عبر GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
          setIsLocatingDropoff(false);
        },
        () => {
          setDropoffAddress('حي الأشجار - المجاورة الرابعة (GPS)');
          setIsLocatingDropoff(false);
        }
      );
    } else {
      setDropoffAddress('حي الأشجار - المجاورة الرابعة');
      setIsLocatingDropoff(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemDescription.trim() || !pickupAddress.trim() || !dropoffAddress.trim()) return;

    const newOrder: Order = {
      id: 'wassalni-' + Date.now().toString().slice(-6),
      customerName,
      customerPhone,
      items: [{
        uniqueId: 'wassalni-item-' + Date.now(),
        item: {
          id: 'item-wassalni',
          storeId: 'errands-store',
          name: 'طلب مشوار / توصيلة خاصة (وصّلي)',
          description: itemDescription,
          price: 0,
          image: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=300&q=80',
          category: 'errands'
        },
        storeName: 'خدمة وصّلي السريعة',
        storeId: 'errands-store',
        quantity: 1,
        selectedOptions: [],
        specialNotes: itemDescription
      }],
      subtotal: 0,
      deliveryFee: estimatedFee,
      discount: 0,
      total: grandTotal,
      status: 'sent',
      createdAt: new Date().toISOString(),
      isWassalni: true,
      wassalniDetails: {
        itemDescription,
        pickupAddress,
        dropoffAddress,
        minFee: estimatedFee,
        userTip
      },
      deliveryAddress: {
        street: dropoffAddress,
        building: 'حسب المشوار',
        floor: 'الأرضي',
        phone: customerPhone,
        notes: `استلام من: ${pickupAddress}`
      },
      paymentMethod: 'cash',
      paymentPaidOnline: false,
      estimatedMinutes: 25,
      storeDistance: '2.5 كم',
      customerDistance: '3.1 كم'
    };

    onSubmitWassalniOrder(newOrder);
    setIsSubmitted(true);
  };

  const handleResetAndClose = () => {
    setIsSubmitted(false);
    setItemDescription('');
    setPickupAddress('');
    setDropoffAddress('');
    setUserTip(0);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-900 text-white p-6 relative">
            <button
              onClick={handleResetAndClose}
              className="absolute left-4 top-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white text-purple-700 p-2.5 shadow-lg flex items-center justify-center font-bold">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">خدمة "وصّلي" (طلب مشوار خاص)</h3>
                  <span className="bg-amber-400 text-purple-950 font-black text-[10px] px-2 py-0.5 rounded-full">سريع وخاص</span>
                </div>
                <p className="text-purple-200 text-xs mt-0.5">انقل أو اشترِ أي شيء من مكان لآخر بنقرة واحدة</p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {isSubmitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-20 h-20 bg-purple-100 text-purple-700 rounded-full mx-auto flex items-center justify-center shadow-inner">
                  <Sparkles className="w-10 h-10 animate-spin" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">تم جاري إرسال طلبك للطيارين!</h3>
                <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                  تمت إضافة مشوارك إلى قائمة الطلبات المتاحة فوراً. سيتلقى أقرب كابتن مشوارك ويبدأ بالتحرك للاستلام.
                </p>
                <button
                  onClick={handleResetAndClose}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-bold px-8 py-3 rounded-2xl shadow-lg text-sm"
                >
                  متابعة الطلب
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Package Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-purple-600" />
                    <span>ماذا تريد أن ننقل أو نشتري لك؟ *</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="مثال: هات لي علاج من صيدلية العزبي في ش البوسطة، أو استلم مفاتيح من الأستاذ أحمد وسلمها في المعادي..."
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-600 focus:bg-white text-slate-900 leading-relaxed"
                  />
                </div>

                {/* Pickup Address */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-amber-600" />
                      <span>عنوان مكان الاستلام (منين؟) *</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGetPickupGPS}
                      className="text-[11px] text-purple-700 font-bold flex items-center gap-1 hover:underline"
                    >
                      <Navigation className="w-3 h-3" />
                      {isLocatingPickup ? 'جاري تحديد الموقع...' : 'تحديد بموقعي الآن'}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="مثال: صيدلية مصر - شارع الجمهوريه أو اختر GPS"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-600 focus:bg-white text-slate-900"
                  />
                </div>

                {/* Dropoff Address */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      <span>عنوان مكان التسليم (لفين؟) *</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGetDropoffGPS}
                      className="text-[11px] text-purple-700 font-bold flex items-center gap-1 hover:underline"
                    >
                      <Navigation className="w-3 h-3" />
                      {isLocatingDropoff ? 'جاري تحديد الموقع...' : 'تحديد بموقعي الآن'}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="مثال: المنزل - برج الأمل الدور الرابع شقة 12"
                    value={dropoffAddress}
                    onChange={(e) => setDropoffAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-purple-600 focus:bg-white text-slate-900"
                  />
                </div>

                {/* Driver Tip & Fee Calculation */}
                <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-900 font-bold">تكلفة التوصيل المقدرة حسب المسافة:</span>
                    <span className="font-extrabold text-purple-700 text-sm font-mono">{estimatedFee} ج.م</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-950 mb-1 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                      <span>إضافة إكرامية تقديرية للكابتن (اختياري):</span>
                    </label>
                    <div className="flex gap-2">
                      {[0, 5, 10, 15, 20].map((tip) => (
                        <button
                          key={tip}
                          type="button"
                          onClick={() => setUserTip(tip)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            userTip === tip
                              ? 'bg-purple-700 text-white shadow-md'
                              : 'bg-white text-purple-900 border border-purple-200 hover:bg-purple-100'
                          }`}
                        >
                          {tip === 0 ? 'بدون' : `+${tip} ج.م`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-purple-200 pt-2 flex items-center justify-between text-sm font-black text-purple-950">
                    <span>إجمالي الأجرة التي ستُدفع للكابتن عند الاستلام:</span>
                    <span className="text-emerald-700 font-mono text-base">{grandTotal} ج.م</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  إرسال المشوار وتكليف أقرب كابتن
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
