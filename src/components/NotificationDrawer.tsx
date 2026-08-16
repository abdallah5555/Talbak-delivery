import React, { useEffect } from 'react';
import { Bell, CheckCheck, Trash2, X, Clock, AlertCircle, ShoppingBag, Bike, Shield, Info, Settings } from 'lucide-react';
import { Notification } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onOpenSettings?: () => void;
}

export const NotificationDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  loading,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onOpenSettings
}) => {
  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatNotificationTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'الآن';
      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      if (diffDays === 1) return 'أمس';
      if (diffDays < 7) return `منذ ${diffDays} أيام`;
      return date.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingBag className="w-4 h-4 text-orange-600" />;
      case 'driver':
      case 'delivery':
        return <Bike className="w-4 h-4 text-emerald-600" />;
      case 'admin':
      case 'security':
        return <Shield className="w-4 h-4 text-purple-600" />;
      case 'reminder':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div
      id="notification-drawer-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end transition-opacity animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-drawer-title"
    >
      <div
        id="notification-drawer-panel"
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-r border-slate-200 animate-slideLeft transform transition-transform"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 id="notification-drawer-title" className="font-extrabold text-sm text-slate-900">
                مركز الإشعارات
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {unreadCount > 0 ? `${unreadCount} إشعار غير مقروء` : 'جميع الإشعارات مقروءة'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                aria-label="تحديد الكل كمقروء"
                title="تحديد الكل كمقروء"
                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors active:scale-95"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>قراءة الكل</span>
              </button>
            )}

            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                aria-label="إعدادات إشعارات الهاتف"
                title="إعدادات إشعارات الهاتف"
                className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              aria-label="إغلاق مركز الإشعارات"
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-100/60">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-500">جاري تحميل الإشعارات...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shadow-inner">
                <Bell className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-700">لا توجد إشعارات حالياً</h3>
                <p className="text-[11px] text-slate-400 max-w-[220px]">
                  ستظهر هنا تحديثات الطلبات ورسائل النظام والتنبيهات الجديدة أولاً بأول.
                </p>
              </div>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                id={`notification-item-${notif.id}`}
                onClick={() => {
                  if (!notif.isRead) {
                    onMarkAsRead(notif.id);
                  }
                }}
                className={`pt-2.5 first:pt-0 group relative p-3 rounded-xl border transition-all cursor-pointer ${
                  notif.isRead
                    ? 'bg-white border-slate-100 hover:bg-slate-50/80 text-slate-700'
                    : 'bg-orange-50/40 border-orange-200/70 hover:bg-orange-50/70 text-slate-900 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Type Icon Badge */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      notif.isRead ? 'bg-slate-100 text-slate-500' : 'bg-orange-100 text-orange-600'
                    }`}
                  >
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Title and Message */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4
                        className={`text-xs truncate ${
                          notif.isRead ? 'font-semibold text-slate-800' : 'font-extrabold text-orange-950'
                        }`}
                      >
                        {notif.title}
                      </h4>
                      {!notif.isRead && (
                        <span
                          className="w-2 h-2 rounded-full bg-orange-600 shrink-0"
                          title="غير مقروء"
                          aria-label="إشعار غير مقروء"
                        />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5 break-words">
                      {notif.message}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-100/60 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatNotificationTime(notif.createdAt)}</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNotification(notif.id);
                        }}
                        aria-label="حذف الإشعار"
                        title="حذف الإشعار"
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 p-1 rounded transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
          <p className="text-[10px] text-slate-400 font-medium">
            تحديث تلقائي فوري عبر تقنية Realtime ⚡
          </p>
        </div>
      </div>
    </div>
  );
};
