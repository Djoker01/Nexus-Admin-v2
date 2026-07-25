// Variables globales

let dashboardManager;
let inventoryManager;
let salesManager;
let cashManager;
let expensesManager;
let reportsManager;
let deferredPrompt;

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Inicializar base de datos
        if (!window.db) {
            window.db = new NexusDatabase();
        }
        await window.db.init();
        
        // Inicializar gestores en orden
        inventoryManager = new InventoryManager();
        await inventoryManager.init();
        
        salesManager = new SalesManager(inventoryManager);
        await salesManager.init();
        
        cashManager = new CashManager();
        await cashManager.init();
        
        expensesManager = new ExpensesManager();
        await expensesManager.init();
        
        // Inicializar dashboard y reportes después de los demás módulos
        dashboardManager = new DashboardManager();
        await dashboardManager.init();
        
        reportsManager = new ReportsManager(
            inventoryManager, 
            salesManager, 
            cashManager, 
            expensesManager
        );
        
        // Configurar la UI
        setupUI();
        
        // Registrar Service Worker
        await registerServiceWorker();
        
        // Mostrar mensaje de bienvenida
        Utils.showToast('Nexus Admin inicializado correctamente', 'success');
        
        console.log('✅ Nexus Admin v1.0 inicializado correctamente');
    } catch (error) {
        console.error('Error inicializando la aplicación:', error);
        Utils.showToast('Error al inicializar la aplicación', 'error');
    }
});

// Configuración de la UI
function setupUI() {
    // Actualizar fecha actual
    updateCurrentDate();
    setInterval(updateCurrentDate, 60000);
    
    // Configurar navegación - ESTA ES LA PARTE CORREGIDA
    setupNavigation();
    
    // Manejar instalación PWA
    setupPWA();
    
    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // Cerrar modales con Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                if (modal.style.display === 'block') {
                    modal.style.display = 'none';
                }
            });
        }
    });
    
    // Atajos de teclado
    setupKeyboardShortcuts();
}

// Actualizar fecha en el header
function updateCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('es-MX', options);
    }
}

// Navegación entre secciones - CORREGIDO
function setupNavigation() {
    // Obtener todos los elementos de navegación
    const navItems = document.querySelectorAll('.nav-item');
    
    console.log('Configurando navegación. Items encontrados:', navItems.length);
    
    // Agregar event listener a cada item
    navItems.forEach((item, index) => {
        // Remover listeners anteriores si existen
        item.removeEventListener('click', handleNavClick);
        
        // Agregar nuevo listener
        item.addEventListener('click', handleNavClick);
        
        console.log(`Navegación ${index + 1} configurada:`, item.dataset.section);
    });
}

// Manejador de clic en navegación
function handleNavClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const section = this.dataset.section;
    console.log('Click en navegación:', section);
    
    if (section) {
        showSection(section);
    }
}

