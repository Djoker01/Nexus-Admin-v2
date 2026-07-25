class NexusDatabase {
    constructor() {
        this.dbName = 'NexusAdminDB';
        this.dbVersion = 6;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            // IMPORTANTE: Usar window.indexedDB o indexedDB global
            const idb = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || indexedDB;
            
            if (!idb) {
                console.error('IndexedDB no disponible');
                reject(new Error('IndexedDB no disponible'));
                return;
            }

            const request = idb.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('Error al abrir la base de datos:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                
                // IMPORTANTE: Manejar el evento de cierre inesperado
                this.db.onclose = () => {
                    console.warn('Base de datos cerrada inesperadamente');
                };
                
                // IMPORTANTE: Manejar errores de versión
                this.db.onversionchange = () => {
                    this.db.close();
                    console.warn('La base de datos necesita actualizarse');
                };
                
                console.log('Base de datos inicializada correctamente');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('Actualizando estructura de base de datos...');

                // Tabla de Productos
                if (!db.objectStoreNames.contains('products')) {
                    const productStore = db.createObjectStore('products', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    productStore.createIndex('code', 'code', { unique: false });
                    productStore.createIndex('name', 'name', { unique: false });
                    productStore.createIndex('category', 'category', { unique: false });
                    productStore.createIndex('stock', 'stock', { unique: false });
                    productStore.createIndex('status', 'status', { unique: false });
                }

                // Tabla de Categorías
                if (!db.objectStoreNames.contains('categories')) {
                    const categoryStore = db.createObjectStore('categories', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    categoryStore.createIndex('name', 'name', { unique: true });
                }

                // Tabla de Ventas
                if (!db.objectStoreNames.contains('sales')) {
                    const salesStore = db.createObjectStore('sales', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    salesStore.createIndex('date', 'date', { unique: false });
                    salesStore.createIndex('customer', 'customer', { unique: false });
                    salesStore.createIndex('paymentMethod', 'paymentMethod', { unique: false });
                }

                // Tabla de Movimientos de Caja
                if (!db.objectStoreNames.contains('cashMovements')) {
                    const cashStore = db.createObjectStore('cashMovements', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    cashStore.createIndex('date', 'date', { unique: false });
                    cashStore.createIndex('type', 'type', { unique: false });
                }

                // Tabla de Gastos
                if (!db.objectStoreNames.contains('expenses')) {
                    const expensesStore = db.createObjectStore('expenses', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    expensesStore.createIndex('date', 'date', { unique: false });
                    expensesStore.createIndex('category', 'category', { unique: false });
                }

                // Tabla de Clientes
                if (!db.objectStoreNames.contains('clients')) {
                    const clientStore = db.createObjectStore('clients', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    clientStore.createIndex('name', 'name', { unique: false });
                    clientStore.createIndex('status', 'status', { unique: false });
                }

                // Tabla de Cuentas por Cobrar
                if (!db.objectStoreNames.contains('accountsReceivable')) {
                    const arStore = db.createObjectStore('accountsReceivable', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    arStore.createIndex('clientId', 'clientId', { unique: false });
                    arStore.createIndex('date', 'date', { unique: false });
                    arStore.createIndex('status', 'status', { unique: false });
                }

                // Tabla de Pagos
                if (!db.objectStoreNames.contains('payments')) {
                    const paymentStore = db.createObjectStore('payments', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    paymentStore.createIndex('accountId', 'accountId', { unique: false });
                }

                // Tabla de Mermas
                if (!db.objectStoreNames.contains('shrinkage')) {
                    const shrinkageStore = db.createObjectStore('shrinkage', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    shrinkageStore.createIndex('date', 'date', { unique: false });
                    shrinkageStore.createIndex('type', 'type', { unique: false });
                }

                // Tabla de Reabastecimiento
                if (!db.objectStoreNames.contains('restock')) {
                    const restockStore = db.createObjectStore('restock', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    restockStore.createIndex('date', 'date', { unique: false });
                }

                // Tabla de Proveedores
                if (!db.objectStoreNames.contains('suppliers')) {
                    const supplierStore = db.createObjectStore('suppliers', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    supplierStore.createIndex('name', 'name', { unique: false });
                }

                // Tabla de Cotizaciones
                if (!db.objectStoreNames.contains('supplierQuotes')) {
                    const quotesStore = db.createObjectStore('supplierQuotes', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    quotesStore.createIndex('date', 'date', { unique: false });
                }

                // Tabla de Comparaciones
                if (!db.objectStoreNames.contains('purchaseComparisons')) {
                    const comparisonStore = db.createObjectStore('purchaseComparisons', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    comparisonStore.createIndex('date', 'date', { unique: false });
                }

                // Tabla de Notificaciones
                if (!db.objectStoreNames.contains('notifications')) {
                    const notifStore = db.createObjectStore('notifications', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    notifStore.createIndex('read', 'read', { unique: false });
                }

                // Tabla de Configuración
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
                
                console.log('✅ Estructura de base de datos actualizada');
            };
        });
    }

    // CORREGIR: Operación add con mejor manejo de errores
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de datos no inicializada'));
                return;
            }

            try {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                // Asegurar que los datos tengan createdAt
                if (!data.createdAt) {
                    data.createdAt = new Date().toISOString();
                }
                if (!data.updatedAt) {
                    data.updatedAt = new Date().toISOString();
                }

                const request = store.add(data);

                request.onsuccess = (event) => {
                    console.log(`✅ Registro agregado en ${storeName}:`, event.target.result);
                    resolve(event.target.result);
                };

                request.onerror = (event) => {
                    console.error(`❌ Error al agregar en ${storeName}:`, event.target.error);
                    // Intentar con transaction.oncomplete como fallback
                    transaction.oncomplete = () => {
                        resolve(request.result);
                    };
                    reject(event.target.error);
                };

                // IMPORTANTE: Manejar que la transacción se complete
                transaction.oncomplete = () => {
                    console.log(`Transacción completada en ${storeName}`);
                };

                transaction.onerror = (event) => {
                    console.error(`Error en transacción de ${storeName}:`, event.target.error);
                };

                transaction.onabort = (event) => {
                    console.error(`Transacción abortada en ${storeName}:`, event.target.error);
                };

            } catch (error) {
                console.error(`Error creando transacción en ${storeName}:`, error);
                reject(error);
            }
        });
    }

    // CORREGIR: Operación getAll
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve([]);
                return;
            }

            try {
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();

                request.onsuccess = () => {
                    resolve(request.result || []);
                };

                request.onerror = (event) => {
                    console.error(`Error leyendo ${storeName}:`, event.target.error);
                    resolve([]);
                };
            } catch (error) {
                console.error(`Error en getAll ${storeName}:`, error);
                resolve([]);
            }
        });
    }

    // CORREGIR: Operación update
    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de datos no inicializada'));
                return;
            }

            try {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                data.updatedAt = new Date().toISOString();
                const request = store.put(data);

                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    // CORREGIR: Operación delete
    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Base de datos no inicializada'));
                return;
            }

            try {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(id);

                request.onsuccess = () => resolve();
                request.onerror = (event) => reject(event.target.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    // ... resto de métodos igual ...
}

// Crear instancia global con verificación
if (typeof window !== 'undefined') {
    window.db = new NexusDatabase();
}            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getById(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put({
                ...data,
                updatedAt: new Date().toISOString()
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getByDateRange(storeName, indexName, startDate, endDate) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const range = IDBKeyRange.bound(startDate, endDate);
            const request = index.getAll(range);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getCount(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// Instancia global
var db = new NexusDatabase();
