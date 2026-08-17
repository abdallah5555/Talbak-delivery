// Service Worker for طلبك دليفري PWA & Real Android Web Push
const CACHE_NAME = 'talabak-delivery-v5';
const ASSETS_TO_CACHE = ['/', '/index.html', '/manifest.json', '/favicon.svg', '/icon-192.png', '/icon-512.png'];
const NOTIFICATION_DB = 'talabak-push-center';
const NOTIFICATION_STORE = 'received';
const NOTIFICATION_DB_VERSION = 2;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(names.map((name) => name !== CACHE_NAME ? caches.delete(name) : undefined))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Never serve a stale service worker itself from the runtime cache.
  if (new URL(event.request.url).pathname === '/sw.js') return;
  event.respondWith(fetch(event.request).then((response) => {
    if (response?.status === 200 && event.request.url.startsWith(self.location.origin)) {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
    }
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || (event.request.headers.get('accept')?.includes('text/html') ? caches.match('/') : undefined))));
});

function openNotificationDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(NOTIFICATION_DB, NOTIFICATION_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(NOTIFICATION_STORE)) {
        db.createObjectStore(NOTIFICATION_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function persistPushNotification(payload) {
  try {
    const db = await openNotificationDb();
    const id = `push-${payload.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(NOTIFICATION_STORE, 'readwrite');
      tx.objectStore(NOTIFICATION_STORE).put({
        id,
        userId: payload.userId || null,
        title: payload.title || 'طلبك دليفري',
        message: payload.body || payload.message || '',
        type: payload.type || 'system',
        isRead: false,
        createdAt: new Date().toISOString(),
        orderId: payload.orderId || null,
        url: payload.url || '/'
      });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return id;
  } catch (error) {
    console.warn('[SW] Could not persist push notification:', error);
    return null;
  }
}

self.addEventListener('push', (event) => {
  let data = { title: 'طلبك دليفري 🛵', body: 'لديك تنبيه جديد من تطبيق طلبك دليفري', icon: '/icon-192.png', badge: '/favicon.svg', tag: 'talabak-general', url: '/', type: 'general', orderId: null, vibrate: [200,100,200,100,200,100,400], isReligious: false, userId: null };
  if (event.data) {
    try { data = { ...data, ...event.data.json() }; }
    catch { try { data.body = event.data.text(); } catch {} }
  }
  if (data.message && !data.body) data.body = data.message;
  const actions = [{ action: 'open_app', title: 'فتح التطبيق 📱' }];
  if (data.orderId) actions.unshift({ action: 'track_order', title: 'تتبع الطلب 🛵' });
  else if (data.isReligious) actions.push({ action: 'dismiss', title: 'جزاكم الله خيراً 🤍' });
  else actions.push({ action: 'dismiss', title: 'إغلاق ✕' });
  const notificationOptions = {
    body: data.body || 'لديك إشعار جديد في تطبيق طلبك دليفري', icon: data.icon || '/icon-192.png', badge: data.badge || '/favicon.svg',
    vibrate: data.vibrate || [200,100,200,100,200,100,400], tag: data.tag || (data.orderId ? `order-${data.orderId}` : `notif-${Date.now()}`),
    renotify: true, requireInteraction: Boolean(data.orderId || data.requireInteraction), dir: 'rtl', lang: 'ar',
    data: { url: data.url || '/', orderId: data.orderId || null, type: data.type || 'general', notifId: data.id || null, userId: data.userId || null }, actions
  };
  event.waitUntil((async () => {
    const persistedId = await persistPushNotification(data);
    await self.registration.showNotification(data.title, notificationOptions);
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach((client) => client.postMessage({ type: 'PUSH_NOTIFICATION_RECEIVED', payload: { ...data, id: persistedId || data.id, title: data.title, message: data.body, receivedAt: new Date().toISOString() } }));
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const data = event.notification.data || {};
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      if ('focus' in client) { client.focus(); client.postMessage({ type: 'NOTIFICATION_CLICKED', action: event.action, data }); return; }
    }
    if (self.clients.openWindow) {
      let url = data.url || '/';
      if (data.orderId && event.action === 'track_order') url = `${url}?orderId=${data.orderId}&openTracking=true`;
      return self.clients.openWindow(url);
    }
  }));
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(self.registration.pushManager.subscribe(event.oldSubscription.options).then((subscription) => self.clients.matchAll({ type: 'window' }).then((clients) => clients.forEach((client) => client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED', subscription: subscription.toJSON() })))).catch((err) => console.warn('[SW] Push subscription refresh failed:', err)));
});