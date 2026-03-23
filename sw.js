const CACHE_NAME = 'tiktok-wallet-demo-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/utils.js',
  '/auth.js',
  '/admin.js',
  '/wallet.js',
  '/rewards.html',
  '/transfer.html',
  '/toolbox.html',
  '/admin.html',
  '/manifest.json',
  '/tiktokicon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((res) => res || caches.match('/index.html')))
  );
});
