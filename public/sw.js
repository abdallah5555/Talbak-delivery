// Service Worker for طلبك دليفري PWA & Real Android Web Push
const CACHE_NAME = 'talabak-delivery-v7';
const ASSETS_TO_CACHE = ['/', '/index.html', '/manifest.json', '/favicon.svg', '/icon-192.png', '/icon-512.png'];
const NOTIFICATION_DB = 'talabak-push-center';
const NOTIFICATION_STORE = 'received';
const NOTIFICATION_DB_VERSION = 2;
const STATIC_DESTINATIONS = new Set(['script', 'style', 'font']);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((name) => name !== CACHE_NAME ? caches.delete(name) : undefined)))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  return cached || await network || Response.error();
}

async function networkFirstDocument(request) {
  try {
    return await fetch(request, { cache: 'no-store' });
  } catch {
    return (await caches.match(request)) || (await caches.match('/')) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Never cache the service worker itself or authenticated/dynamic Supabase data.
  if (url.pathname === '/sw.js') return;
  if (url.hostname.endsWith('.supabase.co') || url.hostname.includes('supabase')) return;

  if (event.request.destination === 'document') {
    event.respondWith(networkFirstDocument(event.request));
    return;
  }

  if (STATIC_DESTINATIONS.has(event.request.destination)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Third-party images (for example CDN-hosted ad images) stay network-first so a stale
  // cached copy cannot permanently hide a newly configured banner. Same-origin images
  // can still use stale-while-revalidate for fast repeat visits.
  if (event.request.destination === 'image') {
    if (url.origin !== self.location.origin) {
      event.respondWith(fetch(event.request).catch(() => caches.match(event.request) || Response.error()));
      return;
    }
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

function openNotificationDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(NOTIFICATION_DB, NOTIFICATION_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(NOTIFICATION_STORE)) db.createObjectStore(NOTIFICATION_STORE, { keyPath: 'id' });
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
      tx.objectStore(NOTIFICATION_STORE).put({ id, userId: payload.userId || null, title: payload.title || 'طلبك دليفري', message: payload.body || payload.message || '', type: payload.type || 'system', isRead: false, createdAt: new Date().toISOString(), orderId: payload.orderId || null, url: payload.url || '/' });
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
    try { data = { ...data, ...event.data.json() }; } catch { try { data.body = event.data.text(); } catch {} }
  }
  if (data.message && !data.body) data.body = data.message;
  const actions = [{ action: 'open_app', title: 'فتح التطبيق 📱' }];
  if (data.orderId) actions.unshift({ action: 'track_order', title: 'تتبع الطلب 🛵' });
  else if (data.isReligious) actions.push({ action: 'dismiss', title: 'جزاكم الله خيراً 🤍' });
  else actions.push({ action: 'dismiss', title: 'إغلاق ✕' });
  const notificationOptions = { body: data.body || 'لديك إشعار جديد في تطبيق طلبك دليفري', icon: data.icon || '/icon-192.png', badge: data.badge || '/favicon.svg', vibrate: data.vibrate || [200,100,200,100,200,100,400], tag: data.tag || (data.orderId ? `order-${data.orderId}` : `notif-${Date.now()}`), renotify: true, requireInteraction: Boolean(data.orderId || data.requireInteraction), dir: 'rtl', lang: 'ar', data: { url: data.url || '/', orderId: data.orderId || null, type: data.type || 'general', notifId: data.id || null, userId: data.userId || null }, actions };
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
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const data = event.notification.data || {};
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
