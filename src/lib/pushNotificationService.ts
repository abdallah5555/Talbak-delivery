import { User, NotificationPreferences, SendPushPayload, PushSubscriptionRecord } from '../types';
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from './vapidConfig';
import { supabase, isSupabaseConfigured } from './supabase';
import { playNotificationSound } from './soundService';

const PREFS_STORAGE_KEY = 'talabak_notification_preferences';
const VAPID_KEY_STORAGE = 'talabak_push_vapid_public_key';

type PushNotificationOptions = NotificationOptions & {
  vibrate?: number[];
  renotify?: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = { pushEnabled: true, soundEnabled: true, vibrationEnabled: true, orderStatusAlerts: true, promotionsAlerts: true, religiousRemindersEnabled: true, religiousReminderIntervalMinutes: 5 };
export function isPushNotificationSupported(): boolean { return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
export function getNotificationPermissionState(): NotificationPermission | 'unsupported' { return !isPushNotificationSupported() ? 'unsupported' : Notification.permission; }
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> { if (!isPushNotificationSupported()) return 'unsupported'; try { return await Notification.requestPermission(); } catch { return Notification.permission; } }
export function loadNotificationPreferences(): NotificationPreferences { try { const saved = localStorage.getItem(PREFS_STORAGE_KEY); if (saved) return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(saved) }; } catch {} return DEFAULT_NOTIFICATION_PREFERENCES; }

export async function syncReligiousReminderSchedule(userId?: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    let resolvedUserId = userId;
    if (!resolvedUserId) { const { data } = await supabase.auth.getUser(); resolvedUserId = data.user?.id; }
    if (!resolvedUserId) return;
    const prefs = loadNotificationPreferences();
    const enabled = Boolean(prefs.pushEnabled && prefs.religiousRemindersEnabled);
    const interval = [5, 15, 30, 60].includes(prefs.religiousReminderIntervalMinutes) ? prefs.religiousReminderIntervalMinutes : 5;
    const { error } = await supabase.from('religious_reminder_schedules').upsert({ user_id: resolvedUserId, enabled, interval_minutes: interval, next_due_at: enabled ? new Date(Date.now() + interval * 60_000).toISOString() : new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) console.warn('[PushService] religious schedule sync failed:', error.message);
  } catch (e) { console.warn('[PushService] religious schedule sync error:', e); }
}

export function saveNotificationPreferences(prefs: Partial<NotificationPreferences>): NotificationPreferences {
  const updated = { ...loadNotificationPreferences(), ...prefs };
  try { localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated)); } catch {}
  if ('pushEnabled' in prefs || 'religiousRemindersEnabled' in prefs || 'religiousReminderIntervalMinutes' in prefs) void syncReligiousReminderSchedule();
  return updated;
}

async function getActiveServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    try { await reg.update(); } catch (e) { console.warn('[PushService] SW update check failed:', e); }
    await navigator.serviceWorker.ready;
    return reg;
  } catch (e) { console.warn('[PushService] SW registration check failed:', e); return null; }
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> { try { const reg = await getActiveServiceWorkerRegistration(); return reg?.pushManager ? await reg.pushManager.getSubscription() : null; } catch { return null; } }

async function ensureCurrentVapidSubscription(reg: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  let sub = await reg.pushManager.getSubscription();
  let storedKey: string | null = null;
  try { storedKey = localStorage.getItem(VAPID_KEY_STORAGE); } catch {}
  if (sub && storedKey !== VAPID_PUBLIC_KEY) {
    console.info('[PushService] Replacing legacy PushSubscription with current VAPID key.');
    try { await sub.unsubscribe(); } catch (e) { console.warn('[PushService] old subscription unsubscribe failed:', e); }
    sub = null;
  }
  return sub;
}

