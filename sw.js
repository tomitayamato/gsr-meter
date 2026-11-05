// 嘘発見器のオフライン対応。
// 電波があれば最新版を取りに行き、取れたら端末に保存する。
// 電波がない、または3秒たっても返事がないときは、保存してある版で開く。
const CACHE = 'uso-hakkenki-v1';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];
const TIMEOUT_MS = 3000;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  const fromCache = () => caches.match(req, { ignoreSearch: true })
    .then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));

  const fromNetwork = fetch(req).then(res => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(cache => cache.put(req, copy));
    }
    return res;
  });

  const timeout = new Promise(resolve => setTimeout(resolve, TIMEOUT_MS));

  event.respondWith(
    Promise.race([fromNetwork.catch(() => null), timeout])
      .then(res => res || fromCache())
      .then(res => res || fromNetwork)
  );
});
