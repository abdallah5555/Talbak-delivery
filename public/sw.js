const CACHE = "talbak-shell-v4";
const SHELL = ["/", "/manifest.json", "/logo.svg"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) {
        return Promise.all(
          SHELL.map(function (url) {
            return cache.add(url).catch(function () {
              return undefined;
            });
          })
        );
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (key) { return key.startsWith("talbak-shell-") && key !== CACHE; }).map(function (key) {
            return caches.delete(key);
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.headers.has("authorization")) return;
  // Only the public app shell and compiled static assets belong in this cache.
  // API responses must never fall back to HTML or be shared between accounts.
  var navigation = request.mode === "navigate" && url.pathname === "/";
  var asset = url.pathname.startsWith("/assets/") || ["/manifest.json", "/logo.svg"].includes(url.pathname);
  if (!navigation && !asset) return;

  var responsePromise =
    fetch(request)
      .then(async function (response) {
        if (response.ok) {
          var copy = response.clone();
          try {
            var cache = await caches.open(CACHE);
            await cache.put(navigation ? "/" : request, copy);
          } catch (_) { /* Cache quota failures must not break network success. */ }
        }
        return response;
      })
      .catch(function () {
        return caches.open(CACHE).then(function (cache) {
          return cache.match(navigation ? "/" : request);
        }).then(function (cached) { return cached || Response.error(); });
      });
  event.respondWith(responsePromise);
  event.waitUntil(responsePromise.then(function () {}, function () {}));
});