export async function subscribeToPushNotifications(user: User): Promise<{ success: boolean; subscription?: PushSubscriptionRecord; error?: string }> {
  if (!isPushNotificationSupported()) return { success: false, error: 'المتصفح أو الجهاز الحالي لا يدعم تقنية Web Push Notifications.' };
  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') return { success: false, error: 'تم رفض إذن الإشعارات من إعدادات المتصفح أو الجهاز.' };
    const reg = await getActiveServiceWorkerRegistration();
    if (!reg?.pushManager) return { success: false, error: 'تعذر تشغيل خدمة Service Worker لإدارة الإشعارات.' };
    let sub = await ensureCurrentVapidSubscription(reg);
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as any });
    const subJson = sub.toJSON();
    if (!sub.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) return { success: false, error: 'بيانات الاشتراك في الإشعارات غير مكتملة.' };
    const subscriptionRecord: PushSubscriptionRecord = { userId: user.id, endpoint: sub.endpoint, p256dh: subJson.keys.p256dh, auth: subJson.keys.auth, role: user.role, userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Android PWA', createdAt: new Date().toISOString() };
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('push_subscriptions').upsert({ user_id: user.id, endpoint: sub.endpoint, p256dh: subJson.keys.p256dh, auth: subJson.keys.auth, role: user.role, user_agent: subscriptionRecord.userAgent, updated_at: new Date().toISOString() }, { onConflict: 'endpoint' });
        if (error) console.warn('[PushService] DB push_subscriptions upsert warning:', error.message);
      } catch (e) { console.warn('[PushService] DB push_subscriptions upsert exception:', e); }
    }
    try { localStorage.setItem(VAPID_KEY_STORAGE, VAPID_PUBLIC_KEY); } catch {}
    saveNotificationPreferences({ pushEnabled: true });
    await syncReligiousReminderSchedule(user.id);
    // Enabling push is a settings action, not an application notification.
    return { success: true, subscription: subscriptionRecord };
  } catch (e: any) { console.error('[PushService] subscribeToPushNotifications error:', e); return { success: false, error: e.message || 'حدث خطأ أثناء تفعيل إشعارات الهاتف.' }; }
}

export async function unsubscribeFromPushNotifications(userId?: string): Promise<boolean> {
  try {
    const sub = await getExistingPushSubscription();
    if (sub) { const endpoint = sub.endpoint; await sub.unsubscribe(); if (isSupabaseConfigured && supabase && endpoint) await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint); }
    try { localStorage.removeItem(VAPID_KEY_STORAGE); } catch {}
    saveNotificationPreferences({ pushEnabled: false });
    if (userId) await syncReligiousReminderSchedule(userId);
    return true;
  } catch (e) { console.warn('[PushService] unsubscribe error:', e); return false; }
}

export async function sendPushNotification(payload: SendPushPayload): Promise<{ success: boolean; sentCount?: number; error?: string }> {
  try {
    const prefs = loadNotificationPreferences();
    if (prefs.soundEnabled) playNotificationSound();
    if (isSupabaseConfigured && supabase) {
      try { const { data, error } = await supabase.functions.invoke('send-push-notification', { body: payload }); if (!error && data) return { success: true, sentCount: data.sent || 1 }; if (error) console.warn('[PushService] Edge Function push invocation failed:', error.message); } catch (e) { console.warn('[PushService] Edge Function push invocation failed:', e); }
    }
    if (isPushNotificationSupported() && Notification.permission === 'granted') {
      const reg = await getActiveServiceWorkerRegistration();
      if (reg) {
        const options: PushNotificationOptions = {
          body: payload.body || payload.message || '',
          icon: '/icon-192.png',
          badge: '/favicon.svg',
          vibrate: [200,100,200,100,200,100,400],
          tag: payload.orderId ? `order-${payload.orderId}` : `notif-${Date.now()}`,
          renotify: true,
          dir: 'rtl',
          lang: 'ar',
          data: { url: payload.url || '/', orderId: payload.orderId, type: payload.type || 'general' }
        };
        await reg.showNotification(payload.title, options);
      }
    }
    return { success: true, sentCount: 1 };
  } catch (e: any) { console.error('[PushService] sendPushNotification error:', e); return { success: false, error: e.message || 'تعذر إرسال الإشعار.' }; }
}

export async function sendTestPushNotification(user: User): Promise<{ success: boolean; message: string }> {
  const res = await sendPushNotification({ userId: user.id, role: user.role, title: 'طلبك دليفري 🛵 - إشعار تجريبي', body: `أهلاً بك يا ${user.name}! تم إرسال إشعار تجريبي من طلبك دليفري 🔔`, type: 'system', url: '/' });
  return res.success ? { success: true, message: 'تم إرسال الإشعار التجريبي بنجاح! تفقد شريط إشعارات هاتفك الآن.' } : { success: false, message: res.error || 'تعذر إرسال الإشعار التجريبي.' };
}
