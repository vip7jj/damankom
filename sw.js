// ============================================================
// ضمانكم — Service Worker (relative paths, offline-capable)
// ملاحظة: الإشعارات المجدولة (قبل انتهاء الضمان) تحتاج خادماً
// مع Web Push في المرحلة ٤. معالج push أدناه جاهز لها.
// ============================================================
const CACHE = 'damankom-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleapis.com')) return;
  e.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
        }
        return res;
      }).catch(() => (request.destination === 'document' ? caches.match('./index.html') : undefined));
    })
  );
});

// إشعارات Push (جاهزة للمرحلة ٤)
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) {}
  e.waitUntil(self.registration.showNotification(data.title || 'ضمانكم', {
    body: data.body || 'لديك إشعار من ضمانكم',
    icon: './icons/icon-192.png', badge: './icons/icon-72.png',
    vibrate: [200, 100, 200], dir: 'rtl', lang: 'ar',
    data: { url: data.url || './' }
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(clients.matchAll({ type: 'window' }).then((wins) => {
    const w = wins.find((x) => 'focus' in x);
    if (w) return w.focus();
    if (clients.openWindow) return clients.openWindow(url);
  }));
});
