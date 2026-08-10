import React, { useState } from 'react';
import { X, Share2, Copy, Check, QrCode, Smartphone, ExternalLink, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareAppModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const appUrl = window.location.href;

  if (!isOpen) return null;

  const shareText = `🚀 حمّل تطبيق "طلبك دليفري" واطلب أكلتك وسوبرماركتك المفضلة بأسرع توصيل!\n\nافتـح الرابط وثبّت التطبيق مباشرةً على موبايلك:\n${appUrl}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'طلبك دليفري - تطبيق التوصيل السريع',
          text: 'افتـح الرابط وثبّت التطبيق مباشرةً على موبايلك بأسهل طريقة!',
          url: appUrl
        });
      } catch (e) {
        console.log('Share dismissed', e);
      }
    } else {
      handleCopy();
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-5 text-center relative">
            <button
              onClick={onClose}
              className="absolute left-4 top-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-14 h-14 bg-white rounded-2xl p-2 mx-auto shadow-lg flex items-center justify-center mb-2">
              <img src="/favicon.svg" alt="طلبك دليفري" className="w-full h-full object-contain" />
            </div>
            <h3 className="font-extrabold text-lg">مشاركة تطبيق "طلبك دليفري"</h3>
            <p className="text-orange-100 text-xs mt-1">شارك الرابط مع أصدقائك ليتمكنوا من تثبيت التطبيق على هواتفهم</p>
          </div>

          <div className="p-5 space-y-4 text-slate-800">
            {/* Direct WhatsApp button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs p-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              <span>مشاركة عبر واتساب (WhatsApp)</span>
            </a>

            {/* Native share button if supported */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs p-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Share2 className="w-5 h-5" />
                <span>مشاركة عبر تطبيقات الموبايل</span>
              </button>
            )}

            {/* Copy Link Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">رابط التطبيق المباشر:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={appUrl}
                  className="bg-slate-100 text-xs font-mono font-medium p-3 rounded-xl border border-slate-200 flex-1 dir-ltr text-left truncate"
                />
                <button
                  onClick={handleCopy}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-3 rounded-xl shadow transition-colors flex items-center gap-1 shrink-0"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'تم النسخ!' : 'نسخ'}</span>
                </button>
              </div>
            </div>

            {/* PWA Note */}
            <div className="bg-orange-50 border border-orange-200/80 p-3.5 rounded-2xl text-xs text-orange-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-orange-800">
                <Smartphone className="w-4 h-4 text-orange-600 shrink-0" />
                <span>تثبيت تلقائي على الهاتف:</span>
              </div>
              <p className="text-[11px] text-orange-950 leading-relaxed">
                عندما يفتح صديقك هذا الرابط على متصفح هاتف الأندرويد أو الآيفون، سيظهر له إشعار لتثبيت التطبيق مباشرة فوراً.
              </p>
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
            <button
              onClick={onClose}
              className="text-slate-600 hover:text-slate-900 text-xs font-bold"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
