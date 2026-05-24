// ================================================================
// SERVICE WORKER — Control QR Camiones
// Permite que la app funcione completamente sin internet
// ================================================================
const CACHE_NAME = 'qr-camiones-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
];

// Instalar: guardar archivos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activar: limpiar cachés viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first para assets, network-first para API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Supabase API: siempre intentar red primero
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({error:'offline'}),
          {status:503, headers:{'Content-Type':'application/json'}})
      )
    );
    return;
  }

  // Assets locales: cache first
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(response => {
        // Guardar en caché si es un asset estático
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
