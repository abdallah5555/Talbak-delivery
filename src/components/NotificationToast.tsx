import React, { useEffect } from 'react';
import { Bell, Sparkles, X, ShoppingBag, Bike, Shield } from 'lucide-react';

export interface ToastData {
  id: string;
  title: string;
  message: string;
  type?: string;
  isReligious?: boolean;
}

interface Props {
  toast: ToastData | null;
  onClose: () => void;
  onClick?: () => void;
}

export const NotificationToast: React.FC<Props> = ({ toast, onClose, onClick }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 6000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const getIcon = () => {
    if (toast.isReligious) {
      return <Sparkles className="w-4 h-4 text-amber-500" />;
    }
    switch (toast.type) {
      case 'order':
        return <ShoppingBag className="w-4 h-4 text-orange-500" />;
      case 'driver':
      case 'delivery':
        return <Bike className="w-4 h-4 text-emerald-500" />;
      case 'admin':
      case 'security':
        return <Shield className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-orange-500" />;
    }
  };

  return (
    <div
      id="notification-toast-container"
      role="alert"
      aria-live="polite"
      onClick={onClick}
      className={`fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 z-50 max-w-sm w-[92%] sm:w-80 p-3.5 rounded-2xl shadow-xl border cursor-pointer transition-all animate-bounceIn ${
        toast.isReligious
          ? 'bg-amber-900 text-white border-amber-600/60 shadow-amber-950/20'
          : 'bg-slate-900 text-white border-slate-700/80 shadow-slate-950/30'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
            toast.isReligious ? 'bg-amber-500/20' : 'bg-orange-500/20'
          }`}
        >
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h4 className="font-extrabold text-xs text-white truncate">{toast.title}</h4>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="إغلاق التنبيه"
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-200 mt-0.5 leading-snug break-words">
            {toast.message}
          </p>
        </div>
      </div>
    </div>
  );
};
