import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
function harness({ offline = false, status = 200, cacheFails = false } = {}) {
  const listeners = {}, stores = new Map(), origin = 'https://talbak.test';
  const key = r => new URL(typeof r === 'string' ? r : r.url, origin).href;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const data = stores.get(name);
      return {
        async add(r) { if (offline) throw Error('offline'); data.set(key(r), new Response('shell')); },
        async put(r, response) { if (cacheFails) throw Error('quota'); data.set(key(r), response); },
        async match(r) { return data.get(key(r))?.clone(); },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
    async match(r) { for (const data of stores.values()) if (data.has(key(r))) return data.get(key(r)).clone(); },
  };
  vm.runInNewContext(source, {
    self: { location: { origin }, addEventListener: (name, fn) => { listeners[name] = fn; }, skipWaiting: async () => {}, clients: { claim: async () => {} } },
    caches, URL, Response,
    fetch: async () => { if (offline) throw Error('offline'); return new Response('network', { status }); },
  });
  return {
    stores, caches,
    async dispatch(name, request) {
      const work = []; let response;
      listeners[name]({ request, waitUntil: p => work.push(p), respondWith: p => { response = p; } });
      const result = await response; await Promise.all(work); return result;
    },
    request(path, options = {}) { return { url: new URL(path, origin).href, method: 'GET', mode: 'cors', headers: new Headers(), ...options }; },
  };
}

test('activation preserves caches owned by other applications', async () => {
  const h = harness(); await h.caches.open('unrelated-data'); await h.caches.open('talbak-shell-obsolete');
  await h.dispatch('activate');
  assert.equal(h.stores.has('unrelated-data'), true);
  assert.equal(h.stores.has('talbak-shell-obsolete'), false);
});
for (const path of ['/api/private', '/rest/v1/orders', '/auth/v1/user', 'https://example.org/api']) {
  test(`does not intercept private or external endpoint ${path}`, async () => {
    const h = harness(); assert.equal(await h.dispatch('fetch', h.request(path)), undefined);
    assert.equal(h.stores.size, 0);
  });
}
test('does not intercept writes or authorization-bearing requests', async () => {
  const h = harness();
  assert.equal(await h.dispatch('fetch', h.request('/assets/a.js', { method: 'POST' })), undefined);
  assert.equal(await h.dispatch('fetch', h.request('/assets/a.js', { headers: new Headers({ authorization: 'Bearer test' }) })), undefined);
});
test('offline missing asset never receives HTML shell', async () => {
  const h = harness({ offline: true });
  await (await h.caches.open('talbak-shell-v4')).put('/', new Response('<html>shell</html>'));
  const response = await h.dispatch('fetch', h.request('/assets/missing.js'));
  assert.equal(response.type, 'error');
});
test('offline navigation receives cached shell', async () => {
  const h = harness({ offline: true });
  await (await h.caches.open('talbak-shell-v4')).put('/', new Response('<html>shell</html>'));
  const response = await h.dispatch('fetch', h.request('/?login=1', { mode: 'navigate' }));
  assert.equal(await response.text(), '<html>shell</html>');
});
test('successful assets are cached before event completion', async () => {
  const h = harness(); const req = h.request('/assets/main.js');
  assert.equal((await h.dispatch('fetch', req)).status, 200);
  assert.equal(await (await h.caches.match(req)).text(), 'network');
});
test('HTTP failures are not cached', async () => {
  const h = harness({ status: 500 }); const req = h.request('/assets/main.js');
  assert.equal((await h.dispatch('fetch', req)).status, 500);
  assert.equal(await h.caches.match(req), undefined);
});
test('cache quota failure does not break a successful network response', async () => {
  const h = harness({ cacheFails: true });
  assert.equal((await h.dispatch('fetch', h.request('/assets/main.js'))).status, 200);
});
