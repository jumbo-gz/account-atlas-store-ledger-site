// 账号星图 offline shell. HTML: network first (3 s), then cache. Same-origin assets: cache first, refreshed in background.
const CACHE_PREFIX = `atlas-store-ledger:${self.registration.scope}:`;
const CACHE = `${CACHE_PREFIX}v3`;
const ROOT = new URL('./', self.location.href);
const INDEX = new URL('index.html', ROOT);
const match = (request, options) => caches.open(CACHE).then(cache => cache.match(request, options));
const SHELL = ['./', './index.html', './manifest.webmanifest', './local-icon-192.png', './local-icon-512.png', './styles.css?v=unified-stores-2', './app.js?v=unified-stores-2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(url => new Request(url, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const put = (req, res) => { if (res && res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return res; };
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== ROOT.origin || !u.pathname.startsWith(ROOT.pathname)) return;
  if (r.mode === 'navigate') {
    if (u.pathname !== ROOT.pathname && u.pathname !== INDEX.pathname) return;
    e.respondWith(new Promise(res => {
      let done = false;
      const fallback = () => match('./index.html').then(c => c || match('./')).then(c => { if (!done && c) { done = true; res(c); } });
      const t = setTimeout(fallback, 3000);
      fetch(r, { cache: 'no-cache' }).then(n => { clearTimeout(t); put('./index.html', n.clone()); if (!done) { done = true; res(n); } })
        .catch(() => { clearTimeout(t); fallback().then(() => { if (!done) res(Response.error()); }); });
    }));
    return;
  }
  e.respondWith(match(r).then(hit => {
    const net = fetch(r).then(n => put(r, n)).catch(() => hit || match(r, { ignoreSearch: true }));
    return hit || net;
  }));
});
