import React, { useState } from 'react';
import { X, Smartphone, Share, PlusSquare, MoreVertical, Download, CheckCircle2, AlertCircle, HelpCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  platform: 'ios' | 'android' | 'desktop';
  onTryInstall: () => void;
  hasDeferredPrompt: boolean;
}

export const PWAInstallGuideModal: React.FC<Props> = ({
  isOpen,
  onClose,
  platform,
  onTryInstall,
  hasDeferredPrompt
}) => {
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>(platform === 'ios' ? 'ios' : 'android');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-6 relative">
            <button
              onClick={onClose}
              className="absolute left-4 top-4 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white p-2 shadow-lg flex items-center justify-center">
                <img src="/favicon.svg" alt="طلبك دليفري" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="text-xl font-bold">تثبيت تطبيق "طلبك دليفري"</h3>
                <p className="text-orange-100 text-xs mt-1">احصل على أسرع تجربة طلب بدون تحميل من المتاجر</p>
              </div>
            </div>
          </div>

          {/* Quick Install Action if Prompt Ready */}
          {hasDeferredPrompt && (
            <div className="bg-orange-50 border-b border-orange-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-900 text-xs font-semibold">
                <CheckCircle2 className="w-5 h-5 text-orange-600 shrink-0" />
                <span>جهازك يدعم التثبيت المباشر بنقرة واحدة!</span>
              </div>
              <button
                onClick={() => {
                  onTryInstall();
                  onClose();
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1 shrink-0"
              >
                <Download className="w-4 h-4" />
                تثبيت الآن
              </button>
            </div>
          )}

          {/* Platform Selector Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50 p-2 gap-2">
            <button
              onClick={() => setActiveTab('android')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'android'
                  ? 'bg-white text-orange-600 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              هواتف أندرويد (Android)
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'ios'
                  ? 'bg-white text-orange-600 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Share className="w-4 h-4" />
              هواتف أيفون (iOS / Safari)
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
            {activeTab === 'android' ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 font-medium">خطوات التثبيت على أندرويد (متصفح كروم / سامسونج):</p>
                
                <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
                  <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      اضغط على زر القائمة (النقاط الثلاث)
                      <MoreVertical className="w-4 h-4 text-orange-600 inline" />
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">ستجده في أعلى متصفح كروم على اليمين أو اليسار.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
                  <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      اختر "تثبيت التطبيق" أو "الإضافة إلى الشاشة"
                      <Download className="w-4 h-4 text-orange-600 inline" />
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">اختر (Install app) أو (Add to Home Screen).</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
                  <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">تأكيد التثبيت</h4>
                    <p className="text-xs text-slate-600 mt-1">سيتم تنزيل أيقونة التطبيق على شاشة موبايلك مثل أي تطبيق من المتجر تماماً!</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 font-medium">خطوات التثبيت على الآيفون (متصفح Safari):</p>
                
                <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
                  <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      افتح الرابط في متصفح Safari واضغط زر المشاركة
                      <Share className="w-4 h-4 text-blue-600 inline" />
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">أيقونة المربع مع السهم في أسفل الشاشة.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
                  <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      اختر "الإضافة إلى الشاشة الرئيسية"
                      <PlusSquare className="w-4 h-4 text-slate-800 inline" />
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">(Add to Home Screen) بالمرور للأسفل في القائمة.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
                  <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">اضغط "إضافة" (Add)</h4>
                    <p className="text-xs text-slate-600 mt-1">ستجد التطبيق جاهزاً على الشاشة الرئيسية مع إشعارات وسرعة فائقة.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Troubleshooting info */}
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-800">
                <HelpCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>تواجه مشكلة في التنزيل؟</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-amber-900/90 leading-relaxed pr-1">
                <li>تأكد من فتح الرابط مباشرة في المتصفح الرئيسي (Safari على آيفون، Chrome على أندرويد) وليس داخل تطبيق الفيسبوك/واتساب.</li>
                <li>تأكد من إلغاء وضع التصفح الخفي (Incognito mode).</li>
              </ul>
            </div>
          </div>

          {/* Footer button */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-slate-600 hover:text-slate-900 text-xs font-semibold px-4 py-2"
            >
              إغلاق الدليل
            </button>
            <button
              onClick={() => {
                onTryInstall();
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition-all flex items-center gap-1.5"
            >
              مفهوم، جرب التثبيت
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
