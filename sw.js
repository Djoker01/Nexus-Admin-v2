const CACHE_NAME = 'nexus-admin-v1.0.0';
const DYNAMIC_CACHE = 'nexus-admin-dynamic-v1';

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/db.js',
    '/js/utils.js',
    '/js/modules/dashboard.js',
    '/js/modules/inventory.js',
    '/js/modules/sales.js',
    '/js/modules/cash.js',
    '/js/modules/expenses.js',
    '/js/modules/reports.js',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cacheando assets principales');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('Assets cacheados exitosamente');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Error durante la instalación:', error);
            })
    );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
                            console.log('Eliminando cache antiguo:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker activado');
                return self.clients.claim();
            })
    );
});

// Estrategia de caché: Network First con fallback a caché
self.addEventListener('fetch', (event) => {
    // No interceptar solicitudes a IndexedDB
    if (event.request.url.includes('indexeddb')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clonar la respuesta para guardarla en caché
                const responseClone = response.clone();
                
                // Guardar en caché dinámico solo respuestas exitosas
                if (response.status === 200) {
                    caches.open(DYNAMIC_CACHE)
                        .then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                }
                
                return response;
            })
            .catch(async () => {
                // Si falla la red, buscar en caché
                const cachedResponse = await caches.match(event.request);
                
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Si es una página, devolver página offline
                if (event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('/index.html');
                }
                
                // Si no hay caché, devolver error
                return new Response('Sin conexión', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            })
    );
});

// Manejar mensajes
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data === 'CLEAR_CACHE') {
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    return caches.delete(cacheName);
                })
            );
        });
    }
});

// Sincronización en segundo plano (Background Sync)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-sales') {
        event.waitUntil(syncSales());
    }
    
    if (event.tag === 'sync-expenses') {
        event.waitUntil(syncExpenses());
    }
});

async function syncSales() {
    // Implementar sincronización de ventas pendientes
    console.log('Sincronizando ventas pendientes...');
    
    try {
        const db = await openDatabase();
        const pendingSales = await getPendingSales(db);
        
        for (const sale of pendingSales) {
            // Intentar sincronizar cada venta
            await syncSale(sale);
            await markAsSync(db, sale.id);
        }
        
        console.log('Ventas sincronizadas exitosamente');
    } catch (error) {
        console.error('Error sincronizando ventas:', error);
    }
}

async function syncExpenses() {
    // Implementar sincronización de gastos pendientes
    console.log('Sincronizando gastos pendientes...');
}

// Notificaciones Push
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'Nueva notificación de Nexus Admin',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        tag: 'nexus-notification',
        renotify: true,
        actions: [
            {
                action: 'open',
                title: 'Abrir App'
            },
            {
                action: 'close',
                title: 'Cerrar'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Nexus Admin', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Funciones auxiliares para IndexedDB en el Service Worker
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('NexusAdminDB', 2);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function getPendingSales(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['sales'], 'readonly');
        const store = transaction.objectStore('sales');
        const index = store.index('status');
        const request = index.getAll('pending');
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function syncSale(sale) {
    // Simular sincronización con servidor
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('Venta sincronizada:', sale.id);
            resolve();
        }, 1000);
    });
}

async function markAsSync(db, saleId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['sales'], 'readwrite');
        const store = transaction.objectStore('sales');
        const request = store.get(saleId);
        
        request.onsuccess = () => {
            const sale = request.result;
            sale.status = 'synced';
            sale.syncedAt = new Date().toISOString();
            store.put(sale);
            resolve();
        };
        
        request.onerror = () => reject(request.error);
    });
}