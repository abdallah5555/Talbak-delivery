import React, { useState } from 'react';
import { Download, X, HelpCircle, Sparkles, Smartphone, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isInstalled: boolean;
  onInstallClick: () => void;
  onOpenGuide: () => void;
}

export const PWAInstallBanner: React.FC<Props> = ({
  isInstalled,
  onInstallClick,
  onOpenGuide
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-16 sm:bottom-4 left-4 right-4 max-w-lg mx-auto z-40 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl shadow-2xl p-3.5 border border-slate-700/80 backdrop-blur-md"
      >
        <div className="flex items-center justify-between gap-3">
          {/* App Icon + Text */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-orange-600 p-1.5 shadow-lg flex items-center justify-center shrink-0 border border-orange-400/30">
              <img src="/favicon.svg" alt="طلبك دليفري" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-sm text-white">تطبيق "طلبك دليفري"</h4>
                <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-orange-500/30">
                  مجاني PWA
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                ثبّته الآن على موبايلك للوصول السريع
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onInstallClick}
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              تثبيت
            </button>

            <button
              onClick={onOpenGuide}
              title="طريقة التثبيت"
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl border border-slate-700 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={() => setDismissed(true)}
              className="text-slate-400 hover:text-white p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
