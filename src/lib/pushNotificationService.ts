import { User, NotificationPreferences, SendPushPayload, PushSubscriptionRecord } from '../types';
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from './vapidConfig';
import { supabase, isSupabaseConfigured } from './supabase';
import { playNotificationSound } from './soundService';

const PREFS_STORAGE_KEY = 'talabak_notification_preferences';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  soundEnabled: true,
  vibrationEnabled: true,
  orderStatusAlerts: true,
  promotionsAlerts: true,
  religiousRemindersEnabled: true,
  religiousReminderIntervalMinutes: 5
};

export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushNotificationSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch (e) {
    console.warn('[PushService] requestPermission error:', e);
    return Notification.permission;
  }
}

export function loadNotificationPreferences(): NotificationPreferences {
  try {
    const saved = localStorage.getItem(PREFS_STORAGE_KEY);
    if (saved) return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(saved) };
  } catch (e) {
    console.warn('[PushService] loadPreferences failed:', e);
  }
  return DEFAULT_NOTIFICATION_PREFERENCES;
}

/** Sync the user's religious reminder settings to the server scheduler. */
export async function syncReligiousReminderSchedule(userId?: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const { data } = await supabase.auth.getUser();
      resolvedUserId = data.user?.id;
    }
    if (!resolvedUserId) return;

    const prefs = loadNotificationPreferences();
    const enabled = Boolean(prefs.pushEnabled && prefs.religiousRemindersEnabled);
    const allowedIntervals = [5, 15, 30, 60];
    const interval = allowedIntervals.includes(prefs.religiousReminderIntervalMinutes)
      ? prefs.religiousReminderIntervalMinutes
      : 5;

    const { error } = await supabase.from('religious_reminder_schedules').upsert(
      {
        user_id: resolvedUserId,
        enabled,
        interval_minutes: interval,
        next_due_at: enabled
          ? new Date(Date.now() + interval * 60_000).toISOString()
          : new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    );

    if (error) console.warn('[PushService] religious schedule sync failed:', error.message);
  } catch (e) {
    console.warn('[PushService] religious schedule sync error:', e);
  }
}

/** Save preferences locally and asynchronously mirror server-controlled religious scheduling. */
export function saveNotificationPreferences(prefs: Partial<NotificationPreferences>): NotificationPreferences {
  const current = loadNotificationPreferences();
  const updated = { ...current, ...prefs };
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[PushService] savePreferences failed:', e);
  }

  if (
    'pushEnabled' in prefs ||
    'religiousRemindersEnabled' in prefs ||
    'religiousReminderIntervalMinutes' in prefs
  ) {
    void syncReligiousReminderSchedule();
  }
  return updated;
}

async function getActiveServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (e) {
    console.warn('[PushService] SW registration check failed:', e);
    return null;
  }
}

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  try {
    const reg = await getActiveServiceWorkerRegistration();
    if (!reg || !reg.pushManager) return null;
    return await reg.pushManager.getSubscription();
  } catch (e) {
    console.warn('[PushService] getSubscription failed:', e);
    return null;
  }
}

export async function subscribeToPushNotifications(user: User): Promise<{
  success: boolean;
  subscription?: PushSubscriptionRecord;
  error?: string;
}> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'المتصفح أو الجهاز الحالي لا يدعم تقنية Web Push Notifications.' };
  }

  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'تم رفض إذن الإشعارات من إعدادات المتصفح أو الجهاز.' };
    }

    const reg = await getActiveServiceWorkerRegistration();
    if (!reg || !reg.pushManager) {
      return { success: false, error: 'تعذر تشغيل خدمة Service Worker لإدارة الإشعارات.' };
    }

    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey as any });
    }

    const subJson = sub.toJSON();
    if (!sub.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return { success: false, error: 'بيانات الاشتراك في الإشعارات غير مكتملة.' };
    }

    const subscriptionRecord: PushSubscriptionRecord = {
      userId: user.id,
      endpoint: sub.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
      role: user.role,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Android PWA',
      createdAt: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('push_subscriptions').upsert(
          {
            user_id: user.id,
            endpoint: sub.endpoint,
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
            role: user.role,
            user_agent: subscriptionRecord.userAgent,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'endpoint' }
        );
        if (error) console.warn('[PushService] DB push_subscriptions upsert warning:', error.message);
      } catch (dbErr) {
        console.warn('[PushService] DB error saving subscription:', dbErr);
      }
    }

    saveNotificationPreferences({ pushEnabled: true });
    await syncReligiousReminderSchedule(user.id);

    return { success: true, subscription: subscriptionRecord };
  } catch (e: any) {
    console.error('[PushService] subscribeToPushNotifications error:', e);
    return { success: false, error: e.message || 'حدث خطأ أثناء تفعيل إشعارات الهاتف.' };
  }
}

export async function unsubscribeFromPushNotifications(userId?: string): Promise<boolean> {
  try {
    const sub = await getExistingPushSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      if (isSupabaseConfigured && supabase && endpoint) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      }
    }
    saveNotificationPreferences({ pushEnabled: false });
    if (userId) await syncReligiousReminderSchedule(userId);
    return true;
  } catch (e) {
    console.warn('[PushService] unsubscribe error:', e);
    return false;
  }
}

export async function sendPushNotification(payload: SendPushPayload): Promise<{
  success: boolean;
  sentCount?: number;
  error?: string;
}> {
  try {
    const prefs = loadNotificationPreferences();
    if (prefs.soundEnabled) playNotificationSound();

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('send-push-notification', { body: payload });
        if (!error && data) return { success: true, sentCount: data.sent || 1 };
      } catch (edgeErr) {
        console.warn('[PushService] Edge Function push invocation failed, using local trigger:', edgeErr);
      }
    }

    if (isPushNotificationSupported() && Notification.permission === 'granted') {
      const reg = await getActiveServiceWorkerRegistration();
      if (reg) {
        const options: Record<string, any> = {
          body: payload.body || payload.message || '',
          icon: '/icon-192.png',
          badge: '/favicon.svg',
          vibrate: [200, 100, 200, 100, 200, 100, 400],
          tag: payload.orderId ? `order-${payload.orderId}` : `notif-${Date.now()}`,
          renotify: true,
          dir: 'rtl',
          lang: 'ar',
          data: { url: payload.url || '/', orderId: payload.orderId, type: payload.type || 'general' }
        };
        await reg.showNotification(payload.title, options as NotificationOptions);
      }
    }
    return { success: true, sentCount: 1 };
  } catch (e: any) {
    console.error('[PushService] sendPushNotification error:', e);
    return { success: false, error: e.message || 'تعذر إرسال الإشعار.' };
  }
}

export async function sendTestPushNotification(user: User): Promise<{ success: boolean; message: string }> {
  const payload: SendPushPayload = {
    userId: user.id,
    role: user.role,
    title: 'طلبك دليفري 🛵 - إشعار تجريبي',
    body: `أهلاً بك يا ${user.name}! تم تفعيل إشعارات الهاتف بنجاح 🔔 وسيعمل التنبيه حتى لو كان التطبيق مغلقاً.`,
    type: 'system',
    url: '/'
  };

  const res = await sendPushNotification(payload);
  if (res.success) return { success: true, message: 'تم إرسال الإشعار التجريبي بنجاح! تفقد شريط إشعارات هاتفك الآن.' };
  return { success: false, message: res.error || 'تعذر إرسال الإشعار التجريبي.' };
}
