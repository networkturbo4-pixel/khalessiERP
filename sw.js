const CACHE_NAME = 'khalessi-v6';
const ASSETS = [
    './',
    './index.html',
    './css/index.css',
    './js/app.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
    'https://unpkg.com/@phosphor-icons/web'
];

self.addEventListener('install', event => {
    // Forzar al nuevo service worker a tomar el control inmediatamente
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', event => {
    // Limpiar cachés antiguas
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Ignorar POST o peticiones a la API
    if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;
    
    // Estrategia Network First para desarrollo
    event.respondWith(
        fetch(event.request).then(networkResponse => {
            return caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
            });
        }).catch(() => {
            return caches.match(event.request);
        })
    );
});
