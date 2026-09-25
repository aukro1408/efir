/* Эфир — service worker */
const VER = 'efir-v2';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png',
  'icons/icon-maskable-512.png', 'icons/icon-180.png',
  'https://cdn.jsdelivr.net/npm/hls.js@1'
];
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VER).then(c =>
      Promise.allSettled(SHELL.map(u => c.add(u).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks =>
      Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // плейлисты и EPG — всегда свежие из сети
  if (/\.(m3u8?|xml|xmltv)(\?|$)/i.test(url.pathname) || /token=|playlist/i.test(url.search)) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // картинки — сначала кэш, потом сеть
  if (/\.(png|jpe?g|gif|webp|svg|ico)(\?|$)/i.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then(hit => {
        const net = fetch(e.request).then(r => {
          if (r.ok) { const cp = r.clone(); caches.open(VER).then(c => c.put(e.request, cp)); }
          return r;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }
  // остальное — сеть, fallback на кэш
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok && url.origin === location.origin) {
        const cp = r.clone(); caches.open(VER).then(c => c.put(e.request, cp));
      }
      return r;
    }).catch(() => caches.match(e.request).then(hit => hit || caches.match('index.html')))
  );
});
