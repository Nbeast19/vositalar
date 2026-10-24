// Service worker: faqat dastur qobig'ini oflayn ochadi. Kitob/sharh ma'lumoti IndexedDB'da
// (foydalanuvchi tanlab o'rnatgan paketlar) — bu yerda yashirin keshlanmaydi.
var VERSIYA = 'hadis-manba-qobiq-v6';
var QOBIQ = ['./', './index.html', './style.css', './manifest.webmanifest',
  './js/theme.js', './js/i18n.js', './js/registry.js', './js/arabic.js', './js/zip.js', './js/pkg.js', './js/lib.js', './js/notes.js', './js/app.js', './js/search-worker.js',
  './ikonkalar/ikonka-192.png', './ikonkalar/ikonka-512.png', './ikonkalar/apple-touch-icon.png',
  './fonts/NotoNaskhArabic-400.woff2', './fonts/NotoNaskhArabic-700.woff2',
  './fonts/Amiri-Arabic-400.woff2', './fonts/Amiri-Arabic-700.woff2', './fonts/Manrope-Latin-var.woff2', './fonts/Manrope-LatinExt-var.woff2'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSIYA).then(function (c) {
    return c.addAll(QOBIQ.map(function (f) { return new Request(f, { cache: 'reload' }); }));
  }));
});
self.addEventListener('message', function (e) { if (e.data === 'yangila') self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('hadis-manba-') === 0 && k !== VERSIYA; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  var p = url.pathname;
  if (p.indexOf('/paketlar/') >= 0 || p.indexOf('/paketlar-shartli/') >= 0) return; // paketlar keshlanmaydi
  if (p.slice(-'catalog.json'.length) === 'catalog.json') {
    // katalog: avval tarmoq, bo'lmasa oxirgi nusxa
    e.respondWith(fetch(e.request).then(function (r) {
      var copy = r.clone();
      caches.open(VERSIYA).then(function (c) { c.put(e.request, copy); });
      return r;
    }).catch(function () { return caches.match(e.request); }));
    return;
  }
  e.respondWith(caches.open(VERSIYA).then(function (c) {
    return c.match(e.request, { ignoreSearch: true }).then(function (hit) {
      return hit || fetch(e.request);
    });
  }));
});
