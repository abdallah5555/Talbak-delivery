import React, { useState } from 'react';
import { X, Globe, CheckCircle2, ShieldCheck, ArrowRight, ExternalLink, Code, Layers, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const VercelGuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-6 relative">
            <button
              onClick={onClose}
              className="absolute left-4 top-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-900 font-extrabold flex items-center justify-center text-xl shadow-lg">
                ▲
              </div>
              <div>
                <h3 className="text-xl font-bold">طريقة الاستضافة المجانية على Vercel</h3>
                <p className="text-emerald-400 text-xs mt-0.5 font-medium">كود مجاني 100% وجاهز للرفع الفوري</p>
              </div>
            </div>
          </div>

          <div className="p-6 overflow-y-auto space-y-5 text-slate-700">
            {/* Features Badge */}
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl flex items-center gap-3 text-emerald-950 text-xs">
              <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <strong className="block text-emerald-900 font-bold">مميزات Vercel لتطبيقك (طلبك دليفري):</strong>
                <p className="text-[11px] mt-0.5 text-emerald-800">
                  استضافة مجانية مدى الحياة، رابط أمان HTTPS (ضروري جداً لتثبيت PWA)، وسرعة عالية جداً على السيرفرات العالمية.
                </p>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-sm text-slate-900">خطوات رفع الكود في 3 دقائق:</h4>

              <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">تصدير الكود أو رفعه على GitHub</h5>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    من قائمة الإعدادات (Settings) أطـلب Export as ZIP أو ارفع الملفات إلى مستودع جديد على حسابك في GitHub.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">إنشاء مشروع جديد في Vercel</h5>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    ادخل على <a href="https://vercel.com/new" target="_blank" rel="noreferrer" className="text-orange-600 font-bold underline">vercel.com/new</a> واعمل تسجيل دخول بحساب GitHub واختر المشروع.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">الإعداد والضغط على Deploy</h5>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                    تأكد من اختيار Framework: <strong>Vite</strong>. تم إضافة ملف <code className="bg-slate-200 px-1 py-0.5 rounded text-orange-700">vercel.json</code> تلقائياً لمنع أي أخطاء 404 في الروابط والتطبيق!
                  </p>
                </div>
              </div>
            </div>

            {/* PWA HTTPS Reminder */}
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-xs text-amber-900">
              <span className="font-bold block text-amber-800">ملاحظة هامة جداً لخدمة PWA:</span>
              <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                لكي يثبت العملاء التطبيق على هواتفهم، يشترط نظام Android و iOS أن يكون الموقع يعمل بشهادة أمان SSL (أي يبدأ بـ <code className="dir-ltr inline font-mono">https://</code>). موقع Vercel يوفر هذه الشهادة مجاناً فوراً عند صدور رابط تطبيقك!
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noreferrer"
              className="text-orange-600 hover:text-orange-700 font-bold text-xs flex items-center gap-1"
            >
              <span>فتح موقع Vercel الرسمى</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow transition-colors"
            >
              ممتاز، فهمت الخطوات
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
