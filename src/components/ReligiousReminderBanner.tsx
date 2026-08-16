import React, { useState, useEffect } from 'react';
import { Sparkles, X, RefreshCw } from 'lucide-react';
import { getNextRotatingReminder, ReligiousReminderItem } from '../lib/religiousReminders';

interface Props {
  onDismiss?: () => void;
}

export const ReligiousReminderBanner: React.FC<Props> = ({ onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [reminder, setReminder] = useState<ReligiousReminderItem>(() => getNextRotatingReminder());

  useEffect(() => {
    // Rotate reminder smoothly every few minutes if left open
    const interval = setInterval(() => {
      setReminder(getNextRotatingReminder());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    if (onDismiss) onDismiss();
  };

  const handleNext = () => {
    setReminder(getNextRotatingReminder());
  };

  return (
    <div
      id="religious-reminder-banner"
      role="region"
      aria-label="تذكير طيب"
      className="relative overflow-hidden bg-gradient-to-r from-amber-50 via-orange-50 to-emerald-50 border border-amber-200/80 rounded-2xl p-3 sm:p-3.5 shadow-xs transition-all animate-fadeIn"
    >
      <div className="flex items-center justify-between gap-2.5 max-w-full">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 justify-center sm:justify-start">
          <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300/40">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-xs sm:text-sm font-extrabold text-amber-950 tracking-wide select-none text-center sm:text-right truncate">
            <span>{reminder.text}</span>
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleNext}
            aria-label="تغيير الذكر"
            title="تغيير الذكر"
            className="text-amber-700/60 hover:text-amber-900 p-1 rounded-lg hover:bg-amber-100/60 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          <button
            onClick={handleClose}
            aria-label="إغلاق التذكير"
            className="text-amber-700/60 hover:text-amber-900 p-1 rounded-lg hover:bg-amber-100/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
