import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Vibrate,
  Sparkles,
  Check,
  Send,
  X,
  Smartphone,
  ShieldCheck,
  Clock,
  Heart
} from 'lucide-react';
import { User, NotificationPreferences } from '../types';
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getNotificationPermissionState,
  sendTestPushNotification,
  isPushNotificationSupported
} from '../lib/pushNotificationService';
import { RELIGIOUS_REMINDERS_LIST } from '../lib/religiousReminders';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

export const NotificationSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(() =>
    loadNotificationPreferences()
  );
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(
    'default'
  );
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPreferences(loadNotificationPreferences());
      setPermissionState(getNotificationPermissionState());
      setTestStatus(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isSupported = isPushNotificationSupported();

  const handleTogglePush = async () => {
    if (!currentUser) return;
    setLoading(true);
    setErrorMessage(null);
    setTestStatus(null);

    try {
      if (permissionState === 'granted' && preferences.pushEnabled) {
        // Unsubscribe
        await unsubscribeFromPushNotifications(currentUser.id);
        const updated = saveNotificationPreferences({ pushEnabled: false });
        setPreferences(updated);
      } else {
        // Subscribe
        const result = await subscribeToPushNotifications(currentUser);
        setPermissionState(getNotificationPermissionState());
        if (result.success) {
          const updated = saveNotificationPreferences({ pushEnabled: true });
          setPreferences(updated);
        } else {
          setErrorMessage(result.error || 'تعذر تفعيل الإشعارات.');
        }
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'حدث خطأ غير متوقع.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePref = (key: keyof NotificationPreferences, value: any) => {
    const updated = saveNotificationPreferences({ [key]: value });
    setPreferences(updated);
  };

  const handleSendTestPush = async () => {
    if (!currentUser) return;
    setLoading(true);
    setTestStatus(null);
    setErrorMessage(null);

    try {
      const res = await sendTestPushNotification(currentUser);
      if (res.success) {
        setTestStatus(res.message);
      } else {
        setErrorMessage(res.message);
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'فشل إرسال الإشعار التجريبي.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="notification-settings-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-settings-title"
    >
      <div
        id="notification-settings-modal"
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-scaleUp my-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shadow-inner">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h2 id="notification-settings-title" className="text-base sm:text-lg font-extrabold text-white">
                إعدادات إشعارات الهاتف (Web Push)
              </h2>
              <p className="text-xs text-orange-100 font-medium">
                تنبيهات فورية على شريط أندرويد حتى عند إغلاق التطبيق
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق النافذة"
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Push Status Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-center sm:text-right">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  permissionState === 'granted' && preferences.pushEnabled
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-amber-100 text-amber-600'
                }`}
              >
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                  حالة إشعارات النظام (Android & Web)
                </h3>
                <p className="text-[11px] text-slate-500">
                  {permissionState === 'granted' && preferences.pushEnabled
                    ? 'الإشعارات مفعلة وتعمل في الخلفية والشاشة مغلقة ✅'
                    : permissionState === 'denied'
                    ? 'تم حظر الإشعارات في إعدادات المتصفح/الجهاز'
                    : 'الإشعارات غير مفعلة حالياً'}
                </p>
              </div>
            </div>

            <button
              onClick={handleTogglePush}
              disabled={loading || !currentUser || !isSupported}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1.5 ${
                permissionState === 'granted' && preferences.pushEnabled
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-500/20'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : permissionState === 'granted' && preferences.pushEnabled ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>تعطيل الإشعارات</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  <span>تفعيل الإشعارات 🔔</span>
                </>
              )}
            </button>
          </div>

          {/* Test Push Button (Admin only) */}
          {currentUser?.role === 'admin' && permissionState === 'granted' && preferences.pushEnabled && (
            <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Send className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="text-xs font-bold text-orange-950">
                  اختبار وصول الإشعار إلى شريط أندرويد الآن
                </span>
              </div>
              <button
                onClick={handleSendTestPush}
                disabled={loading}
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition-all active:scale-95 shrink-0 flex items-center gap-1"
              >
                <span>إرسال إشعار تجريبي 📲</span>
              </button>
            </div>
          )}

          {/* Feedback messages */}
          {testStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{testStatus}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
              <X className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Detailed Preferences List */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              خيارات التنبيهات المخصصة
            </h3>

            {/* Sound & Audio Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/60 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  {preferences.soundEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    النغمات الصوتية للتنبيه
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    تشغيل نغمة لطيفة عند ورود إشعار أو تحديث للطلب
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.soundEnabled}
                onChange={(e) => handleTogglePref('soundEnabled', e.target.checked)}
                className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
              />
            </div>

            {/* Vibration Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/60 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Vibrate className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    الاهتزاز على الهاتف (Vibration)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    نمط اهتزاز مخصص لإشعارات التوصيل والطلبات
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.vibrationEnabled}
                onChange={(e) => handleTogglePref('vibrationEnabled', e.target.checked)}
                className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
              />
            </div>

            {/* Order Status Alerts */}
            <div className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/60 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                    تنبيهات حالة الطلب والتوصيل
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    إشعارات تحرك الطيار، تأكيد المطعم، ووصول الطلب
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.orderStatusAlerts}
                onChange={(e) => handleTogglePref('orderStatusAlerts', e.target.checked)}
                className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
              />
            </div>

            {/* Religious Reminders Toggle & Interval Picker */}
            <div className="bg-gradient-to-r from-amber-50/60 via-orange-50/40 to-emerald-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-1.5">
                      الأذكار والأدعية الدورية المتنوعة
                      <span className="text-rose-500 text-xs">🤍</span>
                    </h4>
                    <p className="text-[11px] text-amber-800/80">
                      أذكار متناوبة (الصلاة على النبي، التسبيح، الاستغفار، الأدعية)
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.religiousRemindersEnabled}
                  onChange={(e) =>
                    handleTogglePref('religiousRemindersEnabled', e.target.checked)
                  }
                  className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
                />
              </div>

              {/* Interval Picker */}
              {preferences.religiousRemindersEnabled && (
                <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>تكرار التذكير:</span>
                  </div>
                  <select
                    value={preferences.religiousReminderIntervalMinutes}
                    onChange={(e) =>
                      handleTogglePref(
                        'religiousReminderIntervalMinutes',
                        parseInt(e.target.value, 10)
                      )
                    }
                    className="text-xs font-bold bg-white border border-amber-300 text-amber-950 rounded-xl px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={5}>5 دقائق</option>
                    <option value={10}>10 دقائق</option>
                    <option value={15}>15 دقيقة</option>
                    <option value={20}>20 دقيقة</option>
                    <option value={25}>25 دقيقة</option>
                    <option value={30}>30 دقيقة</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 font-medium">
            تطبيق طلبك دليفري • متوافق مع معايير Web Push الرسمية
          </p>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-xs"
          >
            تم
          </button>
        </div>
      </div>
    </div>
  );
};
