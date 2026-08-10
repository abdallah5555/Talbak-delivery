import React, { useState } from 'react';
import { Order, OrderStatus, CartItem } from '../types';
import { X, CheckCircle2, Clock, Phone, MapPin, Bike, ShoppingBag, Edit3, Trash2, Star, CreditCard, ShieldCheck, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onUpdateOrderAddress?: (orderId: string, updatedAddress: { street: string; phone: string; notes: string }) => void;
  onUpdateOrderItems?: (orderId: string, updatedItems: CartItem[]) => void;
  onCancelOrder?: (orderId: string) => void;
  onRateOrder?: (orderId: string, driverRating: number, driverReview: string) => void;
}

const statusSteps: { id: OrderStatus; label: string; desc: string }[] = [
  { id: 'sent', label: 'تم إرسال الطلب', desc: 'تم استلام الطلب وتأكيده في النظام.' },
  { id: 'preparing', label: 'جاري التحضير', desc: 'المتجر يقوم بتجهيز طلبك حالياً.' },
  { id: 'picked_up', label: 'في الطريق إليك', desc: 'المندوب استلم الشحنة وهو في الطريق لعنوانك.' },
  { id: 'delivered', label: 'تم التوصيل', desc: 'نتمنى لك تجربة ممتازة مع طلبك دليفري!' }
];