function showSection(sectionName) {
    console.log('Cambiando a sección:', sectionName);
    
    // Ocultar todas las secciones
    const allSections = document.querySelectorAll('.section');
    allSections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Desactivar todos los items de navegación
    const allNavItems = document.querySelectorAll('.nav-item');
    allNavItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Mostrar sección seleccionada
    const sectionElement = document.getElementById(`${sectionName}-section`);
    if (sectionElement) {
        sectionElement.classList.add('active');
        console.log('Sección activada:', sectionName);
        
        // Activar item de navegación correspondiente
        const navItem = document.querySelector(`[data-section="${sectionName}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
        
        // Actualizar contenido según la sección
        updateSectionContent(sectionName);
    } else {
        console.error('Sección no encontrada:', `${sectionName}-section`);
    }
    
    // Cerrar sidebar en móvil
    if (window.innerWidth <= 1024) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('open');
        }
    }
}

function updateSectionContent(sectionName) {
    console.log('Actualizando contenido de:', sectionName);
    
    try {
        switch(sectionName) {
            case 'dashboard':
                if (dashboardManager && typeof dashboardManager.refresh === 'function') {
                    dashboardManager.refresh();
                }
                break;
            case 'inventory':
                if (inventoryManager && typeof inventoryManager.renderProducts === 'function') {
                    inventoryManager.renderProducts();
                }
                break;
            case 'sales':
                if (salesManager) {
                    if (typeof salesManager.renderSalesStats === 'function') {
                        salesManager.renderSalesStats();
                    }
                    if (typeof salesManager.renderSalesHistory === 'function') {
                        salesManager.renderSalesHistory();
                    }
                }
                break;
            case 'cash':
                if (cashManager) {
                    if (typeof cashManager.renderCashSummary === 'function') {
                        cashManager.renderCashSummary();
                    }
                    if (typeof cashManager.renderMovements === 'function') {
                        cashManager.renderMovements();
                    }
                }
                break;
            case 'expenses':
                if (expensesManager) {
                    if (typeof expensesManager.renderExpensesSummary === 'function') {
                        expensesManager.renderExpensesSummary();
                    }
                    if (typeof expensesManager.renderExpenses === 'function') {
                        expensesManager.renderExpenses();
                    }
                }
                break;
            case 'reports':
                if (reportsManager) {
                    if (typeof reportsManager.generateSalesReport === 'function') {
                        reportsManager.generateSalesReport();
                    }
                    if (typeof reportsManager.loadTopProductsReport === 'function') {
                        reportsManager.loadTopProductsReport();
                    }
                    if (typeof reportsManager.loadFinancialSummary === 'function') {
                        reportsManager.loadFinancialSummary();
                    }
                    if (typeof reportsManager.loadGeneralBalance === 'function') {
                        reportsManager.loadGeneralBalance();
                    }
                }
                break;
        }
    } catch (error) {
        console.error(`Error actualizando sección ${sectionName}:`, error);
    }
}

// Toggle del sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

// Configurar PWA
function setupPWA() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log('PWA lista para instalar');
    });
    
    window.addEventListener('appinstalled', () => {
        console.log('PWA instalada exitosamente');
        deferredPrompt = null;
        Utils.showToast('¡App instalada exitosamente!', 'success');
    });
}

// Registrar Service Worker
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registrado:', registration);
        } catch (error) {
            console.error('Error registrando Service Worker:', error);
        }
    }
}

// Atajos de teclado
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl + número para cambiar de sección
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case '1':
                    e.preventDefault();
                    showSection('dashboard');
                    break;
                case '2':
                    e.preventDefault();
                    showSection('inventory');
                    break;
                case '3':
                    e.preventDefault();
                    showSection('sales');
                    break;
                case '4':
                    e.preventDefault();
                    showSection('cash');
                    break;
                case '5':
                    e.preventDefault();
                    showSection('expenses');
                    break;
                case '6':
                    e.preventDefault();
                    showSection('reports');
                    break;
            }
        }
    });
}

// Funciones globales para los modales
function openProductModal() {
    if (inventoryManager) {
        inventoryManager.openProductModal();
    }
}

function closeProductModal() {
    if (inventoryManager) {
        inventoryManager.closeProductModal();
    }
}

function openSaleModal() {
    if (salesManager) {
        salesManager.openSaleModal();
    }
}

function closeSaleModal() {
    if (salesManager) {
        salesManager.closeSaleModal();
    }
}

function openCashModal() {
    if (cashManager) {
        cashManager.openCashModal();
    }
}

function closeCashModal() {
    if (cashManager) {
        cashManager.closeCashModal();
    }
}

function openExpenseModal() {
    if (expensesManager) {
        expensesManager.openExpenseModal();
    }
}

function closeExpenseModal() {
    if (expensesManager) {
        expensesManager.closeExpenseModal();
    }
}

// Función para refrescar todos los datos
function refreshData() {
    try {
        if (dashboardManager) dashboardManager.refresh();
        if (inventoryManager) inventoryManager.renderProducts();
        if (salesManager) {
            salesManager.renderSalesStats();
            salesManager.renderSalesHistory();
        }
        if (cashManager) {
            cashManager.renderCashSummary();
            cashManager.renderMovements();
        }
        if (expensesManager) {
            expensesManager.renderExpensesSummary();
            expensesManager.renderExpenses();
        }
        Utils.showToast('Datos actualizados', 'success');
    } catch (error) {
        console.error('Error al refrescar datos:', error);
    }
}

// Manejar errores globales
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Error global:', { msg, url, lineNo, columnNo, error });
    return false;
};

// Exponer showSection globalmente
window.showSection = showSection;

// Exportar para uso en consola
window.NexusAdmin = {
    db,
    dashboardManager,
    inventoryManager,
    salesManager,
    cashManager,
    expensesManager,
    reportsManager,
    refreshData,
    showSection,
    Utils
};

console.log('✅ App.js cargado correctamente');
