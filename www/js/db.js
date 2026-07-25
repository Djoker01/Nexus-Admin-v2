class NexusDatabase {
    constructor() {
        this.dbName = 'NexusAdminDB';
        this.dbVersion = 2;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Error al abrir la base de datos:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
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
                    productStore.createIndex('code', 'code', { unique: true });
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

                // Tabla de Items de Venta
                if (!db.objectStoreNames.contains('saleItems')) {
                    const saleItemsStore = db.createObjectStore('saleItems', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    saleItemsStore.createIndex('saleId', 'saleId', { unique: false });
                    saleItemsStore.createIndex('productId', 'productId', { unique: false });
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
                    expensesStore.createIndex('isFixed', 'isFixed', { unique: false });
                }

                // Tabla de Configuración
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { 
                        keyPath: 'key'
                    });
                }
            };
        });
    }

    // Operaciones CRUD genéricas
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add({
                ...data,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
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
