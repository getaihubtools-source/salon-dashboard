/* ==========================================================================
   service-worker.js — کش پوسته اپلیکیشن برای PWA (Phase 3)
   فقط فایل‌های استاتیک را کش می‌کند؛ به LocalStorage یا داده‌های مالی
   هیچ دسترسی و دخالتی ندارد — آن API کاملاً جداست و اینجا لمس نمی‌شود.
   ========================================================================== */

const CACHE_NAME = 'salon-dashboard-shell-v7';

const APP_SHELL = [
  './',
  'index.html', 'dashboard.html', 'customers.html', 'employees.html', 'employee-detail.html',
  'services.html', 'appointments.html', 'income.html', 'expenses.html',
  'reports.html', 'settings.html',
  'css/variables.css', 'css/layout.css', 'css/tables.css', 'css/components.css', 'css/charts.css',
  'js/license.js', 'js/applock.js', 'js/applock-settings.js',
  'js/utils.js', 'js/db.js', 'js/components.js', 'js/charts.js', 'js/datepicker.js',
  'js/customers.js', 'js/employees.js', 'js/employee-detail.js', 'js/services.js',
  'js/appointments.js', 'js/income.js', 'js/expenses.js', 'js/reports.js',
  'js/settings.js', 'js/dashboard.js',
  'manifest.json', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}) // اگر آفلاینه یا فایلی گم بود، نصب نباید کل SW را بشکند
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).catch(() => {})
  );
  self.clients.claim();
});

/**
 * استراتژی: Cache First برای پوسته‌ی اپ (سریع، آفلاین‌کار)
 * برای هر درخواست دیگر (مثلاً فونت/CDN)، اول شبکه، اگر نبود از کش
 * هیچ داده‌ی پویا (تراکنش، مشتری و ...) اینجا نیست — همه در LocalStorage
 * سمت کلاینت می‌مانند و این فایل اصلاً به آن‌ها دسترسی ندارد.
 */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return; // فقط GET — امن برای فایل‌های استاتیک

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          return response;
        }).catch(() => cached);
      })
    );
  } else {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
