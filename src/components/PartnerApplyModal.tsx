import React, { useState } from 'react';
import { X, Store as StoreIcon, Bike, FileText, CheckCircle2, Phone, User, ShieldAlert, Sparkles, Building2, Upload, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MerchantApplication, DriverApplication } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmitMerchant: (app: MerchantApplication) => void;
  onSubmitDriver: (app: DriverApplication) => void;
}

export const PartnerApplyModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSubmitMerchant,
  onSubmitDriver
}) => {
  const [activeTab, setActiveTab] = useState<'merchant' | 'driver'>('merchant');
  const [submitted, setSubmitted] = useState(false);

  // Merchant Form State
  const [storeName, setStoreName] = useState('');
  const [businessType, setBusinessType] = useState('مطعم');
  const [customBusinessType, setCustomBusinessType] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [merchantPhone, setMerchantPhone] = useState('');
  const [hasWhatsapp, setHasWhatsapp] = useState(true);
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');

  // Driver Form State
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('دراجة نارية / سكوتر');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [noLicense, setNoLicense] = useState(false);
  
  // Document Uploads (Data URLs or file names)
  const [personalPhotoUrl, setPersonalPhotoUrl] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80');
  const [driverLicenseUrl, setDriverLicenseUrl] = useState('');
  const [vehicleLicenseUrl, setVehicleLicenseUrl] = useState('');

  // Reset state when closing or opening
  const resetAndClearAll = () => {
    setSubmitted(false);
    setStoreName('');
    setBusinessType('مطعم');
    setCustomBusinessType('');
    setOwnerName('');
    setMerchantPhone('');
    setHasWhatsapp(true);
    setCity('');
    setNotes('');
    setDriverName('');
    setDriverPhone('');
    setVehicleType('دراجة نارية / سكوتر');
    setVehicleBrand('');
    setVehicleModel('');
    setPlateNumber('');
    setNoLicense(false);
    setDriverLicenseUrl('');
    setVehicleLicenseUrl('');
  };

  React.useEffect(() => {
    if (isOpen) {
      resetAndClearAll();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMerchantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName || !ownerName || !merchantPhone) return;

    const cleanPhone = merchantPhone.trim();
    if (cleanPhone.length !== 11 || !/^\d+$/.test(cleanPhone)) {
      alert('خطأ: يجب أن يتكون رقم الهاتف من 11 رقماً بالضبط (مثال: 01501600192)');
      return;
    }

    const app: MerchantApplication = {
      id: 'merch-' + Date.now(),
      storeName: storeName.trim(),
      businessType: businessType === 'آخر' ? (customBusinessType.trim() || 'آخر') : businessType,
      customBusinessType: businessType === 'آخر' ? customBusinessType.trim() : undefined,
      ownerName: ownerName.trim(),
      phone: cleanPhone,
      hasWhatsapp,
      city: city.trim() || 'القاهرة / المحافظات',
      notes: notes.trim(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    onSubmitMerchant(app);
    setSubmitted(true);
  };

  const handleDriverSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName || !driverPhone) return;

    const cleanPhone = driverPhone.trim();
    if (cleanPhone.length !== 11 || !/^\d+$/.test(cleanPhone)) {
      alert('خطأ: يجب أن يتكون رقم الهاتف من 11 رقماً بالضبط (مثال: 01501600192)');
      return;
    }

    const app: DriverApplication = {
      id: 'driver-' + Date.now(),
      fullName: driverName.trim(),
      phone: cleanPhone,
      vehicleType,
      vehicleBrand: vehicleBrand.trim() || 'هوياو / حلاوة',
      vehicleModel: vehicleModel.trim() || '2023',
      plateNumber: plateNumber.trim() || 'س أ ج 1234',
      noLicense,
      personalPhotoUrl,
      driverLicenseUrl: noLicense ? undefined : (driverLicenseUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=80'),
      vehicleLicenseUrl: vehicleLicenseUrl || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=80',
      status: 'pending',
      docStatus: {
        personalPhoto: 'pending',
        driverLicense: noLicense ? undefined : 'pending',
        vehicleLicense: 'pending',
        plateNumber: 'pending'
      },
      createdAt: new Date().toISOString()
    };

    onSubmitDriver(app);
    setSubmitted(true);
  };

  const resetAndClose = () => {
    resetAndClearAll();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-6 relative">
            <button
              onClick={resetAndClose}
              className="absolute left-4 top-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white text-orange-600 p-2.5 shadow-lg flex items-center justify-center font-bold">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">الانضمام إلى عائلة "طلبك دليفري"</h3>
                <p className="text-orange-100 text-xs mt-0.5">سجل متجرك وزد مبيعاتك أو انضم كطيار توصيل بمرتب مجزي</p>
              </div>
            </div>

            {/* Tabs */}
            {!submitted && (
              <div className="flex bg-black/20 p-1 rounded-2xl mt-4 border border-white/20">
                <button
                  onClick={() => setActiveTab('merchant')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'merchant' ? 'bg-white text-orange-700 shadow-md' : 'text-white/80 hover:text-white'
                  }`}
                >
                  <StoreIcon className="w-4 h-4" />
                  تقديم كمتجر / نشاط تجاري
                </button>
                <button
                  onClick={() => setActiveTab('driver')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'driver' ? 'bg-white text-orange-700 shadow-md' : 'text-white/80 hover:text-white'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                  تقديم كطيار / مندوب توصيل
                </button>
              </div>
            )}
          </div>

          {/* Form Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {submitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-12 h-12 animate-bounce" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900">تم تقديم طلبك بنجاح!</h3>
                <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                  شُكراً لاهتمامك بالانضمام إلينا. تم تسجيل كافة بياناتك وأوراقك لدى لوحة الإدارة لمراجعتها، وسيتواصل معك أحد ممثلي فريق العمل عبر الهاتف أو الواتساب فوراً لإتمام التفعيل.
                </p>
                <button
                  onClick={resetAndClose}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-3 rounded-2xl shadow-lg text-sm transition-all"
                >
                  العودة للصفحة الرئيسية
                </button>
              </div>
            ) : activeTab === 'merchant' ? (
              <form onSubmit={handleMerchantSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم المتجر / النشاط التجاري *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: مطعم الشرق، سوبر ماركت البركة"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 focus:bg-white text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">نوع النشاط</label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-slate-900"
                    >
                      <option value="مطعم">مطعم وجبات / أسماك / مشاوي</option>
                      <option value="سوبر ماركت">سوبر ماركت / بقالة</option>
                      <option value="صيدلية">صيدلية ومستلزمات طبية</option>
                      <option value="خضروات وفواكه">خضروات وفواكه طازجة</option>
                      <option value="حلويات ومخبوزات">حلويات ومخبوزات</option>
                      <option value="آخر">آخر (نشاط مختلف)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم صاحب النشاط *</label>
                    <input
                      type="text"
                      required
                      placeholder="اسمك الثلاثي"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-slate-900"
                    />
                  </div>
                </div>

                {/* Custom Business Type Text Field if 'آخر' Selected */}
                {businessType === 'آخر' && (
                  <div>
                    <label className="block text-xs font-bold text-orange-700 mb-1">حدد نوع النشاط التجاري بدقة *</label>
                    <input
                      type="text"
                      required
                      placeholder="اكتب نوع النشاط الخاص بك هنا..."
                      value={customBusinessType}
                      onChange={(e) => setCustomBusinessType(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-orange-50 border border-orange-300 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-slate-900 font-bold"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الموبايل *</label>
                    <input
                      type="tel"
                      required
                      placeholder="01xxxxxxxxx"
                      value={merchantPhone}
                      onChange={(e) => setMerchantPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-slate-900 dir-ltr text-right"
                    />
                    <label className="flex items-center gap-1.5 mt-1.5 text-[11px] font-bold text-emerald-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasWhatsapp}
                        onChange={(e) => setHasWhatsapp(e.target.checked)}
                        className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300"
                      />
                      <span>الرقم به واتساب مفعّل</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">المنطقة / العنوان</label>
                    <input
                      type="text"
                      placeholder="الشارع والمنطقة"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تفاصيل إضافية / السجل التجاري (اختياري)</label>
                  <textarea
                    rows={2}
                    placeholder="اكتب أوقات العمل أو المنتجات الرئيسية..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  إرسال طلب انضمام المتجر
                </button>
              </form>
            ) : (
              <form onSubmit={handleDriverSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الثلاثي للطيار *</label>
                    <input
                      type="text"
                      required
                      placeholder="اسم الكابتن"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الموبايل *</label>
                    <input
                      type="tel"
                      required
                      placeholder="01xxxxxxxxx"
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-slate-900 dir-ltr text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وسيلة التوصيل *</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 text-slate-900 font-bold"
                  >
                    <option value="دراجة نارية / سكوتر">دراجة نارية / سكوتر</option>
                    <option value="دراجة هوائية">دراجة هوائية (عجلة)</option>
                  </select>
                </div>

                {/* Separate Vehicle Brand, Model, Plate Number */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع/ماركة المركبة</label>
                    <input
                      type="text"
                      placeholder="مثال: حلاوة"
                      value={vehicleBrand}
                      onChange={(e) => setVehicleBrand(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الموديل / السنة</label>
                    <input
                      type="text"
                      placeholder="مثال: 2023"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">لوحات اللوحة</label>
                    <input
                      type="text"
                      placeholder="مثال: س أ ج 1234"
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                </div>

                {/* REQUIRED DOCUMENTS SEPARATE UPLOAD BOXES */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1">المستندات المطلوبة (رفع صور منفصلة):</h4>

                  {/* Document 1: Personal Photo */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">1. الصورة الشخصية (مطلوبة):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => setPersonalPhotoUrl(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
                      />
                    </div>
                  </div>

                  {/* Document 2: Driving License */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-800">2. صوره رخصة القيادة:</label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-amber-800">
                        <input
                          type="checkbox"
                          checked={noLicense}
                          onChange={(e) => setNoLicense(e.target.checked)}
                          className="w-3.5 h-3.5 text-orange-600 rounded border-slate-300"
                        />
                        <span>لا أملك رخصة قيادة حالياً</span>
                      </label>
                    </div>

                    {!noLicense && (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => setDriverLicenseUrl(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
                      />
                    )}
                  </div>

                  {/* Document 3: Vehicle License */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">3. صوره رخصة الدراجة / المركبة:</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setVehicleLicenseUrl(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5 text-orange-400" />
                  تقديم كافة الأوراق والمستندات للمراجعة
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