export const OrderTrackingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  orders,
  onUpdateOrderAddress,
  onUpdateOrderItems,
  onCancelOrder,
  onRateOrder
}) => {
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editStreet, setEditStreet] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Rating state
  const [selectedStars, setSelectedStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [hasRated, setHasRated] = useState(false);

  if (!isOpen) return null;

  const currentOrder = orders[selectedOrderIndex] || orders[0];

  const handleItemQuantityChange = (uniqueId: string, delta: number) => {
    if (!currentOrder || !onUpdateOrderItems) return;
    const updatedItems = currentOrder.items
      .map(ci => {
        if (ci.uniqueId === uniqueId) {
          const newQty = ci.quantity + delta;
          return newQty > 0 ? { ...ci, quantity: newQty } : null;
        }
        return ci;
      })
      .filter(Boolean) as CartItem[];

    if (updatedItems.length === 0) {
      if (confirm('هل تريد إلغاء الطلب بالكامل نظراً لإزالة جميع الأصناف؟')) {
        onCancelOrder?.(currentOrder.id);
      }
      return;
    }

    onUpdateOrderItems(currentOrder.id, updatedItems);
  };

  const handleRemoveItemFromOrder = (uniqueId: string) => {
    if (!currentOrder || !onUpdateOrderItems) return;
    const updatedItems = currentOrder.items.filter(ci => ci.uniqueId !== uniqueId);

    if (updatedItems.length === 0) {
      if (confirm('هل تريد إلغاء الطلب بالكامل نظراً لإزالة جميع الأصناف؟')) {
        onCancelOrder?.(currentOrder.id);
      }
      return;
    }

    onUpdateOrderItems(currentOrder.id, updatedItems);
  };

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'received':
      case 'sent': return 0;
      case 'preparing':
      case 'driver_assigned':
      case 'arrived_store': return 1;
      case 'picked_up':
      case 'arrived_customer': return 2;
      case 'delivered': return 3;
      default: return 0;
    }
  };

  const isPendingAndEditable = currentOrder &&
    (!currentOrder.driver) &&
    (currentOrder.status === 'sent' || currentOrder.status === 'received' || currentOrder.status === 'preparing');

  const startEditAddress = () => {
    if (!currentOrder) return;
    setEditStreet(currentOrder.deliveryAddress.street || '');
    setEditPhone(currentOrder.deliveryAddress.phone || '');
    setEditNotes(currentOrder.deliveryAddress.notes || '');
    setIsEditingAddress(true);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrder || !onUpdateOrderAddress) return;
    onUpdateOrderAddress(currentOrder.id, {
      street: editStreet,
      phone: editPhone,
      notes: editNotes
    });
    setIsEditingAddress(false);
  };

  const handleCancelClick = () => {
    if (!currentOrder || !onCancelOrder) return;
    if (confirm('هل أنت تأكد من رغبتك في إلغاء هذا الطلب؟')) {
      onCancelOrder(currentOrder.id);
    }
  };

  const handleRatingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrder || !onRateOrder) return;
    onRateOrder(currentOrder.id, selectedStars, reviewText);
    setHasRated(true);
  };

  const itemsSubtotal = currentOrder ? (currentOrder.subtotal || (currentOrder.total - currentOrder.deliveryFee + currentOrder.discount)) : 0;
  const cashToCollect = currentOrder?.paymentPaidOnline
    ? currentOrder.deliveryFee
    : currentOrder?.total || 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <h3 className="font-extrabold text-base">متابعة الطلبات والحالة</h3>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1">
            {orders.length === 0 ? (
              <div className="text-center py-12 text-slate-500 space-y-2">
                <ShoppingBag className="w-12 h-12 mx-auto text-slate-300" />
                <h4 className="font-extrabold text-sm text-slate-800">لا توجد طلبات سابقة حتى الآن</h4>
                <p className="text-xs">اطلب من مطاعمك ومتاجر المفضلين وتابع شحنتك هنا لحظة بلحظة!</p>
              </div>
            ) : (
              <>
                {/* Order Selector Tabs if multiple */}
                {orders.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {orders.map((ord, idx) => (
                      <button
                        key={ord.id}
                        onClick={() => {
                          setSelectedOrderIndex(idx);
                          setIsEditingAddress(false);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                          selectedOrderIndex === idx
                            ? 'bg-orange-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        طلب #{ord.id.slice(-4)} ({ord.total} ج.م)
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Order Overview Card */}
                {currentOrder && (
                  <div className="space-y-4">
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-orange-800 font-extrabold block">
                          رقم الطلب: #{currentOrder.id}
                        </span>
                        <h4 className="font-black text-sm text-slate-900 mt-0.5">
                          الإجمالي: {currentOrder.total} جنيه مصري
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          التاريخ: {currentOrder.createdAt}
                        </p>
                      </div>

                      <div className="text-left space-y-1">
                        <span className="bg-orange-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-2xs block text-center">
                          {currentOrder.status === 'cancelled' ? 'ملغي' : `${currentOrder.estimatedMinutes} دقيقة`}
                        </span>
                        {currentOrder.paymentPaidOnline && (
                          <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md block text-center">
                            مدفوع للمحل إلكترونياً 💳
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pending Order Actions: Edit or Cancel */}
                    {isPendingAndEditable && (
                      <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-amber-950 flex items-center gap-1">
                            <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                            الطلب لم يتم قبوله بعد من الطيار - يمكنك التعديل أو الإلغاء
                          </span>
                        </div>

                        {!isEditingAddress ? (
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={startEditAddress}
                              className="flex-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                              <span>تعديل العنوان والملاحظات</span>
                            </button>
                            <button
                              onClick={handleCancelClick}
                              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs px-3 py-2 rounded-xl transition-colors flex items-center justify-center gap-1 shadow-2xs"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              <span>إلغاء الطلب</span>
                            </button>
                          </div>
                        ) : (
                          <form onSubmit={handleSaveAddress} className="space-y-2 pt-2 border-t border-amber-200 text-xs">
                            <div>
                              <label className="block font-bold text-amber-950 mb-1">الشارع والمنطقة:</label>
                              <input
                                type="text"
                                required
                                value={editStreet}
                                onChange={(e) => setEditStreet(e.target.value)}
                                className="w-full p-2 bg-white rounded-lg border border-amber-300 text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-amber-950 mb-1">رقم الهاتف:</label>
                              <input
                                type="tel"
                                required
                                value={editPhone}
                                onChange={(e) => setEditPhone(e.target.value)}
                                className="w-full p-2 bg-white rounded-lg border border-amber-300 text-slate-900"
                              />
                            </div>
                            <div>
                              <label className="block font-bold text-amber-950 mb-1">ملاحظات جديدة للمندوب:</label>
                              <input
                                type="text"
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                className="w-full p-2 bg-white rounded-lg border border-amber-300 text-slate-900"
                              />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                type="submit"
                                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 rounded-lg shadow"
                              >
                                حفظ التعديلات
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsEditingAddress(false)}
                                className="bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg"
                              >
                                إلغاء
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}

                    {/* Progress Status Bar */}
                    {currentOrder.status !== 'cancelled' ? (
                      <div className="space-y-3">
                        <h4 className="font-extrabold text-xs text-slate-900">حالة التوصيل الحالية:</h4>
                        <div className="space-y-3 relative pr-4 border-r-2 border-slate-200 mr-2">
                          {statusSteps.map((step, idx) => {
                            const currentStepIdx = getStepIndex(currentOrder.status);
                            const isDone = idx <= currentStepIdx;
                            const isCurrent = idx === currentStepIdx;

                            return (
                              <div key={step.id} className="relative flex items-start gap-3">
                                <div
                                  className={`absolute -right-[23px] top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold transition-all ${
                                    isDone
                                      ? 'bg-orange-600 text-white ring-4 ring-orange-100'
                                      : 'bg-slate-200 text-slate-500'
                                  }`}
                                >
                                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                                </div>

                                <div className="pr-3">
                                  <h5 className={`font-bold text-xs ${isCurrent ? 'text-orange-600' : 'text-slate-800'}`}>
                                    {step.label}
                                  </h5>
                                  <p className="text-[11px] text-slate-500 mt-0.5">{step.desc}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-red-50 p-4 rounded-2xl border border-red-200 text-center text-red-700 text-xs font-bold">
                        تم إلغاء هذا الطلب بنجاح.
                      </div>
                    )}

                    {/* Driver Details Card (Including Plate Number & Rating) */}
                    {currentOrder.driver && (
                      <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-3 shadow-lg border border-slate-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={currentOrder.driver.avatar}
                              alt={currentOrder.driver.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-orange-500 shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-extrabold text-sm text-white">{currentOrder.driver.name}</h5>
                                <div className="flex items-center gap-1 bg-amber-400 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded-full">
                                  <Star className="w-3 h-3 fill-slate-950 text-slate-950" />
                                  <span>{currentOrder.driver.rating || 4.9}</span>
                                </div>
                              </div>

                              <p className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-1.5">
                                <Bike className="w-3.5 h-3.5 text-orange-400" />
                                <span>{currentOrder.driver.vehicle}</span>
                              </p>
                              
                              {/* Driver Vehicle Plate Number */}
                              <div className="mt-1 bg-slate-800 border border-slate-700 inline-block px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold text-amber-300">
                                رقم اللوحة: {currentOrder.driver.plateNumber || 'س أ ج 1482'}
                              </div>
                            </div>
                          </div>

                          <a
                            href={`tel:${currentOrder.driver.phone}`}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow transition-colors flex items-center gap-1.5 shrink-0"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>اتصال</span>
                          </a>
                        </div>

                        {/* Rating Submission Component if Order Delivered */}
                        {currentOrder.status === 'delivered' && (
                          <div className="border-t border-slate-800 pt-3">
                            {hasRated || currentOrder.ratings?.driverRating ? (
                              <div className="bg-slate-800/80 p-2.5 rounded-xl text-center text-xs text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>شكراً لتقييمك المندوب! (تقييمك: 5★)</span>
                              </div>
                            ) : (
                              <form onSubmit={handleRatingSubmit} className="space-y-2">
                                <span className="block text-xs font-bold text-slate-300 text-center">
                                  ما هو تقييمك لأداء الكابتن {currentOrder.driver.name}؟
                                </span>
                                <div className="flex justify-center gap-2">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      type="button"
                                      key={star}
                                      onClick={() => setSelectedStars(star)}
                                      className="p-1"
                                    >
                                      <Star
                                        className={`w-6 h-6 transition-all ${
                                          star <= selectedStars ? 'fill-amber-400 text-amber-400 scale-110' : 'text-slate-600'
                                        }`}
                                      />
                                    </button>
                                  ))}
                                </div>
                                <button
                                  type="submit"
                                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs py-2 rounded-xl transition-colors shadow"
                                >
                                  إرسال التقييم
                                </button>
                              </form>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Order Items & Full Detailed Invoice */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <h5 className="font-extrabold text-xs text-slate-900">
                          تفاصيل الأصناف والفاتورة:
                        </h5>
                        {isPendingAndEditable && (
                          <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                            ✏️ يمكنك زياده أو نقصان الكميات الآن
                          </span>
                        )}
                      </div>
                      
                      <div className="divide-y divide-slate-200/60">
                        {currentOrder.items.map((ci) => {
                          const itemOptsPrice = ci.selectedOptions.reduce((acc, opt) => acc + opt.price, 0);
                          const itemTotalPrice = (ci.item.price + itemOptsPrice) * ci.quantity;

                          return (
                            <div key={ci.uniqueId} className="py-2 flex items-center justify-between text-xs font-medium gap-2">
                              <div className="flex-1">
                                <span className="font-bold text-slate-900">{ci.item.name}</span>
                                <span className="text-[10px] text-slate-500 block">من: {ci.storeName}</span>
                                {ci.selectedOptions.length > 0 && (
                                  <span className="text-[10px] text-orange-700 block">
                                    خيارات: {ci.selectedOptions.map(o => o.optionName).join('، ')}
                                  </span>
                                )}
                              </div>

                              {isPendingAndEditable ? (
                                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                                  <button
                                    onClick={() => handleItemQuantityChange(ci.uniqueId, -1)}
                                    className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                                    title="إنقاص الكمية"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>

                                  <span className="font-black text-xs px-1 min-w-4 text-center">{ci.quantity}</span>

                                  <button
                                    onClick={() => handleItemQuantityChange(ci.uniqueId, 1)}
                                    className="w-6 h-6 rounded-lg bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center transition-colors shadow-2xs"
                                    title="زيادة الكمية"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleRemoveItemFromOrder(ci.uniqueId)}
                                    className="w-6 h-6 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors mr-1"
                                    title="حذف هذا الصنف"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="font-bold text-slate-900 text-xs px-2 py-0.5 bg-slate-100 rounded-md">
                                  {ci.quantity}x
                                </span>
                              )}

                              <span className="font-extrabold text-slate-900 min-w-[50px] text-left">{itemTotalPrice} ج.م</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Electronic Payment Deduction Invoice Calculation */}
                      <div className="border-t border-slate-200 pt-2.5 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>ثمن المنتجات المطلوبة:</span>
                          <span className="font-mono">{itemsSubtotal} ج.م</span>
                        </div>

                        {currentOrder.paymentPaidOnline && (
                          <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 p-1.5 rounded-lg border border-emerald-200">
                            <span className="flex items-center gap-1">
                              <CreditCard className="w-3.5 h-3.5" />
                              تم الدفع إلكترونياً للمحل (خصم):
                            </span>
                            <span className="font-mono">-{itemsSubtotal} ج.م</span>
                          </div>
                        )}

                        <div className="flex justify-between text-slate-600">
                          <span>رسوم التوصيل للمندوب:</span>
                          <span className="font-mono">{currentOrder.deliveryFee} ج.م</span>
                        </div>

                        {currentOrder.discount > 0 && (
                          <div className="flex justify-between text-emerald-600 font-bold">
                            <span>خصم الكوبون:</span>
                            <span className="font-mono">-{currentOrder.discount} ج.م</span>
                          </div>
                        )}

                        <div className="flex justify-between text-slate-900 font-extrabold text-sm border-t border-slate-300 pt-2 mt-1">
                          <span>المبلغ المطلوب تسليمه كاش للمندوب:</span>
                          <span className="text-orange-600 font-mono text-base">{cashToCollect} ج.م</span>
                        </div>

                        {currentOrder.paymentPaidOnline && (
                          <p className="text-[10px] text-emerald-800 font-bold text-center bg-emerald-100 p-2 rounded-xl mt-1">
                            💡 ملاحظة للعميل والطيار: تم دفع ثمن المنتج إلكترونياً، ولذلك فإن المطلوب دفعه نقداً للكابتن هو رسوم التوصيل فقط ({currentOrder.deliveryFee} ج.م).
                          </p>
                        )}
                      </div>
                    </div>

                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
            <button
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-colors"
            >
              موافق، إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
