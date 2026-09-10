const CACHE_NAME = 'khalessi-v10';
const ASSETS = [
    './',
    './index.html',
    './css/index.css',
    './js/app.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
    'https://unpkg.com/@phosphor-icons/web'
];

// Detección segura de soporte de Cache API (evita ReferenceError en Safari Modo Hermético / Lockdown Mode)
function hasCaches() {
    try {
        return typeof caches !== 'undefined' && caches !== null;
    } catch (e) {
        return false;
    }
}

self.addEventListener('install', event => {
    self.skipWaiting();
    
    if (hasCaches()) {
        event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
                return cache.addAll(ASSETS);
            }).catch(err => {
                console.warn('SW cache addAll omitido o fallido:', err);
            })
        );
    }
});

self.addEventListener('activate', event => {
    event.waitUntil(
        (async () => {
            if (hasCaches()) {
                try {
                    const keys = await caches.keys();
                    await Promise.all(
                        keys.map(key => {
                            if (key !== CACHE_NAME) {
                                return caches.delete(key);
                            }
                        })
                    );
                } catch (err) {
                    console.warn('SW cache cleanup omitido o fallido:', err);
                }
            }
            await self.clients.claim();
        })()
    );
});

self.addEventListener('fetch', event => {
    // Ignorar peticiones que no sean GET o que sean llamadas a la API
    if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;
    
    // Si la Cache Storage API no está disponible (ej. Safari en Modo Hermético),
    // NO llamamos a event.respondWith. De este modo el navegador realiza la petición por red de forma nativa sin errores.
    if (!hasCaches()) return;

    // Estrategia Network First protegida
    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                if (hasCaches() && networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    }).catch(() => {});
                }
                return networkResponse;
            })
            .catch(async (fetchError) => {
                if (hasCaches()) {
                    try {
                        const cached = await caches.match(event.request);
                        if (cached) return cached;
                    } catch (cacheErr) {
                        console.warn('SW cache match omitido:', cacheErr);
                    }
                }
                throw fetchError;
            })
    );
});
