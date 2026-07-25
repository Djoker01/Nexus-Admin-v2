// Proxy para IndexedDB en Android WebView
(function() {
    'use strict';
    
    // Verificar que IndexedDB funcione
    const testDB = indexedDB.open('__test__', 1);
    testDB.onsuccess = function() {
        console.log('✅ IndexedDB funciona correctamente');
        testDB.result.close();
        indexedDB.deleteDatabase('__test__');
    };
    testDB.onerror = function(e) {
        console.error('❌ IndexedDB error:', e.target.error);
    };
    
    // Parche para transacciones en Android
    const originalOpen = indexedDB.open;
    indexedDB.open = function(name, version) {
        console.log('Abriendo base de datos:', name, 'v', version);
        return originalOpen.call(this, name, version);
    };
    
    console.log('✅ Android Proxy cargado');
})();
