// Service Worker for طلبك دليفري PWA & Real Android Web Push
const CACHE_NAME = 'talabak-delivery-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png'
];

// 1. Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event - Network First with Cache Fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/');
          }
        });
      })
  );
});

// ============================================================================
// REAL ANDROID WEB PUSH NOTIFICATIONS
// ============================================================================

// 4. Push Event: Triggered when app is closed, in background, or in foreground
self.addEventListener('push', (event) => {
  let data = {
    title: 'طلبك دليفري 🛵',
    body: 'لديك تنبيه جديد من تطبيق طلبك دليفري',
    icon: '/icon-192.png',
    badge: '/favicon.svg',
    tag: 'talabak-general',
    url: '/',
    type: 'general',
    orderId: null,
    vibrate: [200, 100, 200, 100, 200, 100, 400],
    isReligious: false
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
      if (parsed.message && !parsed.body) {
        data.body = parsed.message;
      }
    } catch (e) {
      try {
        const text = event.data.text();
        if (text) data.body = text;
      } catch (err) {}
    }
  }

  // Construct actions based on notification type
  const actions = [
    { action: 'open_app', title: 'فتح التطبيق 📱' }
  ];

  if (data.orderId) {
    actions.unshift({ action: 'track_order', title: 'تتبع الطلب 🛵' });
  } else if (data.isReligious) {
    actions.push({ action: 'dismiss', title: 'جزاكم الله خيراً 🤍' });
  } else {
    actions.push({ action: 'dismiss', title: 'إغلاق ✕' });
  }

  const notificationOptions = {
    body: data.body || 'لديك إشعار جديد في تطبيق طلبك دليفري',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/favicon.svg',
    image: data.image || undefined,
    vibrate: data.vibrate || [200, 100, 200, 100, 200, 100, 400],
    tag: data.tag || (data.orderId ? `order-${data.orderId}` : `notif-${Date.now()}`),
    renotify: true,
    requireInteraction: Boolean(data.orderId || data.requireInteraction),
    dir: 'rtl',
    lang: 'ar',
    data: {
      url: data.url || '/',
      orderId: data.orderId || null,
      type: data.type || 'general',
      notifId: data.id || null,
      dateOfArrival: Date.now()
    },
    actions: actions
  };

  event.waitUntil(
    Promise.all([
      // 1. Show system notification on Android Notification Center
      self.registration.showNotification(data.title, notificationOptions),
      
      // 2. Broadcast to open clients (if app is running in foreground)
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'PUSH_NOTIFICATION_RECEIVED',
            payload: {
              ...data,
              title: data.title,
              message: data.body,
              receivedAt: new Date().toISOString()
            }
          });
        });
      })
    ])
  );
});

// 5. Notification Click Event: Opens app, focuses tab, or tracks specific order
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';

  if (action === 'dismiss') {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there is already a window open
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            action: action,
            data: notifData
          });
          return;
        }
      }

      // If no window is open, open a new browser window
      if (self.clients.openWindow) {
        let fullUrl = targetUrl;
        if (notifData.orderId && action === 'track_order') {
          fullUrl = `${targetUrl}?orderId=${notifData.orderId}&openTracking=true`;
        }
        return self.clients.openWindow(fullUrl);
      }
    })
  );
});

// 6. Push Subscription Change Event (Browser key rotation)
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((newSubscription) => {
        return self.clients.matchAll({ type: 'window' }).then((clientList) => {
          clientList.forEach((client) => {
            client.postMessage({
              type: 'PUSH_SUBSCRIPTION_CHANGED',
              subscription: newSubscription.toJSON()
            });
          });
        });
      })
      .catch((err) => {
        console.warn('[SW] Push subscription refresh failed:', err);
      })
  );
});
