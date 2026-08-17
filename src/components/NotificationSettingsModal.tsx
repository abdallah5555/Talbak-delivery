import React, { useEffect, useState } from 'react';
import { Bell, BellRing, Check, Clock, Send, ShieldCheck, Smartphone, Sparkles, Vibrate, Volume2, VolumeX, X } from 'lucide-react';
import { User, NotificationPreferences } from '../types';
import {
  getNotificationPermissionState,
  isPushNotificationSupported,
  loadNotificationPreferences,
  saveNotificationPreferences,
  sendTestPushNotification,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications
} from '../lib/pushNotificationService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

const RELIGIOUS_INTERVALS = [5, 15, 30, 60] as const;

export const NotificationSettingsModal: React.FC<Props> = ({ isOpen, onClose, currentUser }) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => loadNotificationPreferences());
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPreferences(loadNotificationPreferences());
    setPermissionState(getNotificationPermissionState());
    setTestStatus(null);
    setErrorMessage(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const supported = isPushNotificationSupported();
  const pushEnabled = permissionState === 'granted' && preferences.pushEnabled;

  const togglePush = async () => {
    if (!currentUser) return;
    setLoading(true);
    setErrorMessage(null);
    setTestStatus(null);
    try {
      if (pushEnabled) {
        const ok = await unsubscribeFromPushNotifications(currentUser.id);
        if (!ok) throw new Error('تعذر تعطيل إشعارات الهاتف.');
        setPreferences(saveNotificationPreferences({ pushEnabled: false }));
        setPermissionState(getNotificationPermissionState());
      } else {
        const result = await subscribeToPushNotifications(currentUser);
        setPermissionState(getNotificationPermissionState());
        if (!result.success) {
          setErrorMessage(result.error || 'تعذر تفعيل الإشعارات.');
          return;
        }
        setPreferences(saveNotificationPreferences({ pushEnabled: true }));
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'حدث خطأ غير متوقع.');
    } finally {
      setLoading(false);
    }
  };

  const setPref = <K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) => {
    setPreferences(saveNotificationPreferences({ [key]: value } as Partial<NotificationPreferences>));
  };

  const sendTest = async () => {
    if (!currentUser) return;
    setLoading(true);
    setErrorMessage(null);
    setTestStatus(null);
    try {
      const result = await sendTestPushNotification(currentUser);
      if (result.success) setTestStatus(result.message);
      else setErrorMessage(result.message);
    } catch (e: any) {
      setErrorMessage(e?.message || 'فشل إرسال الإشعار التجريبي.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="notification-settings-title" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto">
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center"><BellRing className="w-5 h-5" /></div>
            <div><h2 id="notification-settings-title" className="font-extrabold">إعدادات إشعارات الهاتف</h2><p className="text-xs text-orange-100 mt-0.5">إشعارات حقيقية على الهاتف حتى مع إغلاق التطبيق</p></div>
          </div>
          <button onClick={onClose} aria-label="إغلاق" className="p-2 rounded-xl hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-center sm:text-right">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pushEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}><Smartphone className="w-5 h-5" /></div>
              <div><div className="text-sm font-extrabold">إشعارات الهاتف</div><div className="text-[11px] text-slate-500">{permissionState === 'denied' ? 'الإذن محظور من إعدادات الجهاز/المتصفح' : pushEnabled ? 'مفعلة ✅' : 'غير مفعلة حالياً'}</div></div>
            </div>
            <button onClick={togglePush} disabled={loading || !currentUser || !supported} className={`px-4 py-2.5 rounded-xl text-xs font-extrabold ${pushEnabled ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' : 'bg-orange-600 text-white hover:bg-orange-700'} disabled:opacity-50`}>
              {loading ? 'جاري التنفيذ...' : pushEnabled ? 'تعطيل الإشعارات' : 'تفعيل الإشعارات 🔔'}
            </button>
          </div>

          {currentUser?.role === 'admin' && pushEnabled && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><Send className="w-4 h-4 text-orange-600" /><span className="text-xs font-extrabold text-orange-950">اختبر وصول Push إلى الموبايل</span></div>
              <button onClick={sendTest} disabled={loading} className="bg-orange-600 text-white px-3 py-2 rounded-xl text-xs font-extrabold disabled:opacity-50">إرسال 📲</button>
            </div>
          )}

          {testStatus && <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 p-3 text-xs font-bold"><Check className="inline w-4 h-4 ml-1" />{testStatus}</div>}
          {errorMessage && <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 p-3 text-xs font-bold"><X className="inline w-4 h-4 ml-1" />{errorMessage}</div>}

          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-700">إعدادات التنبيه</h3>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 cursor-pointer">
              <span className="flex items-center gap-3"><span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">{preferences.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}</span><span><span className="block text-xs font-extrabold">الصوت</span><span className="block text-[10px] text-slate-500">نغمة داخل التطبيق عند وصول إشعار</span></span></span>
              <input type="checkbox" checked={preferences.soundEnabled} onChange={(e) => setPref('soundEnabled', e.target.checked)} className="w-5 h-5 accent-orange-600" />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 cursor-pointer">
              <span className="flex items-center gap-3"><span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center"><Vibrate className="w-4 h-4" /></span><span><span className="block text-xs font-extrabold">الاهتزاز</span><span className="block text-[10px] text-slate-500">اهتزاز إشعارات الهاتف عندما يدعمه النظام</span></span></span>
              <input type="checkbox" checked={preferences.vibrationEnabled} onChange={(e) => setPref('vibrationEnabled', e.target.checked)} className="w-5 h-5 accent-orange-600" />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 cursor-pointer">
              <span className="flex items-center gap-3"><span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><ShieldCheck className="w-4 h-4" /></span><span><span className="block text-xs font-extrabold">تنبيهات الطلب</span><span className="block text-[10px] text-slate-500">تحديثات حالة الطلب والتوصيل</span></span></span>
              <input type="checkbox" checked={preferences.orderStatusAlerts} onChange={(e) => setPref('orderStatusAlerts', e.target.checked)} className="w-5 h-5 accent-orange-600" />
            </label>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-emerald-50 p-4 space-y-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="flex items-center gap-3"><span className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center"><Sparkles className="w-4 h-4" /></span><span><span className="block text-xs font-extrabold text-amber-950">الأذكار والأدعية الدورية</span><span className="block text-[10px] text-amber-800/80">تصل كإشعار هاتف حقيقي، وليس داخل التطبيق فقط</span></span></span>
              <input type="checkbox" checked={preferences.religiousRemindersEnabled} onChange={(e) => setPref('religiousRemindersEnabled', e.target.checked)} className="w-5 h-5 accent-orange-600" />
            </label>
            {preferences.religiousRemindersEnabled && (
              <div className="pt-2 border-t border-amber-200/70 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900"><Clock className="w-4 h-4" />تكرار التذكير</div>
                <select value={RELIGIOUS_INTERVALS.includes(preferences.religiousReminderIntervalMinutes as typeof RELIGIOUS_INTERVALS[number]) ? preferences.religiousReminderIntervalMinutes : 5} onChange={(e) => setPref('religiousReminderIntervalMinutes', Number(e.target.value) as NotificationPreferences['religiousReminderIntervalMinutes'])} className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-extrabold text-amber-950">
                  <option value={5}>5 دقائق</option>
                  <option value={15}>15 دقيقة</option>
                  <option value={30}>30 دقيقة</option>
                  <option value={60}>60 دقيقة</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end"><button onClick={onClose} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold">تم</button></div>
      </div>
    </div>
  );
};
