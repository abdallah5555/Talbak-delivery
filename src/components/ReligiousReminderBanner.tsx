import React, { useState } from 'react';
import { Sparkles, Heart, X } from 'lucide-react';

interface Props {
  onDismiss?: () => void;
}

export const ReligiousReminderBanner: React.FC<Props> = ({ onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    if (onDismiss) onDismiss();
  };

  return (
    <div
      id="religious-reminder-banner"
      role="region"
      aria-label="تذكير بالصلاة على النبي"
      className="relative overflow-hidden bg-gradient-to-r from-amber-50 via-orange-50 to-emerald-50 border border-amber-200/80 rounded-2xl p-3 sm:p-3.5 shadow-xs transition-all animate-fadeIn"
    >
      <div className="flex items-center justify-between gap-2.5 max-w-full">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-center sm:justify-start">
          <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300/40">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-xs sm:text-sm font-extrabold text-amber-950 tracking-wide select-none text-center sm:text-right truncate">
            <span>اللهم صل وسلم على نبينا محمد</span>
            <span className="inline-block mr-1.5 text-rose-500">🤍</span>
          </p>
        </div>

        <button
          onClick={handleClose}
          aria-label="إغلاق التذكير"
          className="text-amber-700/60 hover:text-amber-900 p-1 rounded-lg hover:bg-amber-100/60 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
